import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { ClassManagement } from "@/components/admin/class-management"
import { prisma } from "@/lib/prisma"

export default async function ClassesPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

  const classes = await prisma.class.findMany({
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
  })

  const campuses = await prisma.campus.findMany({
    include: {
      teachers: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const codes = await prisma.code.findMany({
    orderBy: [
      { category: "asc" },
      { order: "asc" },
    ],
  })

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
}
