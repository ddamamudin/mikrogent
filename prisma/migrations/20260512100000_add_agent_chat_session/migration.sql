CREATE TABLE "AgentChatSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messages" JSONB NOT NULL,
  "apiMessages" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentChatSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentChatSession_userId_key" ON "AgentChatSession"("userId");

ALTER TABLE "AgentChatSession" ADD CONSTRAINT "AgentChatSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
