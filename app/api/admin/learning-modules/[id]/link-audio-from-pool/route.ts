import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { normalizeWordAudioKey } from "@/lib/word-audio"

type Payload = {
  word_text?: string
  choice1?: string
  choice2?: string
  choice3?: string
  choice4?: string
  correct_index?: number | string
  audio_url?: string | null
  [key: string]: unknown
}

function getMatchKeysFromPayload(p: Payload): string[] {
  const rawIndex = Number(p.correct_index)
  if (Number.isNaN(rawIndex)) return []

  const keys: string[] = []
  // 우선 0-based(현재 저장 규약)로 해석
  if (rawIndex >= 0 && rawIndex <= 3) {
    const a0 = p[`choice${rawIndex + 1}`]
    if (typeof a0 === "string" && a0.trim()) keys.push(a0.trim())
  }
  // 과거/외부 데이터 호환: 1-based로 저장된 값도 보조 시도
  if (rawIndex >= 1 && rawIndex <= 4) {
    const a1 = p[`choice${rawIndex}`]
    if (typeof a1 === "string" && a1.trim()) keys.push(a1.trim())
  }
  return [...new Set(keys)]
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const module = await prisma.learningModule.findUnique({
      where: { id: params.id },
      include: {
        items: { orderBy: { order: "asc" } },
      },
    })

    if (!module) {
      return NextResponse.json({ error: "학습을 찾을 수 없습니다." }, { status: 404 })
    }

    const keys = new Set<string>()
    for (const item of module.items) {
      const p = item.payloadJson as Payload
      const answerWords = getMatchKeysFromPayload(p)
      for (const w of answerWords) keys.add(normalizeWordAudioKey(w))
    }

    if (keys.size === 0) {
      return NextResponse.json({
        linked: 0,
        missingKeys: [] as string[],
        message: "연결할 문항이 없습니다.",
      })
    }

    const pool = await prisma.wordAudio.findMany({
      where: { normalizedKey: { in: [...keys] } },
    })
    const urlByKey = new Map(pool.map((r) => [r.normalizedKey, r.publicUrl]))

    let linked = 0
    const missingKeys: string[] = []
    const updates: ReturnType<typeof prisma.learningItem.update>[] = []

    for (const item of module.items) {
      const p = item.payloadJson as Payload
      const candidateKeys = getMatchKeysFromPayload(p).map((w) => normalizeWordAudioKey(w))
      if (!candidateKeys.length) continue
      const k = candidateKeys.find((key) => urlByKey.has(key))
      const url = k ? urlByKey.get(k) : undefined
      if (!url) {
        missingKeys.push(...candidateKeys)
        continue
      }
      linked++
      if (p.audio_url === url) continue
      const next: Payload = { ...p, audio_url: url }
      updates.push(
        prisma.learningItem.update({
          where: { id: item.id },
          data: { payloadJson: next as Prisma.InputJsonValue },
        })
      )
    }

    if (updates.length) {
      await prisma.$transaction(updates)
    }

    const uniqueMissing = [...new Set(missingKeys)]

    return NextResponse.json({
      linked,
      missingKeys: uniqueMissing,
      message:
        uniqueMissing.length === 0
          ? `모든 문항에 음원이 연결되었습니다. (${linked}개)`
          : `연결됨 ${linked}개. 풀에 없는 키: ${uniqueMissing.length}개`,
    })
  } catch (e: any) {
    console.error("link-audio-from-pool:", e)
    return NextResponse.json(
      { error: e.message || "자동 연결에 실패했습니다." },
      { status: 500 }
    )
  }
}
