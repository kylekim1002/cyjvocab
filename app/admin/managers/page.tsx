import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { AdminManagers } from "@/components/admin/managers"
import { User, Campus } from "@prisma/client"

export default async function ManagersPage() {
  try {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin")
  }

    let managers: (User & { campus: Campus | null })[] = []
    let campuses: Campus[] = []

    try {
      [managers, campuses] = await Promise.all([
        prisma.user.findMany({
    where: { role: "MANAGER" },
    include: { campus: true },
    orderBy: { createdAt: "desc" },
        }),
        prisma.campus.findMany({
    orderBy: { name: "asc" },
        }),
      ])
    } catch (error) {
      console.error("Error fetching managers data:", error)
    }

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
  } catch (error) {
    console.error("Managers page error:", error)
    redirect("/admin")
  }
}

