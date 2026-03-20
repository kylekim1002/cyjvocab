"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"

export function AdminTopbar() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  return (
    <div className="sticky top-0 z-10 border-b bg-gray-50/80 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-6 py-3 flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={() => {
            setIsRefreshing(true)
            // Next.js router.refresh()는 서버 컴포넌트 재검증은 해도
            // 하위 client 컴포넌트가 상태를 유지하는 구조라 실제 데이터 반영이 안 될 수 있음.
            // 관리자 화면에서는 "브라우저 새로고침과 동일하게" 강제 새로고침으로 맞춥니다.
            window.location.reload()
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {isRefreshing ? "새로고침 중..." : "새로고침"}
        </Button>
      </div>
    </div>
  )
}

