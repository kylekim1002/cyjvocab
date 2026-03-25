import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { signOut } from "next-auth/react"
import { StudentSettings } from "@/components/student/student-settings"
import { prisma } from "@/lib/prisma"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return null
  }

  const row = await prisma.student.findUnique({
    where: { id: session.user.studentId },
    include: {
      campus: true,
      grade: true,
    },
  })

  if (!row) {
    return null
  }

  const student = {
    id: row.id,
    name: row.name,
    username: row.username,
    hasAutoLoginLink: !!row.autoLoginTokenHash,
    campus: row.campus,
    grade: row.grade,
  }

  return <StudentSettings student={student} />
}
