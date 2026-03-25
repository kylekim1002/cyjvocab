/**
 * /api/auth/auto-login 공개 엔드포인트용 IP 기반 제한.
 * - 프로덕션: Upstash Redis(전역, 서버리스 인스턴스 간 공유) — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
 * - 미설정 시: 인스턴스별 메모리(로컬/폴백)
 */
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 40

const buckets = new Map<string, number[]>()

let edgeRatelimit: Ratelimit | null = null

function getEdgeRatelimit(): Ratelimit | null {
  if (edgeRatelimit) return edgeRatelimit
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  edgeRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS_PER_WINDOW, "1 m"),
    prefix: "ratelimit:auto-login-ip",
  })
  return edgeRatelimit
}

export function getClientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for")
  if (xf) {
    const first = xf.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

/** 인메모리(인스턴스 로컬) — Upstash 미설정 시 */
function checkAutoLoginIpRateLimitMemory(request: Request): boolean {
  const ip = getClientIpFromRequest(request)
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  let arr = buckets.get(ip) || []
  arr = arr.filter((t) => t > windowStart)
  if (arr.length >= MAX_REQUESTS_PER_WINDOW) {
    buckets.set(ip, arr)
    return false
  }
  arr.push(now)
  buckets.set(ip, arr)
  return true
}

/** true = 허용, false = 제한 */
export async function checkAutoLoginIpRateLimit(
  request: Request
): Promise<boolean> {
  const rl = getEdgeRatelimit()
  if (!rl) {
    return checkAutoLoginIpRateLimitMemory(request)
  }
  try {
    const ip = getClientIpFromRequest(request)
    const { success } = await rl.limit(ip)
    return success
  } catch (error) {
    // Upstash 장애/네트워크 오류 시 로그인 자체가 500으로 실패하지 않도록 메모리 폴백
    console.error("Upstash rate limit failed, fallback to memory:", error)
    return checkAutoLoginIpRateLimitMemory(request)
  }
}
