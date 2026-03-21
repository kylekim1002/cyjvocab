/**
 * 학습 중 음원 URL 재사용·프리로드로 클릭~재생 지연을 줄입니다.
 */
const audioElCache = new Map<string, HTMLAudioElement>()

function getOrCreateAudio(url: string): HTMLAudioElement {
  let el = audioElCache.get(url)
  if (!el) {
    el = new Audio()
    el.preload = "auto"
    el.src = url
    audioElCache.set(url, el)
  }
  return el
}

/** 다음 재생을 위해 미리 로드 (네트워크만 유도, 재생은 안 함) */
export function preloadAudioUrl(url: string | undefined | null): void {
  if (!url || typeof url !== "string") return
  try {
    getOrCreateAudio(url).load()
  } catch {
    /* ignore */
  }
}

/** 여러 URL 프리로드 (현재·다음 문항 등) */
export function preloadAudioUrls(urls: Array<string | undefined | null>): void {
  for (const u of urls) preloadAudioUrl(u ?? undefined)
}

/** 캐시된 Audio로 재생 (없으면 생성) */
export function playAudioFromPool(url: string | undefined | null): Promise<void> {
  if (!url || typeof url !== "string") {
    return Promise.reject(new Error("no url"))
  }
  const el = getOrCreateAudio(url)
  el.currentTime = 0
  return el.play()
}
