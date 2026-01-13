import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { StudentBottomNav } from "@/components/student/bottom-nav"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/admin")
  }

  // 학생 상태 확인
  if (session.user.studentStatus !== "ACTIVE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">캠퍼스로 문의하세요</h1>
        </div>
      </div>
    )
  }

  // 클래스 배정 확인
  if (!session.user.hasActiveClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">캠퍼스로 문의하세요(반 배정 필요)</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <StudentBottomNav />
    </div>
  )
}
