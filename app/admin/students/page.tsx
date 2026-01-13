import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { StudentManagement } from "@/components/admin/student-management"
import { prisma } from "@/lib/prisma"

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

  const campuses = await prisma.campus.findMany({
    orderBy: { name: "asc" },
  })

  const gradeCodes = await prisma.code.findMany({
    where: { category: "GRADE" },
    orderBy: { order: "asc" },
  })

  const levelCodes = await prisma.code.findMany({
    where: { category: "LEVEL" },
    orderBy: { order: "asc" },
  })

  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      plainPassword: true,
      status: true,
      school: true,
      autoLoginToken: true,
      createdAt: true,
      campus: {
        select: {
          id: true,
          name: true,
        },
      },
      grade: {
        select: {
          id: true,
          value: true,
        },
      },
      level: {
        select: {
          id: true,
          value: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">학생 관리</h1>
        <p className="text-muted-foreground">학생을 등록하고 관리합니다.</p>
      </div>
      <StudentManagement 
        campuses={campuses} 
        gradeCodes={gradeCodes}
        levelCodes={levelCodes}
        initialStudents={students}
      />
    </div>
  )
}
