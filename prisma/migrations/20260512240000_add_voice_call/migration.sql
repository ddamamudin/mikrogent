-- AlterTable: AppConfig — voice call config
ALTER TABLE "AppConfig" ADD COLUMN "openaiRealtimeModel" TEXT NOT NULL DEFAULT 'gpt-realtime';
ALTER TABLE "AppConfig" ADD COLUMN "voiceCallEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppConfig" ADD COLUMN "voiceDailySeconds" INTEGER NOT NULL DEFAULT 180;

-- AlterTable: AgentDailyCount — track voice seconds consumed today
ALTER TABLE "AgentDailyCount" ADD COLUMN "voiceSeconds" INTEGER NOT NULL DEFAULT 0;
