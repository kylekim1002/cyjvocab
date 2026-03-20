"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Assignment {
  id: string
  assignedDate: Date | string
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

interface StudentHomeContentProps {
  assignments: Assignment[]
}

type Phase = "wordlist" | "memorization" | "writing" | "test"

const phaseTabs: Array<{ key: Phase; label: string }> = [
  { key: "wordlist", label: "단어학습" },
  { key: "memorization", label: "플래시카드" },
  { key: "writing", label: "쓰기학습" },
  { key: "test", label: "테스트" },
]

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"]

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`
}

function getStartBadgeClass(phase: Phase) {
  switch (phase) {
    case "wordlist":
      return "bg-blue-50 text-blue-600"
    case "memorization":
      return "bg-green-50 text-green-600"
    case "writing":
      return "bg-purple-50 text-purple-600"
    case "test":
      return "bg-red-50 text-red-600"
    default:
      return "bg-rose-50 text-rose-600"
  }
}

export function StudentHomeContent({ assignments: initialAssignments }: StudentHomeContentProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase>("wordlist")
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const assignments = useMemo(
    () =>
      initialAssignments.map((a) => ({
        ...a,
        assignedDate: new Date(a.assignedDate),
      })),
    [initialAssignments]
  )

  const dateAssignmentsMap = useMemo(() => {
    const map = new Map<string, Assignment[]>()
    assignments.forEach((assignment) => {
      const key = toDateKey(new Date(assignment.assignedDate))
      const prev = map.get(key) || []
      prev.push(assignment)
      map.set(key, prev)
    })
    return map
  }, [assignments])

  const monthGrid = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDate = new Date(year, month + 1, 0).getDate()
    const startWeekday = firstDay.getDay()

    const cells: Array<Date | null> = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [monthCursor])

  const selectedAssignments = selectedDateKey ? dateAssignmentsMap.get(selectedDateKey) || [] : []

  return (
    <div className="mx-auto max-w-md px-4 py-4 pb-24 space-y-4">
      <div className="space-y-2">
        {/* 년월: 최상단 중앙 정렬 + 좌/우 월 이동 버튼 */}
        <div className="relative flex items-center justify-center min-h-[32px]">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-0"
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <p className="text-2xl font-semibold tabular-nums">
            {monthCursor.getFullYear()}.{String(monthCursor.getMonth() + 1).padStart(2, "0")}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0"
            onClick={() =>
              setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* 탭: 바로 아래 중앙 배치 */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-white p-1">
            {phaseTabs.map((tab) => (
              <Button
                key={tab.key}
                type="button"
                variant={selectedPhase === tab.key ? "default" : "ghost"}
                className="h-8 px-2 text-xs"
                onClick={() => setSelectedPhase(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="grid grid-cols-7 mb-2">
          {weekLabels.map((w) => (
            <div
              key={w}
              className={cn(
                "text-center text-xs py-2",
                w === "일" ? "text-rose-500" : w === "토" ? "text-fuchsia-500" : "text-muted-foreground"
              )}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2">
          {monthGrid.map((dateCell, idx) => {
            if (!dateCell) return <div key={`empty-${idx}`} className="h-14" />

            const key = toDateKey(dateCell)
            const hasLearning = (dateAssignmentsMap.get(key)?.length || 0) > 0
            const isSelected = selectedDateKey === key

            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "h-14 rounded-lg border border-transparent px-1 py-1 text-center",
                  isSelected ? "border-primary" : "hover:bg-gray-50"
                )}
                onClick={() => setSelectedDateKey(key)}
              >
                <div className="text-base">{dateCell.getDate()}</div>
                {hasLearning && (
                  <div
                    className={`mx-auto mt-1 w-fit rounded px-1.5 py-0.5 text-[10px] ${getStartBadgeClass(
                      selectedPhase
                    )}`}
                  >
                    시작
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDateKey ? (
        selectedAssignments.length > 0 ? (
          <div className="space-y-3">
            {selectedAssignments.flatMap((assignment) =>
              assignment.modules.map((mod) => (
                <div key={`${assignment.id}-${mod.module.id}`} className="rounded-xl border bg-white p-3">
                  <p className="text-sm font-medium mb-2">{mod.module.title}</p>
                  <Link href={`/student/learn/${assignment.id}/${mod.module.id}?phase=${selectedPhase}`}>
                    <Button className="w-full">시작</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
            선택한 날짜에는 학습이 없습니다.
          </div>
        )
      ) : (
        <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
          날짜를 선택하면 학습 시작 버튼이 표시됩니다.
        </div>
      )}
    </div>
  )
}
