-- Naikin default kuota chat harian 50 -> 100. Production AppConfig singleton
-- udah di-set manual ke 100 lewat /admin/pengaturan, ini cuma sync schema
-- default supaya:
--   1. Fresh install / DB baru kena 100, bukan 50
--   2. Source of truth (Prisma schema) reflect realitas runtime
-- Tidak ada UPDATE statement ke row existing: nilai per-AppConfig udah benar.
ALTER TABLE "AppConfig" ALTER COLUMN "dailyChatLimit" SET DEFAULT 100;
