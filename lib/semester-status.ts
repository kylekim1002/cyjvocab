import { prisma } from "@/lib/prisma"

type SemesterStatusRow = {
  semesterCodeId: string
  isActive: boolean
}

export async function ensureSemesterCodeStatusTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SemesterCodeStatus" (
      "semesterCodeId" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SemesterCodeStatus_pkey" PRIMARY KEY ("semesterCodeId")
    );
  `)
}

export async function getSemesterStatusRows(): Promise<SemesterStatusRow[]> {
  await ensureSemesterCodeStatusTable()
  const rows = await prisma.$queryRaw<Array<{ semesterCodeId: string; isActive: boolean }>>`
    SELECT "semesterCodeId", "isActive"
    FROM "SemesterCodeStatus"
  `
  return rows
}

export async function setSemesterActive(semesterCodeId: string, isActive: boolean) {
  await ensureSemesterCodeStatusTable()
  await prisma.$executeRaw`
    INSERT INTO "SemesterCodeStatus" ("semesterCodeId", "isActive", "updatedAt")
    VALUES (${semesterCodeId}, ${isActive}, CURRENT_TIMESTAMP)
    ON CONFLICT ("semesterCodeId")
    DO UPDATE SET
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP
  `
}

export async function cleanupSemesterStatusByCodeId(codeId: string) {
  await ensureSemesterCodeStatusTable()
  await prisma.$executeRaw`
    DELETE FROM "SemesterCodeStatus"
    WHERE "semesterCodeId" = ${codeId}
  `
}

export function toSemesterStatusMap(rows: SemesterStatusRow[]) {
  const map: Record<string, boolean> = {}
  for (const row of rows) map[row.semesterCodeId] = !!row.isActive
  return map
}
