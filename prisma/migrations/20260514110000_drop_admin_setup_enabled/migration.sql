-- Flow setup admin di /admin/setup di-deprecate (admin di-bikin manual via seed/DB).
-- Kolom adminSetupEnabled jadi gak relevan lagi.
ALTER TABLE "AppConfig" DROP COLUMN IF EXISTS "adminSetupEnabled";
