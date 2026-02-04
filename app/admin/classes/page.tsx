import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { ClassManagement } from "@/components/admin/class-management"
import { prisma } from "@/lib/prisma"
import { Class, Campus, Code, Teacher } from "@prisma/client"

export default async function ClassesPage() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
      return null
    }

    let classes: (Class & { campus: { id: string; name: string } | null; level: Code | null; grade: Code | null; teacher: Teacher | null })[] = []
    let campuses: (Campus & { teachers: Teacher[] })[] = []
    let codes: Code[] = []

    try {
      [classes, campuses, codes] = await Promise.all([
        prisma.class.findMany({
          where: { deletedAt: null },
          include: {
            campus: {
              select: {
                id: true,
                name: true,
              },
            },
            level: true,
            grade: true,
            teacher: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.campus.findMany({
          include: {
            teachers: {
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.code.findMany({
          orderBy: [
            { category: "asc" },
            { order: "asc" },
          ],
        }),
      ])
    } catch (error) {
      console.error("Error fetching classes data:", error)
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">클래스 관리</h1>
          <p className="text-muted-foreground">클래스를 생성하고 관리합니다.</p>
        </div>
        <ClassManagement
          initialClasses={classes}
          campuses={campuses}
          codes={codes}
        />
      </div>
    )
  } catch (error) {
    console.error("Classes page error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">클래스 관리</h1>
          <p className="text-muted-foreground text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    )
  }
}
