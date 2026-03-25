import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"

/** getServerSession → headers() 사용. 정적 생성 시도 시 빌드 로그에 Dynamic server usage가 반복되는 것을 방지 */
export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error("Failed to get session:", error)
    redirect("/login")
  }

  if (!session || !session.user) {
    redirect("/login")
  }

  const userRole = session.user.role
  if (!userRole || (userRole !== "SUPER_ADMIN" && userRole !== "MANAGER")) {
    redirect("/student")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar role={userRole} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <AdminTopbar />
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
