-- CreateTable
CREATE TABLE "AgentSshLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT,
    "routerName" TEXT NOT NULL,
    "routerHost" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "errorMsg" TEXT,
    "durationMs" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSshLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSshLog_userId_createdAt_idx" ON "AgentSshLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentSshLog_credentialId_idx" ON "AgentSshLog"("credentialId");

-- CreateIndex
CREATE INDEX "AgentSshLog_createdAt_idx" ON "AgentSshLog"("createdAt");
