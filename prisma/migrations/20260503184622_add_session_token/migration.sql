-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "qualifObjectif" TEXT,
    "qualifDelai" TEXT,
    "qualifFrein" TEXT,
    "qualifExperience" TEXT,
    "qualifDisponible" TEXT,
    "qualifSante" TEXT,
    "qualifMotivation" TEXT,
    "qualifBudget" TEXT,
    "weight" REAL,
    "height" REAL,
    "availableDays" TEXT,
    "nutritionInfo" TEXT,
    "photosReceived" BOOLEAN NOT NULL DEFAULT false,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "manychatId" TEXT,
    "sessionToken" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "ChallengeGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "maxSize" INTEGER NOT NULL DEFAULT 10,
    "coachNotes" TEXT
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "day1Done" BOOLEAN NOT NULL DEFAULT false,
    "day2Done" BOOLEAN NOT NULL DEFAULT false,
    "day3Done" BOOLEAN NOT NULL DEFAULT false,
    "day4Done" BOOLEAN NOT NULL DEFAULT false,
    "day5Done" BOOLEAN NOT NULL DEFAULT false,
    "day6Done" BOOLEAN NOT NULL DEFAULT false,
    "day7Done" BOOLEAN NOT NULL DEFAULT false,
    "engagementScore" INTEGER,
    "isSerious" BOOLEAN NOT NULL DEFAULT false,
    "coachNotes" TEXT,
    CONSTRAINT "ChallengeParticipant_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChallengeParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChallengeGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "contractStart" DATETIME NOT NULL,
    "contractEnd" DATETIME NOT NULL,
    "priceEur" INTEGER NOT NULL DEFAULT 3000,
    "objectives" TEXT,
    "progressNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CoachingClient_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AISummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "content" TEXT NOT NULL,
    CONSTRAINT "AISummary_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_phone_key" ON "Prospect"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_sessionToken_key" ON "Prospect"("sessionToken");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_createdAt_idx" ON "Prospect"("createdAt");

-- CreateIndex
CREATE INDEX "ChallengeGroup_status_idx" ON "ChallengeGroup"("status");

-- CreateIndex
CREATE INDEX "ChallengeGroup_startDate_idx" ON "ChallengeGroup"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_prospectId_groupId_key" ON "ChallengeParticipant"("prospectId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingClient_prospectId_key" ON "CoachingClient"("prospectId");

-- CreateIndex
CREATE INDEX "AISummary_prospectId_idx" ON "AISummary"("prospectId");
