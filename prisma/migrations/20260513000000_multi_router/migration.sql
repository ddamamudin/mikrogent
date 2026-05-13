-- Multi-router support: user bisa punya hingga N router (default 1, admin atur per user).
-- Strategi: tambah kolom dulu, backfill existing data, baru drop unique lama & enforce NOT NULL.

-- 1. User.maxRouters (default 1; admin bisa naikkin per user)
ALTER TABLE "User" ADD COLUMN "maxRouters" INTEGER NOT NULL DEFAULT 1;

-- 2. MikrotikCredential.name nullable dulu supaya backfill aman
ALTER TABLE "MikrotikCredential" ADD COLUMN "name" TEXT;
UPDATE "MikrotikCredential" SET "name" = 'Router 1' WHERE "name" IS NULL;
ALTER TABLE "MikrotikCredential" ALTER COLUMN "name" SET NOT NULL;

-- 3. Drop unique constraint userId pada MikrotikCredential, ganti composite (userId, name)
DROP INDEX IF EXISTS "MikrotikCredential_userId_key";
CREATE UNIQUE INDEX "MikrotikCredential_userId_name_key" ON "MikrotikCredential"("userId", "name");
CREATE INDEX "MikrotikCredential_userId_idx" ON "MikrotikCredential"("userId");

-- 4. AgentMemory: pindah dari userId ke credentialId
ALTER TABLE "AgentMemory" ADD COLUMN "credentialId" TEXT;

-- Backfill: setiap AgentMemory existing dipetakan ke credential pertama si user
UPDATE "AgentMemory" am
SET "credentialId" = mc."id"
FROM "MikrotikCredential" mc
WHERE mc."userId" = am."userId"
  AND mc."id" = (
    SELECT "id" FROM "MikrotikCredential" sub
    WHERE sub."userId" = am."userId"
    ORDER BY sub."createdAt" ASC LIMIT 1
  );

-- Hapus AgentMemory yang gak punya credential pasangannya (orphan)
DELETE FROM "AgentMemory" WHERE "credentialId" IS NULL;

-- Enforce NOT NULL + unique + FK
ALTER TABLE "AgentMemory" ALTER COLUMN "credentialId" SET NOT NULL;
ALTER TABLE "AgentMemory" DROP CONSTRAINT IF EXISTS "AgentMemory_userId_fkey";
DROP INDEX IF EXISTS "AgentMemory_userId_key";
ALTER TABLE "AgentMemory" DROP COLUMN "userId";

CREATE UNIQUE INDEX "AgentMemory_credentialId_key" ON "AgentMemory"("credentialId");
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "MikrotikCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. AgentChatSession: track active router per session
ALTER TABLE "AgentChatSession" ADD COLUMN "activeCredentialId" TEXT;
ALTER TABLE "AgentChatSession" ADD CONSTRAINT "AgentChatSession_activeCredentialId_fkey"
  FOREIGN KEY ("activeCredentialId") REFERENCES "MikrotikCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
