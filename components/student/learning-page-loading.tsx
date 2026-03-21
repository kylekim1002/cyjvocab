/** 학습 본문 청크 로딩 (서버에서도 사용 가능한 마크업만) */
export function LearningPageLoading() {
  return (
    <div className="container mx-auto p-4 flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">학습을 불러오는 중…</p>
      <div className="mt-4 h-40 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
