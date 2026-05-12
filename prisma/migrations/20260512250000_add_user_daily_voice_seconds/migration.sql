-- AlterTable: per-user override untuk batas voice harian (detik)
ALTER TABLE "User" ADD COLUMN "dailyVoiceSeconds" INTEGER;
