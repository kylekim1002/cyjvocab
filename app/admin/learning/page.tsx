import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { LearningManagement } from "@/components/admin/learning-management"
import { prisma } from "@/lib/prisma"

export default async function LearningPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return null
  }

  const modules = await prisma.learningModule.findMany({
    include: {
      level: true,
      grade: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const codes = await prisma.code.findMany({
    orderBy: [
      { category: "asc" },
      { order: "asc" },
    ],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">학습 관리</h1>
        <p className="text-muted-foreground">학습 콘텐츠를 등록하고 관리합니다.</p>
      </div>
      <LearningManagement initialModules={modules} codes={codes} />
    </div>
  )
}
