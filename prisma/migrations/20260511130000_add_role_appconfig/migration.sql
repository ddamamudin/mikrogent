-- Create Role enum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- Add role column to User
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- Make brand nullable
ALTER TABLE "User" ALTER COLUMN "brand" DROP NOT NULL;

-- Create AppConfig table
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "adminSetupEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
