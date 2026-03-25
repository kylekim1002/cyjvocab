/**
 * 학생 구간 전환·처리 대기 — 라우트 로딩 / 오버레이 공통 (귀여운 톤)
 */
export function StudentWaitScreen({
  title,
  message,
  variant = "page",
  overlayZClass = "z-[200]",
}: {
  /** 큰 제목 (기본: 귀여운 대기 문구) */
  title?: string
  /** 부가 설명 */
  message?: string
  variant?: "page" | "overlay"
  /** overlay일 때 z-index (학습 화면은 더 위로) */
  overlayZClass?: string
}) {
  const headline = title ?? "조금만 기다려줘 ✨"
  const sub =
    message ?? "열심히 준비하고 있어요. 조금만 기다려 주세요."

  const body = (
    <div className="flex max-w-sm flex-col items-center gap-4 text-center">
      <div className="text-5xl leading-none" aria-hidden>
        <span className="inline-block animate-bounce">🐾</span>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{headline}</p>
        <p className="text-sm leading-relaxed text-muted-foreground px-1">{sub}</p>
      </div>
      <div className="flex items-center gap-1.5 pt-1" aria-hidden>
        <span className="inline-block h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.2s]" />
        <span className="inline-block h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.1s]" />
        <span className="inline-block h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
      </div>
    </div>
  )

  if (variant === "overlay") {
    return (
      <div
        className={`fixed inset-0 ${overlayZClass} flex flex-col items-center justify-center bg-gradient-to-b from-violet-50/95 via-background/95 to-background/95 backdrop-blur-sm`}
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        aria-label={headline}
      >
        {body}
      </div>
    )
  }

  return (
    <div
      className="flex min-h-[calc(100vh-6rem)] w-full flex-col items-center justify-center bg-gradient-to-b from-violet-50/80 to-gray-50 px-4 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={headline}
    >
      {body}
    </div>
  )
}
