import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { AdminManagers } from "@/components/admin/managers"

export default async function ManagersPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin")
  }

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    include: { campus: true },
    orderBy: { createdAt: "desc" },
  })

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <AdminManagers
      initialManagers={managers.map((m) => ({
        id: m.id,
        username: m.username,
        name: m.name,
        role: m.role,
        isActive: m.isActive,
        campusId: m.campusId,
        campusName: m.campus?.name || null,
        createdAt: m.createdAt.toISOString(),
      }))}
      campuses={campuses.map((c) => ({
        id: c.id,
        name: c.name,
      }))}
    />
  )
}

