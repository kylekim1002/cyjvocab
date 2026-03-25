"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

/**
 * 토스트 닫기(X·자동 닫힘) 시 전체 화면 대기 오버레이를 쓰지 않습니다.
 * 오버레이 + router.refresh() 등이 겹치면 불필요한 재렌더·RSC 재검증이 반복되는 것처럼 느껴질 수 있습니다.
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, onOpenChange, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            onOpenChange={(open) => {
              onOpenChange?.(open)
            }}
          >
            <div className="grid min-w-0 flex-1 gap-1 pr-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
