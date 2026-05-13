-- AppConfig.defaultMaxRouters: nilai default kuota router untuk user baru.
-- Admin bisa ubah di Pengaturan, dan opsional sync ke existing user via API.
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "defaultMaxRouters" INTEGER NOT NULL DEFAULT 1;
