CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "VerificationCodePurpose" AS ENUM ('REGISTER', 'LOGIN', 'RESET_PASSWORD');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrimaryEmail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordCiphertext" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrimaryEmail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecoveryEmail" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryEmail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegisterPhone" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegisterPhone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecoveryPhone" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryPhone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Platform" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailPlatform" (
    "emailId" UUID NOT NULL,
    "platformId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailPlatform_pkey" PRIMARY KEY ("emailId","platformId")
);

CREATE TABLE "EmailRecoveryEmail" (
    "emailId" UUID NOT NULL,
    "recoveryEmailId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailRecoveryEmail_pkey" PRIMARY KEY ("emailId","recoveryEmailId")
);

CREATE TABLE "EmailRegisterPhone" (
    "emailId" UUID NOT NULL,
    "registerPhoneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailRegisterPhone_pkey" PRIMARY KEY ("emailId","registerPhoneId")
);

CREATE TABLE "EmailRecoveryPhone" (
    "emailId" UUID NOT NULL,
    "recoveryPhoneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailRecoveryPhone_pkey" PRIMARY KEY ("emailId","recoveryPhoneId")
);

CREATE TABLE "VerificationCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "purpose" "VerificationCodePurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "PrimaryEmail_userId_email_key" ON "PrimaryEmail"("userId", "email");
CREATE UNIQUE INDEX "RecoveryEmail_userId_email_key" ON "RecoveryEmail"("userId", "email");
CREATE UNIQUE INDEX "RegisterPhone_userId_countryCode_phone_key" ON "RegisterPhone"("userId", "countryCode", "phone");
CREATE UNIQUE INDEX "RecoveryPhone_userId_countryCode_phone_key" ON "RecoveryPhone"("userId", "countryCode", "phone");
CREATE UNIQUE INDEX "Platform_userId_type_name_key" ON "Platform"("userId", "type", "name");

CREATE INDEX "PrimaryEmail_createdAt_idx" ON "PrimaryEmail"("createdAt");
CREATE INDEX "PrimaryEmail_updatedAt_idx" ON "PrimaryEmail"("updatedAt");
CREATE INDEX "RecoveryEmail_createdAt_idx" ON "RecoveryEmail"("createdAt");
CREATE INDEX "RecoveryEmail_updatedAt_idx" ON "RecoveryEmail"("updatedAt");
CREATE INDEX "RegisterPhone_createdAt_idx" ON "RegisterPhone"("createdAt");
CREATE INDEX "RegisterPhone_updatedAt_idx" ON "RegisterPhone"("updatedAt");
CREATE INDEX "RecoveryPhone_createdAt_idx" ON "RecoveryPhone"("createdAt");
CREATE INDEX "RecoveryPhone_updatedAt_idx" ON "RecoveryPhone"("updatedAt");
CREATE INDEX "Platform_createdAt_idx" ON "Platform"("createdAt");
CREATE INDEX "Platform_updatedAt_idx" ON "Platform"("updatedAt");
CREATE INDEX "EmailPlatform_platformId_idx" ON "EmailPlatform"("platformId");
CREATE INDEX "EmailPlatform_createdAt_idx" ON "EmailPlatform"("createdAt");
CREATE INDEX "EmailRecoveryEmail_recoveryEmailId_idx" ON "EmailRecoveryEmail"("recoveryEmailId");
CREATE INDEX "EmailRecoveryEmail_createdAt_idx" ON "EmailRecoveryEmail"("createdAt");
CREATE INDEX "EmailRegisterPhone_registerPhoneId_idx" ON "EmailRegisterPhone"("registerPhoneId");
CREATE INDEX "EmailRegisterPhone_createdAt_idx" ON "EmailRegisterPhone"("createdAt");
CREATE INDEX "EmailRecoveryPhone_recoveryPhoneId_idx" ON "EmailRecoveryPhone"("recoveryPhoneId");
CREATE INDEX "EmailRecoveryPhone_createdAt_idx" ON "EmailRecoveryPhone"("createdAt");
CREATE INDEX "VerificationCode_email_purpose_createdAt_idx" ON "VerificationCode"("email", "purpose", "createdAt");

ALTER TABLE "PrimaryEmail"
    ADD CONSTRAINT "PrimaryEmail_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecoveryEmail"
    ADD CONSTRAINT "RecoveryEmail_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegisterPhone"
    ADD CONSTRAINT "RegisterPhone_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecoveryPhone"
    ADD CONSTRAINT "RecoveryPhone_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Platform"
    ADD CONSTRAINT "Platform_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailPlatform"
    ADD CONSTRAINT "EmailPlatform_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "PrimaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailPlatform"
    ADD CONSTRAINT "EmailPlatform_platformId_fkey"
    FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRecoveryEmail"
    ADD CONSTRAINT "EmailRecoveryEmail_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "PrimaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRecoveryEmail"
    ADD CONSTRAINT "EmailRecoveryEmail_recoveryEmailId_fkey"
    FOREIGN KEY ("recoveryEmailId") REFERENCES "RecoveryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRegisterPhone"
    ADD CONSTRAINT "EmailRegisterPhone_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "PrimaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRegisterPhone"
    ADD CONSTRAINT "EmailRegisterPhone_registerPhoneId_fkey"
    FOREIGN KEY ("registerPhoneId") REFERENCES "RegisterPhone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRecoveryPhone"
    ADD CONSTRAINT "EmailRecoveryPhone_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "PrimaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailRecoveryPhone"
    ADD CONSTRAINT "EmailRecoveryPhone_recoveryPhoneId_fkey"
    FOREIGN KEY ("recoveryPhoneId") REFERENCES "RecoveryPhone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
