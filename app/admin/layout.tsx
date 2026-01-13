import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER") {
    redirect("/student")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar role={session.user.role} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
