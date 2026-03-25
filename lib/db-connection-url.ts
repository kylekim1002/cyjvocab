/**
 * Supabase Transaction pooler(예: 포트 6543, *.pooler.* 호스트)로 연결할 때
 * Prisma 서버리스 권장: pgbouncer=true, connection_limit=1
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 *
 * 환경 변수에 이미 있으면 덮어쓰지 않습니다.
 */
export function applyPrismaPoolerQueryParams(urlString: string | undefined): string | undefined {
  if (!urlString) return urlString
  try {
    // URL 파싱이 실패하는 경우가 있어(특수문자/인코딩/driver),
    // 먼저 "sslmode"를 문자열 방식으로 보강한 뒤, 가능할 때만 URL로 추가 옵션을 셋업합니다.
    const hasSslMode = urlString.includes("sslmode=")
    const hasPoolerHint =
      urlString.includes("pooler") || urlString.includes("pgbouncer") || urlString.includes(":6543/")
    const hasSupabaseHint =
      urlString.toLowerCase().includes(".supabase.co") || urlString.toLowerCase().includes("supabase.com")

    if (hasSupabaseHint && hasPoolerHint && !hasSslMode) {
      // 쿼리 스트링이 있는지에 따라 & / ? 를 구분해 안전하게 주입
      return urlString + (urlString.includes("?") ? "&" : "?") + "sslmode=require"
    }

    const u = new URL(urlString)
    const host = u.hostname.toLowerCase()
    const isSupabaseHost = host.includes(".supabase.co") || host.includes("supabase.com")

    const isLikelyPooler = u.port === "6543" || host.includes("pooler") || host.includes("pgbouncer")
    if (!isLikelyPooler) return urlString

    if (isSupabaseHost && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require")
    }
    if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true")
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1")
    return u.toString()
  } catch {
    return urlString
  }
}
