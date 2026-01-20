"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

interface Assignment {
  id: string
  assignedDate: Date
  modules: Array<{
    id: string
    module: {
      id: string
      title: string
      type: string
    }
    order: number
  }>
  progress: Array<{
    moduleId: string
    progressPct: number
    completed: boolean
  }>
}

interface PhaseProgress {
  wordListProgress: number
  memorizationProgress: number
  testScore: number | null
}

interface StudentHomeContentProps {
  assignments: Assignment[]
  modulePhaseProgress?: Record<string, PhaseProgress> // key: assignmentId_moduleId
}

export function StudentHomeContent({ assignments: initialAssignments, modulePhaseProgress = {} }: StudentHomeContentProps) {
  const [showAll, setShowAll] = useState(false)

  // 완료 여부 계산
  const assignmentsWithProgress = initialAssignments.map((assignment) => {
    const moduleProgresses = assignment.modules.map((mod) => {
      const progress = assignment.progress.find((p) => p.moduleId === mod.module.id)
      // assignmentId + moduleId 조합으로 progress 조회 (동일 학습 재제출 시 구분)
      const progressKey = `${assignment.id}_${mod.module.id}`
      const phaseProgress = modulePhaseProgress[progressKey] || {
        wordListProgress: 0,
        memorizationProgress: 0,
        testScore: null,
      }
      
      // 단어목록, 암기학습, 테스트 모두 완료되었는지 확인
      // 새로 등록한 학습은 progress가 없으므로 완료로 표시되지 않음
      const wordListCompleted = phaseProgress.wordListProgress >= 100
      const memorizationCompleted = phaseProgress.memorizationProgress >= 100
      const testCompleted = phaseProgress.testScore !== null && phaseProgress.testScore !== undefined
      
      // 실제로 학습을 시작했는지 확인 (progress가 있거나 세션이 있어야 함)
      const hasStarted = progress !== undefined || 
                        wordListCompleted || 
                        memorizationCompleted || 
                        testCompleted
      
      return {
        ...mod,
        progressPct: progress?.progressPct || 0,
        completed: progress?.completed || false,
        wordListCompleted,
        memorizationCompleted,
        testCompleted,
        hasStarted, // 학습 시작 여부
      }
    })

    const avgProgress = moduleProgresses.length > 0
      ? Math.round(
          moduleProgresses.reduce((sum, p) => sum + p.progressPct, 0) /
            moduleProgresses.length
        )
      : 0

    // 같은 날짜의 모든 모듈이 완료되었는지 확인
    // 한 가지라도 완료되지 않았다면 완료로 표시하지 않음
    const allModulesCompleted = moduleProgresses.length > 0 &&
      moduleProgresses.every((p) => 
        p.wordListCompleted && p.memorizationCompleted && p.testCompleted
      )

    return {
      ...assignment,
      moduleProgresses,
      avgProgress,
      allCompleted: allModulesCompleted, // 같은 날짜의 모든 학습이 완료되어야 완료
    }
  })

  // 필터링
  const filteredAssignments = showAll
    ? assignmentsWithProgress
    : assignmentsWithProgress.filter((a) => !a.allCompleted)

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">학습 홈</h1>
        <div className="flex items-center gap-2">
          <Switch
            id="show-all"
            checked={showAll}
            onCheckedChange={(checked) => {
              console.log("Show all toggled:", checked)
              setShowAll(checked)
            }}
          />
          <Label htmlFor="show-all" className="cursor-pointer" onClick={() => setShowAll(!showAll)}>
            모두 보기
          </Label>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {showAll ? "배정된 학습이 없습니다." : "완료하지 않은 학습이 없습니다."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <CardTitle>{formatDate(assignment.assignedDate)}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignment.moduleProgresses.map((mod) => {
                    // assignmentId + moduleId 조합으로 progress 조회 (동일 학습 재제출 시 구분)
                    const progressKey = `${assignment.id}_${mod.module.id}`
                    const phaseProgress = modulePhaseProgress[progressKey] || {
                      wordListProgress: 0,
                      memorizationProgress: 0,
                      testScore: null,
                    }

                    return (
                      <div key={mod.id} className="space-y-2">
                        <p className="font-medium text-lg">{mod.module.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 단어목록 버튼 */}
                          <div className="flex items-center gap-2">
                            <Link href={`/student/learn/${assignment.id}/${mod.module.id}?phase=wordlist`}>
                              <Button size="sm" variant="outline" className="h-8">
                                단어목록
                              </Button>
                            </Link>
                            <span className="text-sm text-muted-foreground">
                              진행률 {phaseProgress.wordListProgress}%
                            </span>
                          </div>

                          <div className="w-px h-6 bg-gray-300"></div>

                          {/* 암기학습 버튼 */}
                          <div className="flex items-center gap-2">
                            <Link href={`/student/learn/${assignment.id}/${mod.module.id}?phase=memorization`}>
                              <Button size="sm" variant="outline" className="h-8">
                                암기학습
                              </Button>
                            </Link>
                            <span className="text-sm text-muted-foreground">
                              진행률 {phaseProgress.memorizationProgress}%
                            </span>
                          </div>

                          <div className="w-px h-6 bg-gray-300"></div>

                          {/* 테스트 버튼 */}
                          <div className="flex items-center gap-2">
                            <Link href={`/student/learn/${assignment.id}/${mod.module.id}?phase=test`}>
                              <Button size="sm" variant="outline" className="h-8">
                                테스트
                              </Button>
                            </Link>
                            <span className="text-sm text-muted-foreground">
                              {phaseProgress.testScore !== null && phaseProgress.testScore !== undefined
                                ? `최고점 ${phaseProgress.testScore}점`
                                : "최고점 응시전"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
