-- AlterTable: invite codes are now generated explicitly by the API
ALTER TABLE "Group" ALTER COLUMN "inviteCode" DROP DEFAULT;
