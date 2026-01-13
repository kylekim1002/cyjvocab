import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET: 레벨 코드값 목록
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const levels = await prisma.code.findMany({
      where: { category: "LEVEL" },
      orderBy: { order: "asc" },
    })

    return NextResponse.json(levels)
  } catch (error) {
    console.error("Get levels error:", error)
    return NextResponse.json(
      { error: "레벨 목록 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
