-- AlterTable
ALTER TABLE "Device" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE INDEX "Device_category_idx" ON "Device"("category");
