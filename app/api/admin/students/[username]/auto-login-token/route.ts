import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { hashAutoLoginToken } from "@/lib/auto-login-token"
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
    const body = await request.json().catch(() => ({} as any))
    const { studentId } = body

    const student = studentId
      ? await prisma.student.findUnique({ where: { id: String(studentId) } })
      : await prisma.student.findFirst({
          where: { username: params.username },
          orderBy: { createdAt: "desc" },
        })

    if (!student) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const token = generateAutoLoginToken()
    const autoLoginTokenHash = hashAutoLoginToken(token)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await prisma.student.update({
      where: { id: student.id },
      data: {
        autoLoginTokenHash,
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
