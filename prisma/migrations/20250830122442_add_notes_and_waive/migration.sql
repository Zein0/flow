-- AlterEnum
ALTER TYPE "LedgerKind" ADD VALUE 'waive';

-- AlterTable
ALTER TABLE "ledger" ADD COLUMN     "notes" TEXT;
