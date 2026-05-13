-- Ubah default kolom llmProvider dari "anthropic" ke "openai" untuk install baru.
-- ALTER COLUMN SET DEFAULT cuma ngubah default untuk INSERT baru, gak nyentuh
-- row existing — singleton AppConfig yang udah ada tetap pakai value-nya
-- sekarang (admin bisa flip via UI kalau perlu).
ALTER TABLE "AppConfig" ALTER COLUMN "llmProvider" SET DEFAULT 'openai';
