"use client"

import { useEffect, useRef, useState } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { StudentWaitScreen } from "@/components/student/student-wait-screen"

/** 토스트가 닫힌 직후 레이아웃이 안정될 때까지 WAIT 표시 (ms) */
const TOAST_DISMISS_WAIT_MS = 220
/** 오버레이가 남는 경우 방지 */
const TOAST_DISMISS_WAIT_MAX_MS = 800

export function Toaster() {
  const { toasts } = useToast()
  const [toastDismissWait, setToastDismissWait] = useState(false)
  /** 브라우저 타이머 ID (Node `Timeout`과 구분) */
  const dismissWaitClearRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (dismissWaitClearRef.current) {
        clearTimeout(dismissWaitClearRef.current)
      }
    }
  }, [])

  /** 레이아웃 타이머가 어긋나도 WAIT가 무한히 남지 않도록 */
  useEffect(() => {
    if (!toastDismissWait) return
    const t = window.setTimeout(() => setToastDismissWait(false), TOAST_DISMISS_WAIT_MAX_MS)
    return () => clearTimeout(t)
  }, [toastDismissWait])

  return (
    <ToastProvider>
      {toastDismissWait && (
        <StudentWaitScreen
          variant="overlay"
          overlayZClass="z-[600]"
          title="잠깐만 ✨"
          message="알림을 정리하고 있어요."
        />
      )}
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        onOpenChange,
        ...props
      }) {
        return (
          <Toast
            key={id}
            {...props}
            onOpenChange={(open) => {
              onOpenChange?.(open)
              if (!open) {
                if (dismissWaitClearRef.current) {
                  clearTimeout(dismissWaitClearRef.current)
                }
                setToastDismissWait(true)
                dismissWaitClearRef.current = window.setTimeout(() => {
                  setToastDismissWait(false)
                  dismissWaitClearRef.current = null
                }, TOAST_DISMISS_WAIT_MS)
              }
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
