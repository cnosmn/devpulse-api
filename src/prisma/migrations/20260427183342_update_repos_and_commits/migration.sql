-- AlterTable
ALTER TABLE "Commit" ALTER COLUMN "authorName" DROP NOT NULL,
ALTER COLUMN "authorEmail" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "languages" JSONB,
ADD COLUMN     "stargazerCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "fullName" DROP NOT NULL;
