-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "curriculumId" TEXT,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'LESSON',
    "summary" TEXT,
    "body" TEXT,
    "videoUrl" TEXT,
    "quizJson" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lesson_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "quizScore" INTEGER,
    "quizPassed" BOOLEAN,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FieldReadinessRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirementType" TEXT NOT NULL DEFAULT 'LESSON',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldReadinessRequirement_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldReadinessRequirement_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FieldReadinessRequirement" ("createdAt", "curriculumId", "description", "id", "isMandatory", "requirementType", "sortOrder", "title") SELECT "createdAt", "curriculumId", "description", "id", "isMandatory", "requirementType", "sortOrder", "title" FROM "FieldReadinessRequirement";
DROP TABLE "FieldReadinessRequirement";
ALTER TABLE "new_FieldReadinessRequirement" RENAME TO "FieldReadinessRequirement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
