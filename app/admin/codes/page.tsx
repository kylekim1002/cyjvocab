import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { CodeManagement } from "@/components/admin/code-management"
import { prisma } from "@/lib/prisma"
import { Code } from "@prisma/client"

export default async function CodesPage() {
  try {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

    let codes: Code[] = []
    try {
      codes = await prisma.code.findMany({
    orderBy: [
      { category: "asc" },
      { order: "asc" },
    ],
  })
    } catch (error) {
      console.error("Error fetching codes:", error)
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">코드값 관리</h1>
        <p className="text-muted-foreground">학년 및 레벨 코드값을 관리합니다.</p>
      </div>
      <CodeManagement initialCodes={codes} />
    </div>
  )
  } catch (error) {
    console.error("Codes page error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">코드값 관리</h1>
          <p className="text-muted-foreground text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    )
  }
}
