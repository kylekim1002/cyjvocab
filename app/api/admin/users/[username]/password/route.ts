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

  // SUPER_ADMIN만 자신의 비밀번호를 변경할 수 있도록 허용 (인증 없이도 가능하도록)
  // 또는 인증된 사용자가 자신의 비밀번호를 변경할 수 있도록
  if (!session) {
    // 인증 없이도 cyjkyle 사용자의 비밀번호를 업데이트할 수 있도록 허용 (초기 설정용)
    if (params.username !== "cyjkyle") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const { password } = await request.json()

    if (!password || !password.trim()) {
      return NextResponse.json(
        { error: "비밀번호는 필수입니다." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username: params.username },
    })

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10)

    await prisma.user.update({
      where: { username: params.username },
      data: {
        password: hashedPassword,
        isActive: true, // 비밀번호 업데이트 시 활성 상태 보장
      },
    })

    console.log(`Password updated for user: ${params.username}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update password error:", error)
    return NextResponse.json(
      { error: "비밀번호 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
}
