import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { normalizeWordAudioKey } from "@/lib/word-audio"

type Payload = {
  word_text?: string
  audio_url?: string | null
  [key: string]: unknown
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
      const w = (p.word_text || "").trim()
      if (w) keys.add(normalizeWordAudioKey(w))
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
      const w = (p.word_text || "").trim()
      if (!w) continue
      const k = normalizeWordAudioKey(w)
      const url = urlByKey.get(k)
      if (!url) {
        missingKeys.push(k)
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
