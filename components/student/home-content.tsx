"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

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
    source?: "TEACHER" | "STUDENT" | null
  }>
  progress: Array<{
    moduleId: string
    progressPct: number
    completed: boolean
  }>
}

interface StudentHomeContentProps {
  assignments: Assignment[]
  semesterCodes: Array<{ id: string; value: string }>
  levelCodes: Array<{ id: string; value: string }>
}

type Phase = "wordlist" | "wordlearning" | "memorization" | "writing" | "test"

const phaseTabs: Array<{ key: Phase; label: string }> = [
  { key: "wordlist", label: "단어목록" },
  { key: "wordlearning", label: "단어학습" },
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
      // 단어목록: 다른 phase(초록/보라/빨강) 및 단어학습(파랑)과 구분
      return "bg-teal-50 text-teal-700"
    case "wordlearning":
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

export function StudentHomeContent({
  assignments: initialAssignments,
  semesterCodes,
  levelCodes,
}: StudentHomeContentProps) {
  const [selectedPhase, setSelectedPhase] = useState<Phase>("wordlist")
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const router = useRouter()

  // 학습 추가 다이얼로그
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("")
  const [selectedLevelId, setSelectedLevelId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [moduleResults, setModuleResults] = useState<Array<{ id: string; title: string; type: string }>>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>("")
  const [isSearching, setIsSearching] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isRefreshPending, startRefreshTransition] = useTransition()
  const moduleSearchCache = useRef<Map<string, Array<{ id: string; title: string; type: string }>>>(
    new Map()
  )
  const { toast } = useToast()

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

  // 다이얼로그 열릴 때 기본값 세팅
  useEffect(() => {
    if (!isAddDialogOpen) return
    // 목록이 로딩되거나 값이 바뀌는 상황에서도 검색이 비지 않도록,
    // 다이얼로그를 열 때마다 현재 데이터의 첫 항목으로 초기화합니다.
    setSelectedSemesterId(semesterCodes[0]?.id || "")
    setSelectedLevelId(levelCodes[0]?.id || "")
    setSearchQuery("")
    setSelectedModuleId("")
    setModuleResults([])
  }, [isAddDialogOpen, semesterCodes, levelCodes])

  // 검색(학기/레벨/제목) 결과 조회
  useEffect(() => {
    if (!isAddDialogOpen) return
    if (!selectedSemesterId || !selectedLevelId) return

    const cacheKey = `${selectedSemesterId}:${selectedLevelId}:${searchQuery.trim().toLowerCase()}`
    if (moduleSearchCache.current.has(cacheKey)) {
      setModuleResults(moduleSearchCache.current.get(cacheKey) || [])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const t = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        const url = new URL("/api/student/learning-modules/search", window.location.origin)
        url.searchParams.set("semesterId", selectedSemesterId)
        url.searchParams.set("levelId", selectedLevelId)
        if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim())

        const res = await fetch(url.toString(), { signal: controller.signal })
        if (!res.ok) throw new Error("학습 검색 실패")
        const data = await res.json()
        const normalized = Array.isArray(data) ? data : []
        moduleSearchCache.current.set(cacheKey, normalized)
        setModuleResults(normalized)
      } catch {
        if (!controller.signal.aborted) {
          setModuleResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 180)

    return () => {
      window.clearTimeout(t)
      controller.abort()
    }
  }, [isAddDialogOpen, selectedSemesterId, selectedLevelId, searchQuery])

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
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isRefreshPending}
              onClick={() => {
                startRefreshTransition(() => {
                  router.refresh()
                })
              }}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-1.5", isRefreshPending && "animate-spin")}
              />
              새로고침
            </Button>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              학습추가
            </Button>
          </div>

          {selectedAssignments.length > 0 ? (
            <div className="space-y-3">
              {selectedAssignments.flatMap((assignment) =>
                assignment.modules.map((mod) => (
                  <div key={`${assignment.id}-${mod.module.id}`} className="rounded-xl border bg-white p-3">
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <p className="text-sm font-medium truncate">{mod.module.title}</p>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {mod.source === "STUDENT" ? "학생" : "선생님"}
                      </span>
                    </div>
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
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">
          날짜를 선택하면 학습 시작 버튼이 표시됩니다.
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>학습 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">학기 *</div>
              <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
                <SelectTrigger>
                  <SelectValue placeholder="학기 선택" />
                </SelectTrigger>
                <SelectContent>
                  {semesterCodes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">레벨 *</div>
              <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder="레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  {levelCodes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">학습 제목 검색</div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">검색 결과</div>
              <div className="max-h-48 overflow-y-auto rounded border bg-white">
                {isSearching ? (
                  <div className="p-3 text-sm text-muted-foreground">검색 중...</div>
                ) : moduleResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">결과가 없습니다.</div>
                ) : (
                  <div className="p-2 space-y-2">
                    {moduleResults.map((m) => {
                      const active = selectedModuleId === m.id
                      return (
                        <Button
                          key={m.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedModuleId(m.id)}
                        >
                          {m.title}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                닫기
              </Button>
              <Button
                type="button"
                disabled={!selectedDateKey || !selectedModuleId}
                onClick={async () => {
                  if (!selectedDateKey) return
                  try {
                    setIsAssigning(true)
                    const res = await fetch("/api/student/calendar/assignments/add", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        date: selectedDateKey,
                        semesterId: selectedSemesterId,
                        levelId: selectedLevelId,
                        moduleId: selectedModuleId,
                      }),
                    })
                    if (!res.ok) {
                      const errJson = await res.json().catch(() => null)
                      throw new Error(errJson?.error || errJson?.message || "배정 실패")
                    }
                    setIsAddDialogOpen(false)
                    router.refresh()
                    toast({
                      title: "배정 완료",
                      description: "선택한 학습이 캘린더에 추가되었습니다.",
                    })
                  } catch (err: any) {
                    toast({
                      title: "배정 실패",
                      description:
                        err?.message ||
                        "학습 배정에 실패했습니다. 입력 조건을 확인해주세요.",
                      variant: "destructive",
                    })
                  } finally {
                    setIsAssigning(false)
                  }
                }}
              >
                {isAssigning ? "배정 중..." : "배정"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
