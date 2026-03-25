import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { StudentBottomNav } from "@/components/student/bottom-nav"
import { StudentRoutePrefetch } from "@/components/student/student-route-prefetch"
import { StudentLogoutButton } from "@/components/student/student-logout-button"
import { getActiveStudentBackgroundUrl } from "@/lib/student-app-background"

/** getServerSession → headers() 사용. 빌드 시 정적 프리렌더와 충돌 방지 */
export const dynamic = "force-dynamic"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    console.error("Failed to get student session:", error)
    redirect("/login")
  }

  if (!session) {
    redirect("/login")
  }

  if (!session.user || session.user.role !== "STUDENT") {
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
          <StudentLogoutButton />
        </div>
      </div>
    )
  }

  let backgroundUrl: string | null = null
  try {
    backgroundUrl = await getActiveStudentBackgroundUrl()
  } catch (e) {
    console.error("Student layout: background URL failed:", e)
  }

  return (
    <div className="relative flex flex-col h-screen bg-gray-50">
      {backgroundUrl ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      ) : null}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <StudentRoutePrefetch />
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
        <StudentBottomNav />
      </div>
    </div>
  )
}
