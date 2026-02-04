import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ScoresManagement } from "@/components/admin/scores-management"
import { Campus, Code } from "@prisma/client"

export default async function ScoresPage() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
      redirect("/admin")
    }

    let campuses: Campus[] = []
    let codes: Code[] = []

    try {
      [campuses, codes] = await Promise.all([
        prisma.campus.findMany({
          orderBy: { name: "asc" },
        }),
        prisma.code.findMany({
          orderBy: [
            { category: "asc" },
            { order: "asc" },
          ],
        }),
      ])
    } catch (error) {
      console.error("Error fetching scores data:", error)
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">성적 조회</h1>
          <p className="text-muted-foreground">학생들의 학습 결과를 날짜·학습별로 조회하고 엑셀로 다운로드할 수 있습니다.</p>
        </div>
        <ScoresManagement campuses={campuses} codes={codes} />
      </div>
    )
  } catch (error) {
    console.error("Scores page error:", error)
    redirect("/admin")
  }
}
