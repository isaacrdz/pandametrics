-- Memberships and organization ownership (docs/subscriptions.md, phase 1). Generated with
-- `prisma migrate diff`, then edited by hand: ownerId is added nullable, backfilled and only then
-- made required, and the memberships are backfilled from User.organizationId / User.role.

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_organizationId_isActive_idx" ON "Membership"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Added by hand: ownerId starts nullable and takes the oldest non-deleted OWNER of each organization
ALTER TABLE "Organization" ADD COLUMN "ownerId" TEXT;

UPDATE "Organization" o SET "ownerId" = (
  SELECT u.id FROM "User" u
  WHERE u."organizationId" = o.id AND u.role = 'OWNER' AND u."deletedAt" IS NULL
  ORDER BY u."createdAt", u.id
  LIMIT 1
);

-- An organization without an owner and without any data can never be reached: it is removed. One
-- with users, surveys or responses stops the migration, to be fixed by hand first
DELETE FROM "Organization" o
WHERE o."ownerId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."organizationId" = o.id)
  AND NOT EXISTS (SELECT 1 FROM "Survey" s WHERE s."organizationId" = o.id)
  AND NOT EXISTS (SELECT 1 FROM "SurveyResponse" r WHERE r."organizationId" = o.id);

DO $$
DECLARE
  ownerless TEXT;
BEGIN
  SELECT string_agg(id || ' (' || name || ')', ', ') INTO ownerless FROM "Organization" WHERE "ownerId" IS NULL;
  IF ownerless IS NOT NULL THEN
    RAISE EXCEPTION 'Organizations without an owner: %', ownerless;
  END IF;
END $$;

ALTER TABLE "Organization" ALTER COLUMN "ownerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ownerId_key" ON "Organization"("ownerId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Added by hand: one membership per non-deleted user with an organization. The owner keeps OWNER, a
-- second owner becomes ADMIN (one owner per organization), everyone else keeps their role. Their
-- active / inactive state moves to the membership
INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id, u."organizationId",
       CASE
         WHEN o."ownerId" = u.id THEN 'OWNER'::"Role"
         WHEN u.role = 'OWNER' THEN 'ADMIN'::"Role"
         ELSE u.role
       END,
       u."isActive", u."createdAt", CURRENT_TIMESTAMP
FROM "User" u
JOIN "Organization" o ON o.id = u."organizationId"
WHERE u."deletedAt" IS NULL;

-- Deactivating used to set User.isActive from /users; it now lives in the membership, so the
-- account itself is active again (deleted accounts stay deleted)
UPDATE "User" SET "isActive" = true WHERE "deletedAt" IS NULL AND "isActive" = false;
