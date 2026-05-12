-- Default suara dibalikin ke "marin" (lebih natural buat user Indonesia menurut testing)
ALTER TABLE "AppConfig" ALTER COLUMN "openaiVoice" SET DEFAULT 'marin';

-- Update row existing yang masih pakai "coral" (default lama) ke "marin"
UPDATE "AppConfig" SET "openaiVoice" = 'marin' WHERE "openaiVoice" = 'coral';
