import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PATCH(
  request: Request,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions)

  // 운영 환경 보안 강화를 위해 인증 + SUPER_ADMIN 권한을 필수로 강제
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const targetUsername = params.username?.trim()
    const { password } = await request.json()

    if (!targetUsername) {
      return NextResponse.json(
        { error: "유효한 사용자명이 필요합니다." },
        { status: 400 }
      )
    }

    if (!password || !password.trim() || password.trim().length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username: targetUsername },
    })

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10)

    await prisma.user.update({
      where: { username: targetUsername },
      data: {
        password: hashedPassword,
        isActive: true, // 비밀번호 업데이트 시 활성 상태 보장
      },
    })

    console.log(`Password updated by SUPER_ADMIN for user: ${targetUsername}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update password error:", error)
    return NextResponse.json(
      { error: "비밀번호 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
}
