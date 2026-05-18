DROP INDEX IF EXISTS "PrimaryEmail_userId_provider_idx";
ALTER TABLE "PrimaryEmail" DROP COLUMN IF EXISTS "provider";
