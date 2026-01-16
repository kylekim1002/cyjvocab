import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { CampusManagement } from "@/components/admin/campus-management"
import { prisma } from "@/lib/prisma"

export default async function CampusPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

  const campuses = await prisma.campus.findMany({
    include: {
      teachers: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">캠퍼스/선생님 관리</h1>
        <p className="text-muted-foreground">캠퍼스와 선생님을 관리합니다.</p>
      </div>
      <CampusManagement initialCampuses={campuses} />
    </div>
  )
}
