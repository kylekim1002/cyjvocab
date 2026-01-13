"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { BookOpen, BarChart3, Settings } from "lucide-react"

const navItems = [
  {
    title: "학습",
    href: "/student",
    icon: BookOpen,
  },
  {
    title: "통계",
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-primary" : "text-gray-500"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
