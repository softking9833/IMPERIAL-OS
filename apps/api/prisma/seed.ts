import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.roleplaySubmission.deleteMany();
  await prisma.roleplayRequirement.deleteMany();
  await prisma.requirementProgress.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.fieldReadinessRequirement.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.curriculum.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.endOfDayReport.deleteMany();
  await prisma.callback.deleteMany();
  await prisma.fieldActivity.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.funnelStage.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.associateDayRate.deleteMany();
  await prisma.businessRule.deleteMany();
  await prisma.sessionContext.deleteMany();
  await prisma.userScope.deleteMany();
  await prisma.userPerspective.deleteMany();
  await prisma.scope.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organisation.deleteMany();

  const org = await prisma.organisation.create({
    data: { name: "IMPERIAL" },
  });

  const orgScope = await prisma.scope.create({
    data: {
      organisationId: org.id,
      type: "ORGANISATION",
      name: "Entire IMPERIAL Organisation",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const md = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: "md@imperial",
      passwordHash,
      firstName: "Teon",
      lastName: "West",
      role: "MANAGING_DIRECTOR",
      identityState: "ACTIVE",
      lifecycleState: "ACTIVE",
      isFieldReady: true,
      perspectives: {
        create: [{ perspective: "MANAGING_DIRECTOR", isDefault: true }],
      },
      scopes: {
        create: [{ scopeId: orgScope.id, isDefault: true }],
      },
      sessions: {
        create: {
          activePerspective: "MANAGING_DIRECTOR",
          activeScopeId: orgScope.id,
        },
      },
    },
  });

  const junior = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: "associate@imperial",
      passwordHash,
      firstName: "Alex",
      lastName: "Junior",
      role: "JUNIOR_ASSOCIATE",
      identityState: "FIELD_READINESS",
      lifecycleState: "LEARNING",
      isFieldReady: false,
      perspectives: {
        create: [{ perspective: "JUNIOR_ASSOCIATE", isDefault: true }],
      },
      scopes: {
        create: [{ scopeId: orgScope.id, isDefault: true }],
      },
      sessions: {
        create: {
          activePerspective: "JUNIOR_ASSOCIATE",
          activeScopeId: orgScope.id,
        },
      },
      dayRates: {
        create: {
          organisationId: org.id,
          dayRatePence: 8500,
          effectiveFrom: new Date("2026-01-01"),
        },
      },
    },
  });

  // V1 Associate — same execution permissions as Junior; separate identity for role testing.
  const associate = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: "assoc@imperial",
      passwordHash,
      firstName: "Sam",
      lastName: "Associate",
      role: "ASSOCIATE",
      identityState: "FIELD_READINESS",
      lifecycleState: "LEARNING",
      isFieldReady: false,
      perspectives: {
        create: [{ perspective: "ASSOCIATE", isDefault: true }],
      },
      scopes: {
        create: [{ scopeId: orgScope.id, isDefault: true }],
      },
      sessions: {
        create: {
          activePerspective: "ASSOCIATE",
          activeScopeId: orgScope.id,
        },
      },
      dayRates: {
        create: {
          organisationId: org.id,
          dayRatePence: 10000,
          effectiveFrom: new Date("2026-01-01"),
        },
      },
    },
  });

  const curriculum = await prisma.curriculum.create({
    data: {
      organisationId: org.id,
      name: "Field Readiness — Core",
      kind: "FIELD_READINESS",
      description: "Configurable V1 Field Readiness curriculum (Business Empowerment).",
    },
  });

  const induction = await prisma.lesson.create({
    data: {
      organisationId: org.id,
      curriculumId: curriculum.id,
      title: "IMPERIAL Induction",
      contentType: "LESSON",
      summary: "Company standards, culture and expectations.",
      body:
        "Welcome to IMPERIAL.\n\nOur standard is simple: every day, become better than yesterday.\n\nIn the field you represent both IMPERIAL and the client. Be professional, honest, and disciplined.\n\nKey expectations:\n1. Know your campaign offer.\n2. Protect customer trust.\n3. Record activity accurately.\n4. Complete daily learning and roleplay.",
      sortOrder: 1,
    },
  });

  const doorApproach = await prisma.lesson.create({
    data: {
      organisationId: org.id,
      curriculumId: curriculum.id,
      title: "Door Approach Fundamentals",
      contentType: "VIDEO",
      summary: "Core field methodology lesson.",
      body:
        "Watch the approach framework, then practise:\n- Smile and open clearly\n- State who you are and why you are there\n- Ask one qualifying question\n- Handle the first objection calmly\n\n(Video URL is a placeholder for Milestone 2.)",
      videoUrl: "https://example.com/imperial-door-approach",
      sortOrder: 2,
    },
  });

  const knowledgeCheck = await prisma.lesson.create({
    data: {
      organisationId: org.id,
      curriculumId: curriculum.id,
      title: "Knowledge Check",
      contentType: "QUIZ",
      summary: "Short assessment on induction content.",
      body: "Answer all questions. Pass mark is 70%.",
      sortOrder: 3,
      quizJson: JSON.stringify({
        passScore: 70,
        questions: [
          {
            id: "q1",
            prompt: "What is IMPERIAL's daily standard?",
            options: [
              { id: "a", text: "Hit any number of doors" },
              { id: "b", text: "Become better than yesterday" },
              { id: "c", text: "Only chase sales" },
            ],
            correctOptionId: "b",
          },
          {
            id: "q2",
            prompt: "Why must field activity be recorded accurately?",
            options: [
              { id: "a", text: "So Performance and profitability can be calculated" },
              { id: "b", text: "Only for paperwork" },
              { id: "c", text: "It is optional" },
            ],
            correctOptionId: "a",
          },
          {
            id: "q3",
            prompt: "Who does an Associate represent in the field?",
            options: [
              { id: "a", text: "Only themselves" },
              { id: "b", text: "IMPERIAL and the client" },
              { id: "c", text: "Only the campaign brand" },
            ],
            correctOptionId: "b",
          },
        ],
      }),
    },
  });

  const roleplayLesson = await prisma.lesson.create({
    data: {
      organisationId: org.id,
      curriculumId: curriculum.id,
      title: "Opening Roleplay Brief",
      contentType: "LESSON",
      summary: "Prepare your opening conversation roleplay.",
      body:
        "Record or practise an opening that covers:\n1. Greeting\n2. Who you are\n3. Why you are there\n4. One qualifying question\n\nIn Milestone 2 this still completes as a learning item; richer roleplay review comes later.",
      sortOrder: 4,
    },
  });

  const requirements = await Promise.all([
    prisma.fieldReadinessRequirement.create({
      data: {
        curriculumId: curriculum.id,
        lessonId: induction.id,
        title: induction.title,
        description: induction.summary,
        requirementType: "LESSON",
        sortOrder: 1,
      },
    }),
    prisma.fieldReadinessRequirement.create({
      data: {
        curriculumId: curriculum.id,
        lessonId: doorApproach.id,
        title: doorApproach.title,
        description: doorApproach.summary,
        requirementType: "VIDEO",
        sortOrder: 2,
      },
    }),
    prisma.fieldReadinessRequirement.create({
      data: {
        curriculumId: curriculum.id,
        lessonId: knowledgeCheck.id,
        title: knowledgeCheck.title,
        description: knowledgeCheck.summary,
        requirementType: "QUIZ",
        sortOrder: 3,
      },
    }),
    prisma.fieldReadinessRequirement.create({
      data: {
        curriculumId: curriculum.id,
        lessonId: roleplayLesson.id,
        title: "Opening Roleplay",
        description: "Submit opening conversation roleplay for review.",
        requirementType: "ROLEPLAY",
        sortOrder: 4,
      },
    }),
  ]);

  await prisma.requirementProgress.createMany({
    data: [
      ...requirements.map((r) => ({
        userId: junior.id,
        requirementId: r.id,
        status: "NOT_STARTED" as const,
      })),
      ...requirements.map((r) => ({
        userId: associate.id,
        requirementId: r.id,
        status: "NOT_STARTED" as const,
      })),
    ],
  });

  const campaign = await prisma.campaign.create({
    data: {
      organisationId: org.id,
      name: "Energy Switch — North",
      clientName: "Example Energy Client",
      saleValuePence: 10000,
      realisedSaleStatuses: "PAID",
      expectedPaymentDays: 21,
      funnelStages: {
        create: [
          { name: "Doors", code: "DOORS", sortOrder: 0 },
          { name: "Conversations", code: "CONVERSATIONS", sortOrder: 1 },
          { name: "Qualified Interest", code: "QUALIFIED", sortOrder: 2 },
          { name: "Sale", code: "SALE", sortOrder: 3 },
        ],
      },
    },
  });

  await prisma.territory.create({
    data: {
      organisationId: org.id,
      campaignId: campaign.id,
      name: "North London — Zone A",
      description: "Example territory for first deployment.",
    },
  });

  await prisma.roleplayRequirement.createMany({
    data: [
      {
        organisationId: org.id,
        title: "Door Opening Roleplay",
        brief:
          "Practise a full door opening: greeting, who you are, why you are there, and one qualifying question. Submit your script or practice notes.",
        isMandatory: true,
        sortOrder: 1,
      },
      {
        organisationId: org.id,
        title: "First Objection Roleplay",
        brief:
          "Customer says “I’m not interested.” Practise a calm, professional response that keeps the conversation open.",
        isMandatory: true,
        sortOrder: 2,
      },
    ],
  });

  await prisma.businessRule.createMany({
    data: [
      {
        organisationId: org.id,
        key: "end_of_day_deadline",
        valueJson: JSON.stringify({ time: "20:00", timezone: "Europe/London" }),
        description: "Associates should submit End of Day by this time.",
      },
      {
        organisationId: org.id,
        key: "field_readiness_requires_leader_approval",
        valueJson: JSON.stringify({ required: true }),
        description: "Final Field Readiness gate requires authorised leader approval.",
      },
      {
        organisationId: org.id,
        key: "kpi_targets_default",
        valueJson: JSON.stringify({
          doorsPerDay: 40,
          conversationsPerDay: 15,
          salesPerDay: 2,
        }),
        description: "Default daily KPI targets used for coaching guidance.",
      },
    ],
  });

  console.log("Seeded IMPERIAL OS demo data (V1 — 3 roles)");
  console.log("MD:              md@imperial / password123");
  console.log("Junior Associate: associate@imperial / password123");
  console.log("Associate:       assoc@imperial / password123");
  console.log(`MD id: ${md.id}`);
  console.log(`Junior id: ${junior.id}`);
  console.log(`Associate id: ${associate.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
