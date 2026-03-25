/**
 * 이미지 풀 매칭 키는 음원 풀과 동일 규칙(word_text ↔ 파일명)을 사용합니다.
 */
export { normalizeWordAudioKey, normalizedKeyFromFilename } from "./word-audio"

/** Prisma: WordImage 테이블 미생성 시 관리자 안내 */
export function wordImageTableMissingMessage(raw: string): string {
  const hint =
    " DB에 WordImage 테이블이 없습니다. Supabase → SQL Editor에서 프로젝트의 scripts/add-word-image-table.sql 전체를 실행한 뒤 다시 시도하세요."
  if (
    raw.includes("WordImage") ||
    raw.includes("does not exist") ||
    raw.includes("P2021")
  ) {
    return raw + hint
  }
  return raw
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif", "bmp"])

export function safeImageExtension(filename: string): string | null {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  const e = m?.[1] || ""
  if (!ALLOWED_EXT.has(e)) return null
  return e === "jpeg" ? "jpg" : e
}

export function contentTypeForImageExt(ext: string): string {
  switch (ext) {
    case "jpg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "webp":
      return "image/webp"
    case "gif":
      return "image/gif"
    case "heic":
      return "image/heic"
    case "heif":
      return "image/heif"
    case "avif":
      return "image/avif"
    case "bmp":
      return "image/bmp"
    default:
      return "application/octet-stream"
  }
}
