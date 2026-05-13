-- Multi-router support: user bisa punya hingga N router (default 1, admin atur per user).
-- Migrasi idempoten supaya aman dijalankan ulang setelah partial apply.

-- 1. User.maxRouters
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "maxRouters" INTEGER NOT NULL DEFAULT 1;

-- 2. MikrotikCredential.name + backfill
ALTER TABLE "MikrotikCredential" ADD COLUMN IF NOT EXISTS "name" TEXT;
UPDATE "MikrotikCredential" SET "name" = 'Router 1' WHERE "name" IS NULL;
ALTER TABLE "MikrotikCredential" ALTER COLUMN "name" SET NOT NULL;

-- 3. Drop unique constraint userId pada MikrotikCredential, ganti composite (userId, name)
ALTER TABLE "MikrotikCredential" DROP CONSTRAINT IF EXISTS "MikrotikCredential_userId_key";
DROP INDEX IF EXISTS "MikrotikCredential_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "MikrotikCredential_userId_name_key" ON "MikrotikCredential"("userId", "name");
CREATE INDEX IF NOT EXISTS "MikrotikCredential_userId_idx" ON "MikrotikCredential"("userId");

-- 4. AgentMemory: pindah dari userId ke credentialId
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "credentialId" TEXT;

-- Backfill: setiap AgentMemory existing dipetakan ke credential pertama si user (kalau userId masih ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AgentMemory' AND column_name = 'userId'
  ) THEN
    UPDATE "AgentMemory" am
    SET "credentialId" = mc."id"
    FROM "MikrotikCredential" mc
    WHERE mc."userId" = am."userId"
      AND mc."id" = (
        SELECT "id" FROM "MikrotikCredential" sub
        WHERE sub."userId" = am."userId"
        ORDER BY sub."createdAt" ASC LIMIT 1
      )
      AND am."credentialId" IS NULL;

    -- Drop orphan memories yang gak ada credential pasangannya
    DELETE FROM "AgentMemory" WHERE "credentialId" IS NULL;
  END IF;
END$$;

ALTER TABLE "AgentMemory" ALTER COLUMN "credentialId" SET NOT NULL;
ALTER TABLE "AgentMemory" DROP CONSTRAINT IF EXISTS "AgentMemory_userId_fkey";
ALTER TABLE "AgentMemory" DROP CONSTRAINT IF EXISTS "AgentMemory_userId_key";
DROP INDEX IF EXISTS "AgentMemory_userId_key";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AgentMemory' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "AgentMemory" DROP COLUMN "userId";
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "AgentMemory_credentialId_key" ON "AgentMemory"("credentialId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentMemory_credentialId_fkey'
  ) THEN
    ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_credentialId_fkey"
      FOREIGN KEY ("credentialId") REFERENCES "MikrotikCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 5. AgentChatSession: track active router per session
ALTER TABLE "AgentChatSession" ADD COLUMN IF NOT EXISTS "activeCredentialId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentChatSession_activeCredentialId_fkey'
  ) THEN
    ALTER TABLE "AgentChatSession" ADD CONSTRAINT "AgentChatSession_activeCredentialId_fkey"
      FOREIGN KEY ("activeCredentialId") REFERENCES "MikrotikCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
