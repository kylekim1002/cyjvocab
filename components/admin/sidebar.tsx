"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { UserRole } from "@prisma/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  Trash2,
  LogOut,
  Home,
  Database,
} from "lucide-react"

const menuItems = [
  {
    title: "홈",
    href: "/admin",
    icon: Home,
  },
  {
    title: "코드값 관리",
    href: "/admin/codes",
    icon: Settings,
    superAdminOnly: true,
  },
  {
    title: "관리자 관리",
    href: "/admin/managers",
    icon: Settings,
    superAdminOnly: true,
  },
  {
    title: "캠퍼스/선생님",
    href: "/admin/campus",
    icon: Building2,
  },
  {
    title: "클래스 관리",
    href: "/admin/classes",
    icon: GraduationCap,
  },
  {
    title: "학생 관리",
    href: "/admin/students",
    icon: Users,
  },
  {
    title: "학습 관리",
    href: "/admin/learning",
    icon: BookOpen,
  },
  {
    title: "성적 조회",
    href: "/admin/scores",
    icon: BarChart3,
  },
  {
    title: "데이터 정리",
    href: "/admin/data-cleanup",
    icon: Trash2,
    superAdminOnly: true,
  },
  {
    title: "백업 및 복원",
    href: "/admin/backup",
    icon: Database,
    superAdminOnly: true,
  },
]

interface AdminSidebarProps {
  role: UserRole
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()

  const filteredMenuItems = menuItems.filter(
    (item) => !item.superAdminOnly || role === "SUPER_ADMIN"
  )

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto flex-shrink-0">
      <div className="p-6 border-b flex-shrink-0">
        <h1 className="text-xl font-bold">관리자</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-gray-100"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t flex-shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-5 w-5 mr-3" />
          로그아웃
        </Button>
      </div>
    </aside>
  )
}
