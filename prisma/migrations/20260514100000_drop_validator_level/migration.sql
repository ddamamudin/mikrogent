-- Hapus user Faqih (admin@mikroplay.com) — role VALIDATOR di-deprecate.
-- Operator/Admin tier akan ditambah kembali di iterasi berikutnya.
DELETE FROM "User" WHERE email = 'admin@mikroplay.com' AND "adminLevel" = 'VALIDATOR';

-- Safety net: kalau ada baris VALIDATOR yang belum sempat di-hapus (mis. admin lain),
-- promote ke SUPER supaya gak orphan reference saat enum di-rebuild.
UPDATE "User" SET "adminLevel" = 'SUPER' WHERE "adminLevel" = 'VALIDATOR';

-- Postgres gak support ALTER TYPE ... DROP VALUE.
-- Workaround: rename old enum, create new, cast column, drop old.
ALTER TYPE "AdminLevel" RENAME TO "AdminLevel_old";
CREATE TYPE "AdminLevel" AS ENUM ('SUPER');
ALTER TABLE "User" ALTER COLUMN "adminLevel" TYPE "AdminLevel" USING "adminLevel"::text::"AdminLevel";
DROP TYPE "AdminLevel_old";
