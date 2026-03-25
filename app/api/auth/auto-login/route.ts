import { NextResponse } from "next/server"
import {
  verifyAutoLoginToken,
  getAutoLoginCandidateByToken,
  isAutoLoginLocked,
  recordAutoLoginAttemptAndCheckLock,
} from "@/lib/auth"
import { checkAutoLoginIpRateLimit } from "@/lib/rate-limit-ip"

export async function POST(request: Request) {
  try {
    if (!(await checkAutoLoginIpRateLimit(request))) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      )
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "토큰이 필요합니다." },
        { status: 400 }
      )
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      undefined

    const candidate = await getAutoLoginCandidateByToken(token)
    if (candidate?.userId) {
      const locked = await isAutoLoginLocked(candidate.userId)
      if (locked) {
        return NextResponse.json(
          { error: "로그인 횟수로 인해 10분간 정지됩니다." },
          { status: 429 }
        )
      }

      const shouldLockNow = await recordAutoLoginAttemptAndCheckLock(
        candidate.userId,
        ipAddress
      )
      if (shouldLockNow) {
        return NextResponse.json(
          { error: "로그인 횟수로 인해 10분간 정지됩니다." },
          { status: 429 }
        )
      }
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
    })
  } catch (error) {
    console.error("Auto login error:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
