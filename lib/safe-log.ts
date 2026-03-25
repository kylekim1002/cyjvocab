/** 프로덕션에서 민감 정보가 로그로 남지 않도록 — 개발 시에만 상세 로그 */
export const isDev = process.env.NODE_ENV === "development"

export function devLog(...args: unknown[]): void {
  if (isDev) console.log(...args)
}
