-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('SUPER', 'VALIDATOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminLevel" "AdminLevel";

-- Seed existing admins
UPDATE "User" SET "adminLevel" = 'SUPER' WHERE email = 'superadmin@mikroplay.com';
UPDATE "User" SET "adminLevel" = 'VALIDATOR' WHERE email = 'admin@mikroplay.com';
