import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { AdminSidebar } from "@/components/admin/sidebar"

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
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
