"use client"

import { useEffect } from "react"

/**
 * 전역 우클릭 방지.
 * 보안 목적의 "강화"라기보단 UI 방어(컨텍스트 메뉴 노출 방지) 목적입니다.
 */
export function NoRightClick() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // 기본 컨텍스트 메뉴 차단
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener("contextmenu", handler)
    return () => {
      document.removeEventListener("contextmenu", handler)
    }
  }, [])

  return null
}

