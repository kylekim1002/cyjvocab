import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { StudentManagement } from "@/components/admin/student-management"
import { prisma } from "@/lib/prisma"
import { Campus, Code, Student } from "@prisma/client"

export default async function StudentsPage() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
      return null
    }

    let campuses: Campus[] = []
    let gradeCodes: Code[] = []
    let levelCodes: Code[] = []
    let students: (Pick<Student, "id" | "name" | "username" | "plainPassword" | "status" | "school" | "autoLoginToken" | "createdAt"> & {
      campus: { id: string; name: string } | null;
      grade: { id: string; value: string } | null;
      level: { id: string; value: string } | null;
    })[] = []

    try {
      [campuses, gradeCodes, levelCodes, students] = await Promise.all([
        prisma.campus.findMany({
          orderBy: { name: "asc" },
        }),
        prisma.code.findMany({
          where: { category: "GRADE" },
          orderBy: { order: "asc" },
        }),
        prisma.code.findMany({
          where: { category: "LEVEL" },
          orderBy: { order: "asc" },
        }),
        prisma.student.findMany({
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
        }),
      ])
    } catch (error) {
      console.error("Error fetching students data:", error)
    }

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
  } catch (error) {
    console.error("Students page error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">학생 관리</h1>
          <p className="text-muted-foreground text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    )
  }
}
