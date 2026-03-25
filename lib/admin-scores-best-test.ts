import { prisma } from "@/lib/prisma"

export type ProgressTriple = {
  studentId: string
  assignmentId: string
  moduleId: string
}

function tripleKey(p: ProgressTriple): string {
  return `${p.studentId}|${p.assignmentId}|${p.moduleId}`
}

/** OR 절이 너무 길어지는 것을 피하기 위해 chunk 단위로 조회 */
const CHUNK_SIZE = 400

/**
 * (학생, 배정, 모듈)별 완료 세션 중 테스트 최고 점수를 한 번에 조회 (N+1 제거)
 */
export async function fetchBestTestScoresMap(
  keys: ProgressTriple[]
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  if (keys.length === 0) return result

  const unique = new Map<string, ProgressTriple>()
  for (const k of keys) {
    unique.set(tripleKey(k), k)
  }
  const deduped = [...unique.values()]

  for (let i = 0; i < deduped.length; i += CHUNK_SIZE) {
    const chunk = deduped.slice(i, i + CHUNK_SIZE)
    const rows = await prisma.studySession.groupBy({
      by: ["studentId", "assignmentId", "moduleId"],
      where: {
        OR: chunk.map((k) => ({
          studentId: k.studentId,
          assignmentId: k.assignmentId,
          moduleId: k.moduleId,
        })),
        status: "COMPLETED",
        score: { not: null },
      },
      _max: {
        score: true,
      },
    })

    for (const r of rows) {
      result.set(tripleKey(r), r._max.score)
    }
  }

  return result
}

export function getBestScoreForProgress(
  map: Map<string, number | null>,
  p: ProgressTriple
): number | null {
  return map.get(tripleKey(p)) ?? null
}
