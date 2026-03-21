import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

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

    if (!semesterId || !levelId) {
      return NextResponse.json(
        { error: "semesterId와 levelId가 필요합니다." },
        { status: 400 }
      )
    }

    const where: any = {
      semesterId,
      levelId,
      status: "ACTIVE",
    }

    if (q) {
      where.title = { contains: q, mode: "insensitive" }
    }

    const modules = await prisma.learningModule.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
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

