/** 관리자 하위 페이지 전환 시 즉시 스켈레톤 — RSC 대기 중 빈 화면 완화 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="불러오는 중">
      <div className="h-9 w-48 rounded-md bg-muted" />
      <div className="h-5 w-full max-w-md rounded-md bg-muted" />
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="h-36 rounded-md bg-muted/70" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-10 rounded-md bg-muted/50" />
          <div className="h-10 rounded-md bg-muted/50" />
        </div>
      </div>
    </div>
  )
}
