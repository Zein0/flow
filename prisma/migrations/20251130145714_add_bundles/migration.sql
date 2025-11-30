-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('appointment', 'bundle');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'service_credit';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'appointment';

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_items" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_credits" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bundle_items_bundleId_sessionTypeId_key" ON "bundle_items"("bundleId", "sessionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "service_credits_patientId_sessionTypeId_orderId_key" ON "service_credits"("patientId", "sessionTypeId", "orderId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_credits" ADD CONSTRAINT "service_credits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_credits" ADD CONSTRAINT "service_credits_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "session_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_credits" ADD CONSTRAINT "service_credits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
