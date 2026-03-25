import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { StudentBackgroundManagement } from "@/components/admin/student-background-management"

export default async function StudentBackgroundAdminPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/login")
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">학생 앱 배경</h1>
        <p className="text-muted-foreground mt-1">
          전역에서 활성화할 수 있는 배경은 한 번에 하나뿐입니다. 모두 끄면 학생 화면은 이전과 동일한 기본 레이아웃만
          보입니다.
        </p>
      </div>
      <StudentBackgroundManagement />
    </div>
  )
}
