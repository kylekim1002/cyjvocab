import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { CampusManagement } from "@/components/admin/campus-management"
import { prisma } from "@/lib/prisma"
import { Campus, Teacher } from "@prisma/client"

export default async function CampusPage() {
  try {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

    let campuses: (Campus & { teachers: Teacher[] })[] = []
    try {
      campuses = await prisma.campus.findMany({
    include: {
      teachers: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })
    } catch (error) {
      console.error("Error fetching campuses:", error)
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">캠퍼스/선생님 관리</h1>
        <p className="text-muted-foreground">캠퍼스와 선생님을 관리합니다.</p>
      </div>
      <CampusManagement initialCampuses={campuses} />
    </div>
  )
  } catch (error) {
    console.error("Campus page error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">캠퍼스/선생님 관리</h1>
          <p className="text-muted-foreground text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    )
  }
}
