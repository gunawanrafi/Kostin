-- CreateEnum
CREATE TYPE "PaymentDuration" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "depositAmount" DECIMAL(12,2),
ADD COLUMN     "feeCarParking" DECIMAL(12,2),
ADD COLUMN     "feeExtraOccupant" DECIMAL(12,2),
ADD COLUMN     "feeMotorcycleParking" DECIMAL(12,2),
ADD COLUMN     "houseRules" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "paymentDuration" "PaymentDuration" NOT NULL DEFAULT 'MONTHLY';
