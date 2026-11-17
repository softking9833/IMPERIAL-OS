-- CreateTable
CREATE TABLE "RoleplayRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoleplayRequirement_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleplaySubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "reviewerId" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoleplaySubmission_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "RoleplayRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleplaySubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleplaySubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
