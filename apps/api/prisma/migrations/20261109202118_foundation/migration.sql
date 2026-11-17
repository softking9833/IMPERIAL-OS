-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "identityState" TEXT NOT NULL DEFAULT 'REGISTERED',
    "lifecycleState" TEXT NOT NULL DEFAULT 'ACCOUNT_CREATED',
    "isFieldReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPerspective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "perspective" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPerspective_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scope_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Scope_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Scope" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserScope_scopeId_fkey" FOREIGN KEY ("scopeId") REFERENCES "Scope" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activePerspective" TEXT NOT NULL,
    "activeScopeId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "saleValuePence" INTEGER NOT NULL DEFAULT 10000,
    "realisedSaleStatuses" TEXT NOT NULL DEFAULT 'PAID',
    "expectedPaymentDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Territory_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Territory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "territoryId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deployment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Deployment_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'FIELD_READINESS',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Curriculum_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReadinessRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirementType" TEXT NOT NULL DEFAULT 'LESSON',
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldReadinessRequirement_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "feedback" TEXT,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementProgress_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FieldReadinessRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "approverId" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Approval_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssociateDayRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayRatePence" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssociateDayRate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssociateDayRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FunnelStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FunnelStage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FieldActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityDate" DATETIME NOT NULL,
    "doorsKnocked" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "clientRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valuePence" INTEGER NOT NULL,
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "clientRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Sale_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Callback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "addressNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "clientRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Callback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPerspective_userId_perspective_key" ON "UserPerspective"("userId", "perspective");

-- CreateIndex
CREATE UNIQUE INDEX "UserScope_userId_scopeId_key" ON "UserScope"("userId", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionContext_userId_key" ON "SessionContext"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementProgress_userId_requirementId_key" ON "RequirementProgress"("userId", "requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRule_organisationId_key_key" ON "BusinessRule"("organisationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FieldActivity_userId_clientRef_key" ON "FieldActivity"("userId", "clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_userId_clientRef_key" ON "Sale"("userId", "clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "Callback_userId_clientRef_key" ON "Callback"("userId", "clientRef");
