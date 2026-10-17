-- Subscriptions phase 6 (docs/subscriptions.md, section 10): the contract step of memberships.
-- Nothing has read or written User.organizationId / User.role since phase 1 (Membership holds
-- both), so their stale values are dropped as they are. Only these columns, their foreign key and
-- their two indexes go.

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropIndex
DROP INDEX "User_organizationId_idx";

-- DropIndex
DROP INDEX "User_organizationId_isActive_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "organizationId",
DROP COLUMN "role";

