"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen, BarChart3, Loader2, Settings } from "lucide-react"

const navItems = [
  {
    title: "학습",
    href: "/student",
    icon: BookOpen,
  },
  {
    title: "점수",
    href: "/student/stats",
    icon: BarChart3,
  },
  {
    title: "설정",
    href: "/student/settings",
    icon: Settings,
  },
]

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

  const go = (href: string) => {
    if (pathname === href || pathname.startsWith(href + "/")) return
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const showLoader = pendingHref === item.href && isPending
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
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
  )
}
