"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** 하단 탭 등으로 자주 이동하는 학생 구간 URL을 미리 받아 두어 전환 체감 개선 */
const PREFETCH_HREFS = ["/student", "/student/stats", "/student/settings"] as const

export function StudentRoutePrefetch() {
  const router = useRouter()

  useEffect(() => {
    PREFETCH_HREFS.forEach((href) => {
      router.prefetch(href)
    })
  }, [router])

  return null
}
