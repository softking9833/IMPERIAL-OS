import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const learnRouter = Router();
learnRouter.use(requireAuth);

function parseQuiz(quizJson: string | null) {
  if (!quizJson) return null;
  try {
    return JSON.parse(quizJson) as {
      passScore?: number;
      questions: Array<{
        id: string;
        prompt: string;
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
      }>;
    };
  } catch {
    return null;
  }
}

learnRouter.get("/lessons", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      curriculum: { select: { id: true, name: true, kind: true } },
      progress: { where: { userId: req.user.id } },
    },
  });

  return res.json({
    lessons: lessons.map((lesson) => {
      const quiz = parseQuiz(lesson.quizJson);
      return {
        id: lesson.id,
        title: lesson.title,
        contentType: lesson.contentType,
        summary: lesson.summary,
        body: lesson.body,
        videoUrl: lesson.videoUrl,
        sortOrder: lesson.sortOrder,
        curriculum: lesson.curriculum,
        quiz: quiz
          ? {
              passScore: quiz.passScore ?? 70,
              questions: (quiz.questions ?? []).map((q) => ({
                id: q.id,
                prompt: q.prompt,
                options: q.options ?? [],
              })),
            }
          : null,
        progress: lesson.progress[0]
          ? {
              status: lesson.progress[0].status,
              quizScore: lesson.progress[0].quizScore,
              quizPassed: lesson.progress[0].quizPassed,
              completedAt: lesson.progress[0].completedAt,
            }
          : { status: "NOT_STARTED", quizScore: null, quizPassed: null, completedAt: null },
      };
    }),
  });
});

learnRouter.post("/lessons/:lessonId/complete", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
  if (!lesson || !lesson.isPublished) {
    return res.status(404).json({ error: "Lesson not found" });
  }
  if (lesson.contentType === "QUIZ") {
    return res.status(400).json({ error: "Quiz lessons must be submitted via /quiz" });
  }

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId: req.user.id, lessonId: lesson.id },
    },
    create: {
      userId: req.user.id,
      lessonId: lesson.id,
      status: "COMPLETED",
      completedAt: new Date(),
    },
    update: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await syncRequirementFromLesson(req.user.id, lesson.id);

  await writeAudit({
    actorId: req.user.id,
    action: "LESSON_COMPLETE",
    entityType: "Lesson",
    entityId: lesson.id,
  });

  return res.json({ progress });
});

learnRouter.post("/lessons/:lessonId/quiz", async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });

  const parsed = z
    .object({
      answers: z.array(
        z.object({
          questionId: z.string(),
          optionId: z.string(),
        }),
      ),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid quiz payload" });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
  if (!lesson || !lesson.isPublished) {
    return res.status(404).json({ error: "Lesson not found" });
  }

  const quiz = parseQuiz(lesson.quizJson);
  if (!quiz?.questions?.length) {
    return res.status(400).json({ error: "Lesson has no quiz" });
  }

  let correct = 0;
  for (const question of quiz.questions) {
    const answer = parsed.data.answers.find((a) => a.questionId === question.id);
    if (answer?.optionId === question.correctOptionId) correct += 1;
  }

  const score = Math.round((correct / quiz.questions.length) * 100);
  const passScore = quiz.passScore ?? 70;
  const passed = score >= passScore;

  const progress = await prisma.lessonProgress.upsert({
    where: {
      userId_lessonId: { userId: req.user.id, lessonId: lesson.id },
    },
    create: {
      userId: req.user.id,
      lessonId: lesson.id,
      status: passed ? "COMPLETED" : "IN_PROGRESS",
      quizScore: score,
      quizPassed: passed,
      completedAt: passed ? new Date() : null,
    },
    update: {
      status: passed ? "COMPLETED" : "IN_PROGRESS",
      quizScore: score,
      quizPassed: passed,
      completedAt: passed ? new Date() : null,
    },
  });

  if (passed) {
    await syncRequirementFromLesson(req.user.id, lesson.id);
  }

  await writeAudit({
    actorId: req.user.id,
    action: "LESSON_QUIZ_SUBMIT",
    entityType: "Lesson",
    entityId: lesson.id,
    meta: { score, passed },
  });

  return res.json({
    score,
    passed,
    passScore,
    progress,
  });
});

learnRouter.post("/", requireRoles("MANAGING_DIRECTOR"), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(1),
      contentType: z.enum(["LESSON", "VIDEO", "QUIZ"]).default("LESSON"),
      summary: z.string().optional(),
      body: z.string().optional(),
      videoUrl: z.string().url().optional().or(z.literal("")).optional(),
      curriculumId: z.string().optional(),
      sortOrder: z.number().int().optional(),
      quiz: z
        .object({
          passScore: z.number().int().min(1).max(100).default(70),
          questions: z.array(
            z.object({
              id: z.string(),
              prompt: z.string(),
              options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
              correctOptionId: z.string(),
            }),
          ),
        })
        .optional(),
    })
    .safeParse(req.body);

  if (!parsed.success || !req.user) {
    return res.status(400).json({ error: "Invalid lesson payload" });
  }

  const org = await prisma.organisation.findFirstOrThrow();
  const lesson = await prisma.lesson.create({
    data: {
      organisationId: org.id,
      curriculumId: parsed.data.curriculumId,
      title: parsed.data.title,
      contentType: parsed.data.contentType,
      summary: parsed.data.summary,
      body: parsed.data.body,
      videoUrl: parsed.data.videoUrl || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      quizJson: parsed.data.quiz ? JSON.stringify(parsed.data.quiz) : null,
    },
  });

  await writeAudit({
    actorId: req.user.id,
    action: "LESSON_CREATE",
    entityType: "Lesson",
    entityId: lesson.id,
  });

  return res.status(201).json({ lesson });
});

async function syncRequirementFromLesson(userId: string, lessonId: string) {
  const requirements = await prisma.fieldReadinessRequirement.findMany({
    where: { lessonId },
  });
  for (const requirement of requirements) {
    await prisma.requirementProgress.updateMany({
      where: { userId, requirementId: requirement.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  // Reuse readiness advancement by checking mandatory completion
  const progress = await prisma.requirementProgress.findMany({
    where: { userId },
    include: { requirement: true },
  });
  const mandatory = progress.filter((p) => p.requirement.isMandatory);
  if (
    mandatory.length > 0 &&
    mandatory.every((p) => p.status === "COMPLETED" || p.status === "APPROVED")
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.isFieldReady && user.lifecycleState !== "AWAITING_MANAGER_REVIEW") {
      await prisma.user.update({
        where: { id: userId },
        data: { lifecycleState: "AWAITING_MANAGER_REVIEW" },
      });
      const existing = await prisma.approval.findFirst({
        where: {
          subjectUserId: userId,
          type: "FIELD_READINESS",
          decision: "PENDING",
        },
      });
      if (!existing) {
        await prisma.approval.create({
          data: {
            type: "FIELD_READINESS",
            subjectUserId: userId,
            decision: "PENDING",
          },
        });
      }
    }
  }
}
