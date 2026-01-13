import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
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

  // 각 모듈별 세션 정보 조회 (진행률 및 최고점 계산용)
  // 같은 날짜의 모든 assignment를 포함하여 조회 (기존 progress 보존)
  const allAssignmentIds = allAssignments.map(a => a.id)
  const moduleIds = assignments.flatMap(a => a.modules.map(m => m.module.id))

  // assignmentId + moduleId 조합으로 progress 저장 (동일 학습 재제출 시 구분)
  const modulePhaseProgress: Record<string, {
    wordListProgress: number // 단어목록 진행률
    memorizationProgress: number // 암기학습 진행률
    testScore: number | null // 테스트 최고점
  }> = {}

  if (allAssignmentIds.length > 0 && moduleIds.length > 0) {
    // 같은 날짜의 모든 assignment의 세션 조회 (기존 progress 포함)
    const allSessions = await prisma.studySession.findMany({
      where: {
        studentId: session.user.studentId,
        assignmentId: { in: allAssignmentIds },
        moduleId: { in: moduleIds },
      },
      select: {
        assignmentId: true,
        moduleId: true,
        status: true,
        score: true,
      },
    })

    // 모든 assignment의 progress 조회 (같은 날짜의 모든 assignment 포함)
    const allProgress = await prisma.studentAssignmentProgress.findMany({
      where: {
        studentId: session.user.studentId,
        assignmentId: { in: allAssignmentIds },
        moduleId: { in: moduleIds },
      },
    })

    // 각 assignment별 모듈별 진행률 계산
    // 동일한 학습이라도 다른 assignment에 배정되면 별도로 관리 (재제출 가능)
    for (const assignment of assignments) {
      for (const mod of assignment.modules) {
        const moduleId = mod.module.id
        // assignmentId + moduleId 조합으로 키 생성 (동일 학습 재제출 시 구분)
        const progressKey = `${assignment.id}_${moduleId}`
        
        // 현재 assignment의 해당 모듈에 대한 progress만 조회
        const moduleProgress = allProgress.find(
          p => p.moduleId === moduleId && p.assignmentId === assignment.id
        )
        
        // 현재 assignment의 해당 모듈에 대한 세션만 조회
        const moduleSessions = allSessions.filter(
          s => s.moduleId === moduleId && s.assignmentId === assignment.id
        )
        
        // 단어목록 진행률: 현재 assignment의 progress만 사용
        const wordListProgress = moduleProgress?.wordlistProgressPct || 0
        
        // 암기학습 진행률: 현재 assignment의 progress만 사용
        const memorizationProgress = moduleProgress?.memorizeProgressPct || 0
        
        // 테스트 최고점: 현재 assignment의 세션 중 최고점
        const completedSessions = moduleSessions.filter(
          s => s.status === "COMPLETED" && s.score !== null && s.score !== undefined
        )
        const testScore = completedSessions.length > 0
          ? Math.max(...completedSessions.map(s => s.score!))
          : null

        // assignmentId + moduleId 조합으로 저장 (동일 학습 재제출 시 구분)
        modulePhaseProgress[progressKey] = {
          wordListProgress,
          memorizationProgress,
          testScore,
        }
      }
    }
  }

  return <StudentHomeContent assignments={assignments} modulePhaseProgress={modulePhaseProgress} />
}
