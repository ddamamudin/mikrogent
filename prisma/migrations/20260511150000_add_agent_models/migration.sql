-- AppConfig: tambah kolom AI Agent settings
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "claudeApiKey"   TEXT,
  ADD COLUMN IF NOT EXISTS "agentPersona"   TEXT,
  ADD COLUMN IF NOT EXISTS "agentKnowledge" TEXT,
  ADD COLUMN IF NOT EXISTS "dailyChatLimit" INTEGER NOT NULL DEFAULT 50;

-- MikrotikCredential
CREATE TABLE IF NOT EXISTS "MikrotikCredential" (
  "id"        TEXT      NOT NULL PRIMARY KEY,
  "userId"    TEXT      NOT NULL UNIQUE,
  "host"      TEXT      NOT NULL,
  "port"      INTEGER   NOT NULL DEFAULT 22,
  "sshUser"   TEXT      NOT NULL,
  "sshPass"   TEXT      NOT NULL,
  "connected" BOOLEAN   NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MikrotikCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- AgentMemory
CREATE TABLE IF NOT EXISTS "AgentMemory" (
  "id"        TEXT      NOT NULL PRIMARY KEY,
  "userId"    TEXT      NOT NULL UNIQUE,
  "content"   TEXT      NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentMemory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- AgentDailyCount
CREATE TABLE IF NOT EXISTS "AgentDailyCount" (
  "id"     TEXT    NOT NULL PRIMARY KEY,
  "userId" TEXT    NOT NULL UNIQUE,
  "count"  INTEGER NOT NULL DEFAULT 0,
  "date"   TEXT    NOT NULL,
  CONSTRAINT "AgentDailyCount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
