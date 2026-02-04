import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { LearningManagement } from "@/components/admin/learning-management"
import { prisma } from "@/lib/prisma"
import { LearningModule, Code, LearningItem } from "@prisma/client"

export default async function LearningPage() {
  try {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

    let modules: (LearningModule & { level: Code; grade: Code | null; items: LearningItem[] })[] = []
    let codes: Code[] = []
    
    try {
      [modules, codes] = await Promise.all([
        prisma.learningModule.findMany({
          include: {
            level: true,
            grade: true,
            items: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.code.findMany({
          orderBy: [
            { category: "asc" },
            { order: "asc" },
          ],
        }),
      ])
      console.log("Fetched learning data:", {
        modules: modules.length,
        codes: codes.length,
      })
    } catch (error) {
      console.error("Error fetching learning data:", error)
      // 에러가 발생해도 빈 배열로 계속 진행 (컴포넌트에서 처리)
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">학습 관리</h1>
        <p className="text-muted-foreground">학습 콘텐츠를 등록하고 관리합니다.</p>
      </div>
      <LearningManagement initialModules={modules} codes={codes} />
    </div>
  )
  } catch (error) {
    console.error("Learning page error:", error)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">학습 관리</h1>
          <p className="text-muted-foreground text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      </div>
    )
  }
}
