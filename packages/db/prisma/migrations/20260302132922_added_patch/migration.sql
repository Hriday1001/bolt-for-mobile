-- CreateTable
CREATE TABLE "Patch" (
    "id" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
