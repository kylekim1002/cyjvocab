import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { generateAutoLoginToken } from "@/lib/utils"

export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const token = generateAutoLoginToken()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1년 후 만료

    await prisma.student.update({
      where: { id: session.user.studentId },
      data: {
        autoLoginToken: token,
        autoLoginTokenExpiresAt: expiresAt,
      },
    })

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Generate token error:", error)
    return NextResponse.json(
      { error: "토큰 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
