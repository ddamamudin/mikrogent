-- Fix: migration 20260514140000 nyoba DROP CONSTRAINT untuk @unique-nya Prisma,
-- tapi di PG `@unique` di-implement sebagai UNIQUE INDEX, bukan CONSTRAINT. Akibatnya
-- "DROP CONSTRAINT IF EXISTS" no-op, dan constraint masih aktif → create() error
-- P2002 (Unique constraint failed on userId).
DROP INDEX IF EXISTS "AgentChatSession_userId_key";
