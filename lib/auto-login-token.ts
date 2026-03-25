import { createHash } from "crypto"

/** 자동로그인 URL 토큰(평문)의 DB 저장용 SHA-256(hex). 평문은 발급 API 응답에서만 전달. */
export function hashAutoLoginToken(plainToken: string): string {
  return createHash("sha256").update(plainToken, "utf8").digest("hex")
}
