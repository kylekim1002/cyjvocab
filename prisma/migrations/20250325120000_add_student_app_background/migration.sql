-- CreateTable
CREATE TABLE "StudentAppBackground" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAppBackground_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentAppBackground_isActive_idx" ON "StudentAppBackground"("isActive");

-- CreateIndex
CREATE INDEX "StudentAppBackground_createdAt_idx" ON "StudentAppBackground"("createdAt");
