import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DataCleanupManagement } from "@/components/admin/data-cleanup-management"

export default async function DataCleanupPage() {
  try {
    const session = await getServerSession(authOptions)

    // SUPER_ADMIN만 접근 가능
    if (!session || session.user.role !== "SUPER_ADMIN") {
      redirect("/admin")
    }

    let campuses = []
    try {
      campuses = await prisma.campus.findMany({
        orderBy: { name: "asc" },
      })
    } catch (error) {
      console.error("Error fetching campuses:", error)
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">데이터 정리</h1>
          <p className="text-muted-foreground">과거 학습 및 성적 데이터를 기간 기준으로 삭제할 수 있습니다. 삭제된 데이터는 복구되지 않습니다.</p>
        </div>
        <DataCleanupManagement campuses={campuses} />
      </div>
    )
  } catch (error) {
    console.error("Data cleanup page error:", error)
    redirect("/admin")
  }
}
