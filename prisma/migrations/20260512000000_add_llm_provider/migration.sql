-- AppConfig: tambah pilihan LLM provider + model
ALTER TABLE "AppConfig"
  ADD COLUMN IF NOT EXISTS "openaiApiKey"   TEXT,
  ADD COLUMN IF NOT EXISTS "llmProvider"    TEXT NOT NULL DEFAULT 'anthropic',
  ADD COLUMN IF NOT EXISTS "anthropicModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  ADD COLUMN IF NOT EXISTS "openaiModel"    TEXT NOT NULL DEFAULT 'gpt-4o';
