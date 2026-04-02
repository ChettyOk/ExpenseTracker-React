-- CreateTable
CREATE TABLE "BankImportProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "mapping" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankImportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCategoryRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pattern" VARCHAR(500) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankImportProfile_userId_idx" ON "BankImportProfile"("userId");

-- CreateIndex
CREATE INDEX "UserCategoryRule_userId_priority_idx" ON "UserCategoryRule"("userId", "priority");

-- AddForeignKey
ALTER TABLE "BankImportProfile" ADD CONSTRAINT "BankImportProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryRule" ADD CONSTRAINT "UserCategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
