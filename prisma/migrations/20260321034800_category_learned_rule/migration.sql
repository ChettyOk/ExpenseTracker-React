-- CreateTable
CREATE TABLE "CategoryLearnedRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalizedDescription" VARCHAR(500) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryLearnedRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryLearnedRule_userId_idx" ON "CategoryLearnedRule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryLearnedRule_userId_normalizedDescription_key" ON "CategoryLearnedRule"("userId", "normalizedDescription");

-- AddForeignKey
ALTER TABLE "CategoryLearnedRule" ADD CONSTRAINT "CategoryLearnedRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
