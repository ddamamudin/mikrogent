-- Rename subdomain to brand
ALTER TABLE "User" RENAME COLUMN "subdomain" TO "brand";

-- Rename the unique constraint to match new column name
ALTER INDEX IF EXISTS "User_subdomain_key" RENAME TO "User_brand_key";

-- Add new optional fields
ALTER TABLE "User" ADD COLUMN "alamat" TEXT;
ALTER TABLE "User" ADD COLUMN "noWa" TEXT;
