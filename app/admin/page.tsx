import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  // 통계 데이터 조회
  const [campusCount, classCount, studentCount, learningCount] = await Promise.all([
    prisma.campus.count(),
    prisma.class.count({ where: { deletedAt: null } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.learningModule.count(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">시스템 현황을 확인하세요.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">캠퍼스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campusCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">클래스</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">학습 콘텐츠</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{learningCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
