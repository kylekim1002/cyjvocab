import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { StudentHomeContent } from "@/components/student/home-content"
import { Card, CardContent } from "@/components/ui/card"

export default async function StudentHomePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return null
  }

  // 학생 정보 및 현재 배정 클래스 확인
  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId },
    include: {
      studentClasses: {
        where: {
          endAt: null, // 현재 배정된 클래스만
        },
        include: {
          class: true,
        },
      },
    },
  })

  if (!student || student.status !== "ACTIVE") {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            활성 상태가 아니거나 클래스에 배정되지 않았습니다. 캠퍼스로 문의하세요.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (student.studentClasses.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            현재 배정된 클래스가 없습니다. 캠퍼스로 문의하세요.
          </CardContent>
        </Card>
      </div>
    )
  }

  // 학기/레벨 코드값(학생이 직접 추가할 때 사용할 드롭다운 데이터)
  const [semesterCodes, levelCodes] = await Promise.all([
    prisma.code.findMany({
      where: { category: "SEMESTER" },
      orderBy: { order: "asc" },
      select: { id: true, value: true, category: true },
    }),
    prisma.code.findMany({
      where: { category: "LEVEL" },
      orderBy: { order: "asc" },
      select: { id: true, value: true, category: true },
    }),
  ])

  // 현재 배정된 클래스 ID 목록
  const currentClassIds = student.studentClasses.map((sc) => sc.classId)

  // 학생의 배정된 학습 조회 (현재 배정된 클래스의 assignment만)
  const allAssignments = await prisma.classAssignment.findMany({
    where: {
      classId: { in: currentClassIds },
      class: {
        deletedAt: null,
      },
    },
    include: {
      modules: {
        include: {
          module: true,
        },
        orderBy: {
          order: "asc",
        },
      },
      progress: {
        where: {
          studentId: session.user.studentId,
        },
      },
    },
    orderBy: {
      assignedDate: "asc",
    },
  })

  // 같은 날짜 + 같은 클래스의 assignment를 하나로 합치기 (중복 방지)
  // progress가 있는 assignment를 우선적으로 사용하여 기존 학습 데이터 보존
  const assignmentMap = new Map<string, typeof allAssignments[0]>()
  
  allAssignments.forEach((assignment) => {
    // 날짜와 클래스 ID를 키로 사용
    const dateKey = `${assignment.classId}_${assignment.assignedDate.toISOString().split('T')[0]}`
    const existing = assignmentMap.get(dateKey)
    
    if (!existing) {
      // 첫 번째 assignment는 그대로 사용
      assignmentMap.set(dateKey, assignment)
    } else {
      // progress가 더 많은 assignment를 우선 사용 (기존 학습 데이터 보존)
      const existingProgressCount = existing.progress.length
      const newProgressCount = assignment.progress.length
      
      // 새 assignment에 progress가 더 많거나, 기존 assignment에 progress가 없으면 교체
      if (newProgressCount > existingProgressCount || existingProgressCount === 0) {
        // 기존 assignment의 모듈과 progress를 새 assignment에 병합
        const existingModuleIds = new Set(assignment.modules.map(m => m.moduleId))
        const modulesToAdd = existing.modules.filter(m => !existingModuleIds.has(m.moduleId))
        
        if (modulesToAdd.length > 0) {
          assignment.modules = [...assignment.modules, ...modulesToAdd].sort((a, b) => a.order - b.order)
        }
        
        // progress 병합 (같은 moduleId는 새 것을 우선)
        const newProgressModuleIds = new Set(assignment.progress.map(p => p.moduleId))
        const progressToAdd = existing.progress.filter(p => !newProgressModuleIds.has(p.moduleId))
        
        if (progressToAdd.length > 0) {
          assignment.progress = [...assignment.progress, ...progressToAdd]
        }
        
        assignmentMap.set(dateKey, assignment)
      } else {
        // 기존 assignment를 유지하고 새 모듈만 추가
        const existingModuleIds = new Set(existing.modules.map(m => m.moduleId))
        const newModules = assignment.modules.filter(m => !existingModuleIds.has(m.moduleId))
        
        if (newModules.length > 0) {
          existing.modules = [...existing.modules, ...newModules].sort((a, b) => a.order - b.order)
        }
      }
    }
  })

  const assignments = Array.from(assignmentMap.values())

  // 학기·레벨 드롭다운은 코드 전체를 보여 검색·탐색이 가능하게 함.
  // 실제 배정은 POST /api/student/calendar/assignments/add 에서
  // 선택 레벨과 일치하는 학생 클래스가 있는지 검증함.
  const filteredSemesterCodes = semesterCodes.map((c) => ({ id: c.id, value: c.value }))
  const filteredLevelCodesNormalized = levelCodes.map((c) => ({ id: c.id, value: c.value }))

  return (
    <StudentHomeContent
      assignments={assignments}
      semesterCodes={filteredSemesterCodes}
      levelCodes={filteredLevelCodesNormalized}
    />
  )
}
