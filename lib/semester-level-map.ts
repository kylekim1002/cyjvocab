import { prisma } from "@/lib/prisma"

type SemesterLevelMapRow = {
  semesterCodeId: string
  levelCodeId: string
}

export async function ensureSemesterLevelMapTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SemesterLevelMap" (
      "semesterCodeId" TEXT NOT NULL,
      "levelCodeId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SemesterLevelMap_pkey" PRIMARY KEY ("semesterCodeId", "levelCodeId")
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SemesterLevelMap_semesterCodeId_idx"
    ON "SemesterLevelMap"("semesterCodeId");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "SemesterLevelMap_levelCodeId_idx"
    ON "SemesterLevelMap"("levelCodeId");
  `)
}

export async function getSemesterLevelMapRows(): Promise<SemesterLevelMapRow[]> {
  await ensureSemesterLevelMapTable()
  const rows = await prisma.$queryRaw<Array<{ semesterCodeId: string; levelCodeId: string }>>`
    SELECT "semesterCodeId", "levelCodeId"
    FROM "SemesterLevelMap"
  `
  return rows
}

export async function replaceSemesterLevelMappings(semesterCodeId: string, levelCodeIds: string[]) {
  await ensureSemesterLevelMapTable()
  const deduped = Array.from(new Set(levelCodeIds.map((v) => v.trim()).filter(Boolean)))

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM "SemesterLevelMap"
      WHERE "semesterCodeId" = ${semesterCodeId}
    `

    for (const levelCodeId of deduped) {
      await tx.$executeRaw`
        INSERT INTO "SemesterLevelMap" ("semesterCodeId", "levelCodeId")
        VALUES (${semesterCodeId}, ${levelCodeId})
        ON CONFLICT ("semesterCodeId", "levelCodeId") DO NOTHING
      `
    }
  })
}

export async function cleanupSemesterLevelMappingsByCodeId(codeId: string) {
  await ensureSemesterLevelMapTable()
  await prisma.$executeRaw`
    DELETE FROM "SemesterLevelMap"
    WHERE "semesterCodeId" = ${codeId}
       OR "levelCodeId" = ${codeId}
  `
}

export function groupSemesterLevelMappings(rows: SemesterLevelMapRow[]) {
  const bySemester: Record<string, string[]> = {}
  for (const row of rows) {
    if (!bySemester[row.semesterCodeId]) bySemester[row.semesterCodeId] = []
    bySemester[row.semesterCodeId].push(row.levelCodeId)
  }
  return bySemester
}
