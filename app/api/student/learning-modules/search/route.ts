import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    const levelId = searchParams.get("levelId")
    const q = (searchParams.get("q") || "").trim()

    const schema = z.object({
      semesterId: z.string().min(1),
      levelId: z.string().min(1),
      q: z.string().max(80).optional(),
    })

    const parsed = schema.safeParse({
      semesterId: semesterId ?? "",
      levelId: levelId ?? "",
      q: q || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: "semesterId와 levelId가 필요합니다." }, { status: 400 })
    }

    const where: any = {
      semesterId: parsed.data.semesterId,
      levelId: parsed.data.levelId,
      status: "ACTIVE",
    }

    if (parsed.data.q) {
      where.title = { contains: parsed.data.q, mode: "insensitive" }
    }

    const modules = await prisma.learningModule.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
      },
      // 검색 결과는 모듈 제목 오름차순으로 정렬
      orderBy: { title: "asc" },
      take: 20,
    })

    return NextResponse.json(modules)
  } catch (error: any) {
    console.error("Student learning modules search error:", error)
    return NextResponse.json(
      { error: error?.message || "학습 검색에 실패했습니다." },
      { status: 500 }
    )
  }
}

