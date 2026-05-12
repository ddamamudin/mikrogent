-- AlterTable: pilihan suara TTS untuk OpenAI Realtime
ALTER TABLE "AppConfig" ADD COLUMN "openaiVoice" TEXT NOT NULL DEFAULT 'coral';
