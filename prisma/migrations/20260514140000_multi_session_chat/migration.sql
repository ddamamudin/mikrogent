-- Multi-session chat history (max 10 per user, FIFO).
-- Before: 1 AgentChatSession per user (singleton via @unique userId).
-- After: many per user, sorted by updatedAt desc.

-- Drop unique constraint on userId
ALTER TABLE "AgentChatSession" DROP CONSTRAINT IF EXISTS "AgentChatSession_userId_key";

-- Add title (auto-set dari pesan user pertama) & createdAt
ALTER TABLE "AgentChatSession" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AgentChatSession" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Index untuk query list sorted by recency
CREATE INDEX IF NOT EXISTS "AgentChatSession_userId_updatedAt_idx" ON "AgentChatSession"("userId", "updatedAt" DESC);
