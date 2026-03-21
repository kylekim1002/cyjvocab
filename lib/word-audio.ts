/**
 * 학습 문항 word_text와 음원 파일명(확장자 제외)을 동일 규칙으로 정규화해 매칭합니다.
 * - 공백/연속 공백 → 단일 언더스코어
 * - 파일명의 _ 는 공백으로 간주 후 다시 정규화 (예: ice_cream ↔ "ice cream")
 */
export function normalizeWordAudioKey(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return s.replace(/\s+/g, "_")
}

/** 업로드 파일명에서 확장자를 제거한 뒤 키로 사용 */
export function normalizedKeyFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "")
  return normalizeWordAudioKey(base)
}

/** Prisma: 테이블 미생성(P2021 등) 시 관리자에게 안내 */
export function wordAudioTableMissingMessage(raw: string): string {
  const hint =
    " DB에 WordAudio 테이블이 없습니다. Supabase → SQL Editor에서 프로젝트의 scripts/add-word-audio-table.sql 전체를 실행한 뒤 다시 시도하세요."
  if (
    raw.includes("WordAudio") ||
    raw.includes("does not exist") ||
    raw.includes("P2021")
  ) {
    return raw + hint
  }
  return raw
}
