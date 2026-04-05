-- Change UserRole enum values from lowercase to uppercase

-- Step 1: Add new uppercase values to the enum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'MEMBER';

-- Step 2: Update existing data to uppercase
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'admin';
UPDATE "users" SET "role" = 'MEMBER' WHERE "role" = 'member';

-- Step 3: Recreate enum with only uppercase values
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MEMBER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
