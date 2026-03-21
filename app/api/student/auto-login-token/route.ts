import { NextResponse } from "next/server"

/**
 * 자동로그인 토큰 재발급은 관리자 전용입니다.
 * 학생은 POST로 토큰을 생성/재생성할 수 없습니다.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "자동로그인 링크 재발급은 관리자만 가능합니다. 캠퍼스에 문의해 주세요.",
    },
    { status: 403 }
  )
}
