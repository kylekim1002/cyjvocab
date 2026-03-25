import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateAutoLoginToken(): string {
  return crypto.randomUUID()
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 모바일·표에서 줄바꿈 없이 보이도록 짧은 날짜 (예: 2026.03.21) */
export function formatDateCompact(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

/** 짧은 날짜 + 시:분 (예: 2026.03.21 14:30) */
export function formatDateTimeCompact(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${formatDateCompact(d)} ${h}:${min}`
}
