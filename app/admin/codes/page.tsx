import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/route"
import { CodeManagement } from "@/components/admin/code-management"
import { prisma } from "@/lib/prisma"

export default async function CodesPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

  const codes = await prisma.code.findMany({
    orderBy: [
      { category: "asc" },
      { order: "asc" },
    ],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">코드값 관리</h1>
        <p className="text-muted-foreground">학년 및 레벨 코드값을 관리합니다.</p>
      </div>
      <CodeManagement initialCodes={codes} />
    </div>
  )
}
