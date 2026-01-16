import { NextResponse } from "next/server"
import { verifyAutoLoginToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "토큰이 필요합니다." },
        { status: 400 }
      )
    }

    const user = await verifyAutoLoginToken(token)

    if (!user) {
      return NextResponse.json(
        { error: "유효하지 않은 토큰입니다." },
        { status: 401 }
      )
    }

    // 학생 상태 확인
    if (user.studentStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "INACTIVE" },
        { status: 403 }
      )
    }

    // 클래스 배정 확인은 제거 (학생이 클래스 배정 전에도 자동 로그인 가능하도록)
    // 클래스 배정이 없어도 로그인은 가능하지만, 학습 기능은 제한됨

    return NextResponse.json({
      username: user.username,
      id: user.id,
      token: token, // 토큰도 반환
    })
  } catch (error) {
    console.error("Auto login error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
