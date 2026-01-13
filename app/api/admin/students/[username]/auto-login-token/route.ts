import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { generateAutoLoginToken } from "@/lib/utils"

export async function POST(
  request: Request,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { username: params.username },
    })

    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const token = generateAutoLoginToken()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await prisma.student.update({
      where: { id: student.id },
      data: {
        autoLoginToken: token,
        autoLoginTokenExpiresAt: expiresAt,
      },
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Regenerate token error:", error)
    return NextResponse.json(
      { error: "토큰 재생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
