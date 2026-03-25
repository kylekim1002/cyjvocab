"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen, BarChart3, Loader2, Settings } from "lucide-react"

/** /student는 다른 하위 경로(/student/stats 등)의 접두어이므로, 학습 탭만 별도로 판별 */
function isLearningSection(pathname: string): boolean {
  if (pathname === "/student" || pathname === "/student/") return true
  if (pathname.startsWith("/student/learn")) return true
  if (pathname.startsWith("/student/wrong")) return true
  return false
}

function isStatsSection(pathname: string): boolean {
  return pathname === "/student/stats" || pathname.startsWith("/student/stats/")
}

function isSettingsSection(pathname: string): boolean {
  return pathname === "/student/settings" || pathname.startsWith("/student/settings/")
}

const navItems = [
  {
    title: "학습",
    href: "/student",
    icon: BookOpen,
    isActive: isLearningSection,
  },
  {
    title: "점수",
    href: "/student/stats",
    icon: BarChart3,
    isActive: isStatsSection,
  },
  {
    title: "설정",
    href: "/student/settings",
    icon: Settings,
    isActive: isSettingsSection,
  },
] as const

export function StudentBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending) {
      setPendingHref(null)
    }
  }, [isPending, pathname])

  const go = (href: (typeof navItems)[number]["href"], isActiveOnPath: (p: string) => boolean) => {
    if (isActiveOnPath(pathname)) return
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  const showNavLoading = isPending && pendingHref !== null

  return (
    <>
      {showNavLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed bottom-16 left-0 right-0 z-[45] flex justify-center px-4 pointer-events-none"
        >
          <div className="flex max-w-md items-center gap-2 rounded-lg bg-gray-900/90 px-4 py-2.5 text-sm text-white shadow-lg">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>페이지를 불러오는 중입니다. 잠시만 기다려 주세요.</span>
          </div>
        </div>
      ) : null}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.isActive(pathname)
            const showLoader = pendingHref === item.href && isPending
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href, item.isActive)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive ? "text-primary" : "text-gray-500"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-busy={showLoader}
              >
                {showLoader ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                ) : (
                  <Icon className="h-6 w-6" />
                )}
                <span className="text-xs">{showLoader ? "잠깐…" : item.title}</span>
              </button>
            )
          })}
          <div className="flex items-center justify-center">
            <div className="h-9 w-20 overflow-hidden">
              <img
                src="/jr-logo.png"
                alt="정이솜 주니어 영어학습원"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
