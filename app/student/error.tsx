"use client"

/**
 * 학생 영역 서버 오류 시 Next 기본 문구 대신 안내 (원인: DB 연결/스키마/다른 프로젝트 등)
 */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const anyErr = error as any
  const errorMessage = typeof error?.message === "string" ? error.message : ""
  const errorName = typeof anyErr?.name === "string" ? anyErr.name : ""
  const errorCode = typeof anyErr?.code === "string" ? anyErr.code : ""
  const causeMessage =
    typeof anyErr?.cause?.message === "string" ? anyErr.cause.message : ""

  const compactDetails = [errorName && `name=${errorName}`, errorCode && `code=${errorCode}`, errorMessage && `message=${errorMessage}`, causeMessage && `cause=${causeMessage}`]
    .filter(Boolean)
    .join(" | ")

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">학생 홈을 불러오지 못했습니다.</p>
      <p className="max-w-md text-sm text-muted-foreground">
        데이터베이스 연결 문제이거나, 배포 환경의 DB가 비어 있을 수 있습니다. Vercel
        환경 변수의 <code className="rounded bg-muted px-1">DATABASE_URL</code>이
        예전에 쓰던 Supabase 프로젝트와 같은지 확인해 주세요.
      </p>
      {compactDetails && (
        <p className="max-w-xl break-words font-mono text-[11px] text-muted-foreground">
          {compactDetails}
        </p>
      )}
      {error.digest != null && (
        <p className="font-mono text-xs text-muted-foreground">
          Digest: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        다시 시도
      </button>
    </div>
  )
}
