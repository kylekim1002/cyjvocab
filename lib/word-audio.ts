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
