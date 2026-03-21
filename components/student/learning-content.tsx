"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react"
import { playAudioFromPool, preloadAudioUrls } from "@/lib/student-learning"

interface LearningItem {
  id: string
  order: number
  payloadJson: any
}

interface LearningModule {
  id: string
  title: string
  type: string
  items: LearningItem[]
}

interface Progress {
  id: string
  progressPct: number
  completed: boolean
  wordlistMaxIndex?: number | null
  wordlistProgressPct?: number | null
  memorizeMaxIndex?: number | null
  memorizeProgressPct?: number | null
}

interface LearningContentProps {
  module: LearningModule
  assignmentId: string
  inProgressSession: any
  progress: Progress | null
  isReviewMode?: boolean
  completedSession?: any
  phase?: string // wordlist, memorization, test
}

export function LearningContent({
  module,
  assignmentId,
  inProgressSession,
  progress,
  isReviewMode = false,
  completedSession,
  phase = "test",
}: LearningContentProps) {
  const router = useRouter()
  const { toast } = useToast()
  // 테스트 단계에서는 -1로 시작하여 안내 화면 표시, 단어목록/암기학습은 0으로 시작
  const [currentIndex, setCurrentIndex] = useState(phase === "test" ? -1 : 0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string | number, number>>({})
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [completedScore, setCompletedScore] = useState<number | null>(null)
  const [completedAnswers, setCompletedAnswers] = useState<Record<string | number, number>>({})
  // 단어목록/암기학습용 상태
  const [wordlistMaxIndex, setWordlistMaxIndex] = useState<number>(-1)
  const [memorizeMaxIndex, setMemorizeMaxIndex] = useState<number>(-1)
  const [showMeaning, setShowMeaning] = useState<boolean>(false) // 암기학습용 토글
  const [showAnswerRequired, setShowAnswerRequired] = useState<boolean>(false) // 답 선택 필수 경고
  const [isCompleting, setIsCompleting] = useState<boolean>(false) // 완료 처리 중 플래그 (중복 클릭 방지)

  const [showRestartConfirm, setShowRestartConfirm] = useState(false)

  // 쓰기학습용 상태 (스펠링 입력 + 하트 3개)
  const [writingInput, setWritingInput] = useState<string>("")
  const [writingHearts, setWritingHearts] = useState<number>(3)
  const [writingWrongCount, setWritingWrongCount] = useState<number>(0)
  const [writingShowAnswer, setWritingShowAnswer] = useState<boolean>(false)
  const [isCheckingWriting, setIsCheckingWriting] = useState(false)

  /** order 정렬 1회만 — 렌더마다 sort 반복 제거 */
  const sortedItems = useMemo(() => {
    if (!module.items || !Array.isArray(module.items) || module.items.length === 0) return []
    return [...module.items].sort((a, b) => a.order - b.order)
  }, [module.items])

  const quizAnswersRef = useRef(quizAnswers)
  quizAnswersRef.current = quizAnswers

  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const moduleTypeRef = useRef(module.type)
  moduleTypeRef.current = module.type

  const testSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 디바운스 대기 중인 테스트 저장 인덱스 (언마운트 시 flush) */
  const pendingTestSaveIndexRef = useRef<number | null>(null)

  useEffect(() => {
    // 단어목록/암기학습/단어학습은 항상 처음부터 시작
    if (phase === "wordlist" || phase === "wordlearning" || phase === "memorization" || phase === "writing") {
      setCurrentIndex(0)
      // 단어목록/암기학습은 세션 없이도 작동
      return
    }
    
    // 복습 모드일 때는 완료 체크를 하지 않음
    if (isReviewMode) {
      // 복습 모드에서는 항상 새 세션 시작
      if (!sessionId) {
        startNewSession()
      }
      return
    }
    
    // 테스트 단계에서만 세션 체크
    if (phase === "test") {
      // 진행 중인 세션이 있으면 답안 복원
      if (inProgressSession && !sessionId) {
        const sessionPayload = inProgressSession.payloadJson as any
        const sessionPhase = sessionPayload?.phase || "test"
        // 같은 phase의 세션이면 답안 복원
        if (sessionPhase === phase) {
          setSessionId(inProgressSession.id)
          const savedAnswers = sessionPayload?.quizAnswers || {}
          // 답안 정규화 (키를 숫자로 변환)
          const normalizedAnswers: Record<number, number> = {}
          Object.keys(savedAnswers).forEach((key) => {
            const numKey = Number(key)
            if (!isNaN(numKey)) {
              const numValue = Number(savedAnswers[key])
              if (!isNaN(numValue)) {
                normalizedAnswers[numKey] = numValue
              }
            }
          })
          setQuizAnswers(normalizedAnswers)
          // 진행 중인 세션이 있으면 안내 화면 건너뛰고 바로 시험 시작
          const savedIndex = sessionPayload?.currentIndex || 0
          setCurrentIndex(savedIndex >= 0 ? savedIndex : 0)
          return
        } else {
        // 다른 phase의 세션이면 삭제하고 새 세션 시작
          fetch(`/api/student/sessions/${inProgressSession.id}`, {
            method: "DELETE",
          }).catch(console.error)
        }
      }
      // 완료된 테스트 재접속 케이스:
      // completedSession이 있으면 사용자가 "다시보기(예/아니요)"를 선택하기 전까지
      // 자동으로 세션을 시작하거나 결과 다이얼로그를 띄우지 않습니다.
      if (!sessionId && !completedSession) {
        startNewSession()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressSession, progress, isReviewMode, completedSession, phase])

  // 쓰기학습은 문제(현재 index)가 바뀔 때마다 하트/입력 초기화
  useEffect(() => {
    if (phase !== "writing") return
    setWritingInput("")
    setWritingHearts(3)
    setWritingWrongCount(0)
    setWritingShowAnswer(false)
  }, [phase, currentIndex, module.id])

  // 현재·다음 문항 음원 URL 프리로드 (듣기 클릭 체감 개선)
  useEffect(() => {
    if (sortedItems.length === 0) return
    const idx = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
    const cur = sortedItems[idx]
    const next = sortedItems[idx + 1]
    preloadAudioUrls([
      cur?.payloadJson?.audio_url,
      next?.payloadJson?.audio_url,
    ])
  }, [sortedItems, currentIndex])

  /** 테스트 세션 저장 (ref만 사용 — 언마운트/디바운스 공통) */
  const persistTestSessionSave = useCallback((targetIndex: number) => {
    const sid = sessionIdRef.current
    if (!sid) return
    if (phaseRef.current !== "test") return
    if (moduleTypeRef.current !== "TYPE_A" && moduleTypeRef.current !== "TYPE_B") return
    const qa = quizAnswersRef.current
    const normalizedQuizAnswers: Record<number, number> = {}
    Object.keys(qa).forEach((key) => {
      const numKey = Number(key)
      if (!isNaN(numKey)) {
        normalizedQuizAnswers[numKey] = Number(qa[key])
      }
    })
    void fetch(`/api/student/sessions/${sid}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payloadJson: {
          currentIndex: targetIndex,
          phase: phaseRef.current,
          quizAnswers: normalizedQuizAnswers,
        },
      }),
    }).catch((error) => console.error("Auto-save error:", error))
  }, [])

  useEffect(() => {
    return () => {
      if (testSaveTimerRef.current) {
        clearTimeout(testSaveTimerRef.current)
        testSaveTimerRef.current = null
      }
      const pending = pendingTestSaveIndexRef.current
      if (pending !== null) {
        pendingTestSaveIndexRef.current = null
        persistTestSessionSave(pending)
      }
    }
  }, [persistTestSessionSave])

  const startNewSession = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/student/assignments/${assignmentId}/modules/${module.id}/start`,
        { method: "POST" }
      )
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "알 수 없는 오류" }))
        throw new Error(error.error || "학습 시작에 실패했습니다.")
      }
      
      const data = await response.json()
      setSessionId(data.sessionId)
      setQuizAnswers({})
    } catch (error: any) {
      console.error("Start session error:", error)
      toast({
        title: "오류",
        description: error.message || "학습 시작에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const payload = {
        currentIndex,
        phase,
        ...((module.type === "TYPE_A" || module.type === "TYPE_B") && { quizAnswers }),
      }

      await fetch(`/api/student/sessions/${sessionId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payloadJson: payload }),
      })

      toast({
        title: "저장 완료",
        description: "진행 상황이 저장되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "저장에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    // 이미 완료 처리 중이면 무시
    if (isCompleting) {
      return
    }

    // 테스트 단계에서만 완료 처리
    if (phase !== "test") {
      toast({
        title: "알림",
        description: "테스트 단계에서만 완료할 수 있습니다.",
      })
      return
    }

    // 테스트 단계에서는 마지막 문제의 답이 선택되었는지 확인
    if (phase === "test" && (module.type === "TYPE_A" || module.type === "TYPE_B")) {
      const safeCurrentIndex = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
      const numKey = Number(safeCurrentIndex)
      const hasAnswer = quizAnswers[numKey] !== undefined && quizAnswers[numKey] !== null
      
      if (!hasAnswer) {
        // 답이 선택되지 않았으면 경고 표시하고 진행하지 않음
        setShowAnswerRequired(true)
        // 3초 후 경고 메시지 자동 숨김
        setTimeout(() => {
          setShowAnswerRequired(false)
        }, 3000)
        return
      }
    }

    // 완료 처리 시작 - 즉시 플래그 설정하여 중복 클릭 방지
    setIsCompleting(true)
    setIsLoading(true)

    // sessionId가 없으면 inProgressSession에서 가져오기 시도
    let currentSessionId = sessionId
    if (!currentSessionId && inProgressSession) {
      currentSessionId = inProgressSession.id
      setSessionId(currentSessionId)
    }

    // sessionId가 없어도 완료 API는 세션을 찾을 수 있으므로 진행
    // API에서 세션을 자동으로 찾아서 처리함

    try {
      // quizAnswers의 키를 모두 숫자로 정규화하여 전달
      const normalizedQuizAnswers: Record<number, number> = {}
      Object.keys(quizAnswers).forEach((key) => {
        const numKey = Number(key)
        if (!isNaN(numKey)) {
          normalizedQuizAnswers[numKey] = Number(quizAnswers[key])
        }
      })
      
      // quizAnswers와 phase를 함께 전달
      const response = await fetch(
        `/api/student/assignments/${assignmentId}/modules/${module.id}/complete`,
        { 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quizAnswers: normalizedQuizAnswers,
            currentIndex,
            phase,
            isReview: isReviewMode,
          }),
        }
      )

      const responseText = await response.text()

      if (!response.ok) {
        let error
        try {
          error = JSON.parse(responseText)
        } catch {
          error = { error: responseText || "알 수 없는 오류" }
        }
        console.error("Complete API error:", error)
        throw new Error(error.error || "완료 처리에 실패했습니다.")
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Failed to parse response:", e, responseText)
        throw new Error("응답을 파싱할 수 없습니다.")
      }

      // 복습 모드가 아닐 때만 완료 처리
      if (!isReviewMode) {
        const score = data.score !== null && data.score !== undefined ? data.score : 0
        setCompletedScore(score)
        // 정규화된 quizAnswers를 저장 (서버에 보낸 것과 동일한 형태)
        setCompletedAnswers(normalizedQuizAnswers)
        setShowResultDialog(true)
        
        // 점수 표시 토스트
        toast({
          title: "테스트 완료",
          description: `점수: ${score}점`,
        })
      } else {
        // 복습 모드에서는 점수만 저장하고 바로 홈으로
        const score = data.score !== null && data.score !== undefined ? data.score : 0
        toast({
          title: "복습이 완료되었습니다.",
          description: `점수: ${score}점`,
        })
        router.refresh()
        setTimeout(() => {
          router.push("/student")
        }, 500)
      }
    } catch (error: any) {
      console.error("Complete error:", error)
      toast({
        title: "오류",
        description: error.message || "완료 처리에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsCompleting(false)
    }
  }

  /**
   * 테스트 단계: UI 즉시 + 저장은 디바운스(연속 클릭 시 서버 왕복 감소)
   */
  const queueTestAutosaveForIndex = useCallback(
    (targetIndex: number) => {
      if (!sessionId) return
      if (phase !== "test") return
      if (module.type !== "TYPE_A" && module.type !== "TYPE_B") return

      pendingTestSaveIndexRef.current = targetIndex
      if (testSaveTimerRef.current) clearTimeout(testSaveTimerRef.current)
      testSaveTimerRef.current = setTimeout(() => {
        testSaveTimerRef.current = null
        const idx = pendingTestSaveIndexRef.current
        pendingTestSaveIndexRef.current = null
        if (idx !== null) persistTestSessionSave(idx)
      }, 420)
    },
    [sessionId, phase, module.type, persistTestSessionSave]
  )

  const handleNext = async () => {
    const safeCurrentIndex = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
    
    // 테스트 단계에서는 답이 선택되었는지 확인
    if (phase === "test" && (module.type === "TYPE_A" || module.type === "TYPE_B")) {
      const numKey = Number(safeCurrentIndex)
      const hasAnswer = quizAnswers[numKey] !== undefined && quizAnswers[numKey] !== null
      
      if (!hasAnswer) {
        // 답이 선택되지 않았으면 경고 표시하고 진행하지 않음
        setShowAnswerRequired(true)
        // 3초 후 경고 메시지 자동 숨김
        setTimeout(() => {
          setShowAnswerRequired(false)
        }, 3000)
        return
      }
    }
    
    // 답이 선택되었으면 경고 메시지 숨김
    setShowAnswerRequired(false)
    
    if (safeCurrentIndex < sortedItems.length - 1) {
      const newIndex = safeCurrentIndex + 1

      setCurrentIndex(newIndex)
      setShowMeaning(false) // 암기학습 토글 리셋

      queueTestAutosaveForIndex(newIndex)

      // 단어학습(카드) / 암기학습 진행률은 UI 블로킹 없이 동기화
      if (phase === "wordlearning" || phase === "memorization") {
        void updateProgress(newIndex)
      }
    }
  }

  const handlePrev = async () => {
    const safeCurrentIndex = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
    if (safeCurrentIndex > 0) {
      const newIndex = safeCurrentIndex - 1

      setCurrentIndex(newIndex)
      setShowMeaning(false) // 암기학습 토글 리셋

      queueTestAutosaveForIndex(newIndex)
    }
  }

  // 진행률 업데이트 함수
  const updateProgress = async (index: number) => {
    try {
      const mode = phase === "memorization" ? "MEMORIZE" : "WORDLIST"
      const response = await fetch("/api/student/progress/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          moduleId: module.id,
          mode,
          currentIndex: index,
          totalCount: sortedItems.length,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Progress update failed:", response.status, errorText)
        return
      }

      const data = await response.json()
      
      if (phase === "memorization") {
        setMemorizeMaxIndex(data.maxIndex)
      } else {
        setWordlistMaxIndex(data.maxIndex)
      }
    } catch (error) {
      console.error("Progress update error:", error)
      toast({
        title: "알림",
        description: "진행률 업데이트에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 단어목록/암기학습 완료 처리
  const handleWordlistMemorizeComplete = async () => {
    // 이미 처리 중이면 무시
    if (isLoading) {
      return
    }
    
    setIsLoading(true)
    let keepLoadingOnSuccess = false
    try {
      // 쓰기학습은 진행률 저장을 MEMORIZE로 매핑
      const mode = phase === "memorization" ? "MEMORIZE" : "WORDLIST"
      // 마지막 인덱스로 진행률 업데이트 (100%)
      const response = await fetch("/api/student/progress/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          moduleId: module.id,
          mode,
          currentIndex: sortedItems.length - 1,
          totalCount: sortedItems.length,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "진행률 업데이트에 실패했습니다.")
      }

      await response.json()
      
      toast({
        title: "완료",
        description: `${
          phase === "wordlearning"
            ? "단어학습"
            : phase === "wordlist"
            ? "단어목록"
            : phase === "writing"
            ? "쓰기학습"
            : "플래시카드"
        }이 완료되었습니다.`,
      })

      // 성공 시에는 로딩 상태를 유지한 채 즉시 캘린더(학생 홈)로 이동
      keepLoadingOnSuccess = true
      router.push("/student")
    } catch (error: any) {
      console.error("Complete error:", error)
      toast({
        title: "오류",
        description: error.message || "완료 처리에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      if (!keepLoadingOnSuccess) {
        setIsLoading(false)
      }
    }
  }

  // 음성 재생 (풀 재사용 — 새 Audio() 반복 생성 방지)
  const handlePlaySound = useCallback(
    (item?: LearningItem) => {
      const idx = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
      const fallback = sortedItems[idx]
      const audioUrl = (item ?? fallback)?.payloadJson?.audio_url
      if (audioUrl) {
        void playAudioFromPool(audioUrl).catch((error) => {
          console.error("Audio play error:", error)
          toast({
            title: "오류",
            description: "음원 재생에 실패했습니다.",
            variant: "destructive",
          })
        })
        return
      }
      toast({
        title: "알림",
        description: "음성 없음",
      })
    },
    [currentIndex, sortedItems, toast]
  )

  // 정답 뜻 가져오기
  const getCorrectMeaning = (item: LearningItem) => {
    if (!item.payloadJson) return ""
    const correctIndex = item.payloadJson.correct_index || 0
    return item.payloadJson[`choice${correctIndex + 1}`] || ""
  }

  // 쓰기학습에서 입력/정답으로 사용할 단어(스펠링)
  const getExpectedSpelling = (item: LearningItem) => {
    const pj = item.payloadJson || {}
    return String(
      pj.word_text ?? pj.wordText ?? pj.word ?? pj.spelling ?? ""
    ).trim()
  }

  const normalizeText = (value: string) =>
    value.trim().replace(/\s+/g, "").toLowerCase()

  const handleWritingCheck = async () => {
    if (isCheckingWriting) return
    const safeIdx = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
    const writingItem = sortedItems[safeIdx]
    if (!writingItem) return

    setIsCheckingWriting(true)
    try {
      // 쓰기학습: "답"은 뜻(정답 의미), "문제"는 스펠링으로 뒤집어서 처리
      const expected = getCorrectMeaning(writingItem)
      const typed = normalizeText(writingInput)
      const normalizedExpected = normalizeText(expected)

      // 정답 제출
      if (typed && normalizedExpected && typed === normalizedExpected) {
        // 다음 문제로 이동
        const newIndex = safeIdx + 1
        if (safeIdx < sortedItems.length - 1) {
          setWritingInput("")
          setWritingWrongCount(0)
          setWritingHearts(3)
          setWritingShowAnswer(false)

          setCurrentIndex(newIndex)
          void updateProgress(newIndex)
        } else {
          // 마지막 문제: 완료 처리 후 캘린더로 이동
          await handleWordlistMemorizeComplete()
        }
        return
      }

      // 오답 처리 (정답 보기 전: 하트 차감, 3번이면 정답 표시)
      if (!writingShowAnswer) {
        const nextWrongCount = writingWrongCount + 1
        setWritingWrongCount(nextWrongCount)
        setWritingHearts((prev) => Math.max(0, prev - 1))

        if (nextWrongCount >= 3) {
          setWritingShowAnswer(true)
          setWritingInput("")
        }
      } else {
        // 정답을 이미 보여준 상태: 틀리면 그대로 재작성 대기
        toast({
          title: "다시 작성하세요",
          description: "정답을 다시 확인한 뒤 스펠링을 입력해주세요.",
          variant: "destructive",
        })
      }
    } finally {
      setIsCheckingWriting(false)
    }
  }

  // 배열이 비어있는 경우 처리 (하지만 서버에서 리다이렉트하지 않고 클라이언트에서 처리)
  if (sortedItems.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">학습 항목이 없습니다.</h2>
            <p className="text-muted-foreground mb-4">이 학습 모듈에는 아직 항목이 등록되지 않았습니다.</p>
            <Button onClick={() => router.push("/student")}>홈으로</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 테스트 단계에서 안내 화면 표시 (currentIndex === -1)
  if (phase === "test" && currentIndex === -1) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center space-y-6">
            <h2 className="text-3xl font-bold mb-4">테스트를 시작합니다</h2>
            <p className="text-lg text-muted-foreground">
              준비가 되셨으면 아래 버튼을 눌러 테스트를 시작하세요.
            </p>
            <div className="flex justify-center mt-8">
              <Button 
                onClick={() => {
                  setCurrentIndex(0)
                }}
                size="lg"
                className="px-8 py-6 text-lg"
              >
                다음
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // currentIndex가 범위를 벗어나면 0으로 조정
  const safeCurrentIndex = Math.max(0, Math.min(currentIndex, sortedItems.length - 1))
  
  // 정렬된 배열을 기반으로 currentItem과 isLast 계산
  const currentItem = sortedItems[safeCurrentIndex]
  const isLast = safeCurrentIndex === sortedItems.length - 1

  // payloadJson이 없거나 구조가 잘못된 경우 처리
  if (!currentItem || !currentItem.payloadJson) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">학습 데이터를 불러올 수 없습니다.</h2>
            <Button onClick={() => router.push("/student")}>홈으로</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 복습하기 핸들러
  const handleRestart = () => {
    // 복습 모드로 URL 변경하여 완료 상태를 우회하고 학습을 다시 시작
    router.push(`/student/learn/${assignmentId}/${module.id}?phase=${phase}&review=true`)
  }

  // 복습 모드가 아닐 때만 완료 체크
  // 해당 phase의 완료된 세션이 있는지 명확히 확인
  const isPhaseCompleted = (() => {
    // completedSession이 없으면 완료되지 않음
    if (!completedSession) {
      return false
    }
    
    // completedSession의 phase 확인
    try {
      const sessionPayload = completedSession.payloadJson as any
      const sessionPhase = sessionPayload?.phase || "test"
      // 현재 phase와 일치하는 경우만 완료로 간주
      return sessionPhase === phase
    } catch {
      // payloadJson이 없거나 파싱 실패 시
      // phase가 "test"이고 completedSession이 있으면 완료로 간주 (기존 데이터 호환)
      return phase === "test"
    }
  })()

  // 테스트만 완료 체크 (단어목록/암기학습은 제외)
  if (phase === "test" && isPhaseCompleted && !isReviewMode && !sessionId) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-2xl font-bold mb-4">학습이 완료되었습니다.</h2>
            <div className="flex flex-col gap-3 items-center">
              <Button
                onClick={() => setShowRestartConfirm(true)}
                className="w-full max-w-xs"
              >
                다시보기
              </Button>
              <Button onClick={() => router.push("/student")} variant="outline" className="w-full max-w-xs">
                닫기
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showRestartConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>다시보기</DialogTitle>
              <DialogDescription>
                시험점수가 초기화 됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRestartConfirm(false)
                  router.push("/student")
                }}
              >
                아니요
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowRestartConfirm(false)
                  router.push(`/student/learn/${assignmentId}/${module.id}?phase=${phase}&review=true`)
                }}
              >
                예
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // 정답 확인 함수
  const getCorrectAnswer = (item: LearningItem) => {
    return Number(item.payloadJson?.correct_index ?? -1) // 숫자로 변환
  }

  // 정오 확인 함수
  const isCorrect = (itemIndex: number) => {
    const correctIndex = getCorrectAnswer(module.items[itemIndex])
    const studentAnswer = Number(completedAnswers[itemIndex] ?? -1) // 숫자로 변환
    return studentAnswer === correctIndex
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* 학습 결과 다이얼로그 */}
      <Dialog open={showResultDialog} onOpenChange={(open) => {
        setShowResultDialog(open)
        // 다이얼로그를 닫으면 새 세션 시작 가능하도록 상태 초기화 및 홈으로 이동
        if (!open) {
          setSessionId(null)
          // 다이얼로그가 닫히면 홈으로 자동 이동
          setTimeout(() => {
            router.push("/student")
            router.refresh()
          }, 100)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학습 결과</DialogTitle>
            <DialogDescription>
              {completedScore !== null && `점수: ${completedScore}점`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* completedAnswers 정규화 (한 번만 실행) */}
            {(() => {
              const normalizedCompletedAnswers: Record<number, number> = {}
              Object.keys(completedAnswers).forEach((key) => {
                const numKey = Number(key)
                if (!isNaN(numKey)) {
                  const numValue = Number(completedAnswers[key])
                  if (!isNaN(numValue)) {
                    normalizedCompletedAnswers[numKey] = numValue
                  }
                }
              })

              return sortedItems.map((item, arrayIndex) => {
                const correctIndex = Number(getCorrectAnswer(item)) // 숫자로 변환
                const studentAnswer = normalizedCompletedAnswers[arrayIndex]
                const isCorrectAnswer = studentAnswer !== undefined && !isNaN(studentAnswer) && studentAnswer === correctIndex
                
              const choices = [
                item.payloadJson?.choice1,
                item.payloadJson?.choice2,
                item.payloadJson?.choice3,
                item.payloadJson?.choice4,
              ].filter(Boolean)

              return (
                <Card key={arrayIndex} className={isCorrectAnswer ? "border-green-500" : "border-red-500"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{item.payloadJson?.word_text || `문항 ${arrayIndex + 1}`}</p>
                        {module.type === "TYPE_B" && item.payloadJson?.image_url && (
                          <img
                            src={item.payloadJson.image_url}
                            alt={item.payloadJson?.word_text || ""}
                            className="max-w-full h-auto mt-2 rounded-lg"
                            style={{ maxHeight: "200px" }}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                      <div className="ml-4">
                        {isCorrectAnswer ? (
                          <span className="text-green-600 font-bold text-lg">O</span>
                        ) : (
                          <span className="text-red-600 font-bold text-lg">X</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 mt-3">
                      {choices.map((choice, choiceIdx) => {
                        const isCorrect = choiceIdx === correctIndex
                        const isSelected = choiceIdx === studentAnswer
                        return (
                          <div
                            key={choiceIdx}
                            className={`p-2 rounded ${
                              isCorrect
                                ? "bg-green-100 border border-green-500"
                                : isSelected
                                ? "bg-red-100 border border-red-500"
                                : "bg-gray-50"
                            }`}
                          >
                            {choiceIdx + 1}. {choice}
                            {isCorrect && <span className="ml-2 text-green-600 font-bold">(정답)</span>}
                            {isSelected && !isCorrect && <span className="ml-2 text-red-600 font-bold">(선택한 답)</span>}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
              })
            })()}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowResultDialog(false)
              // 다이얼로그 닫기 후 홈으로 자동 이동
              setTimeout(() => {
                router.push("/student")
                router.refresh()
              }, 100)
            }}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 items-start justify-between">
        <div className="min-w-0 flex-1 pr-1">
          <h1 className="text-lg sm:text-2xl font-bold leading-snug break-words">
            {module.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {isReviewMode && <span className="whitespace-nowrap">(복습)</span>}
            {phase === "wordlist" && <span className="whitespace-nowrap">(단어목록)</span>}
            {phase === "wordlearning" && <span className="whitespace-nowrap">(단어학습)</span>}
            {phase === "memorization" && <span className="whitespace-nowrap">(암기학습)</span>}
            {phase === "writing" && <span className="whitespace-nowrap">(쓰기학습)</span>}
            {phase === "test" && <span className="whitespace-nowrap">(테스트)</span>}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/student")}
          disabled={isLoading || isCheckingWriting || isCompleting}
          className="shrink-0 self-center"
        >
          나가기
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* 단어목록 단계: 사진처럼 전체 단어/뜻을 표로 표시 */}
          {phase === "wordlist" ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-2 py-2 text-left">순번</th>
                      <th className="border px-2 py-2 text-left">단어</th>
                      <th className="border px-2 py-2 text-left">뜻</th>
                      <th className="border px-2 py-2 text-left">듣기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border px-2 py-2 text-xs text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="border px-2 py-2 font-medium">
                          {item.payloadJson?.word_text || ""}
                        </td>
                        <td className="border px-2 py-2 text-muted-foreground">
                          {getCorrectMeaning(item)}
                        </td>
                        <td className="border px-2 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlaySound(item)}
                          >
                            듣기
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : phase === "wordlearning" ? (
            <div className="space-y-4">
              <div className="text-center py-12">
                {module.type === "TYPE_B" && currentItem.payloadJson?.image_url && (
                  <div className="mb-6">
                    <img
                      src={currentItem.payloadJson.image_url}
                      alt={currentItem.payloadJson?.word_text || ""}
                      className="max-w-full h-auto mx-auto rounded-lg"
                      style={{ maxHeight: "300px" }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <p className="text-4xl font-bold mb-6">
                  {currentItem.payloadJson?.word_text || ""}
                </p>
                <p className="text-2xl text-muted-foreground mb-6">
                  {getCorrectMeaning(currentItem)}
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => handlePlaySound()}
                    variant="outline"
                    size="lg"
                  >
                    <Volume2 className="h-5 w-5 mr-2" />
                    음성
                  </Button>
                </div>
              </div>
            </div>
          ) : phase === "memorization" ? (
            // 암기학습 단계: 카드 클릭 시 토글
            <div className="space-y-4">
              <div 
                className="text-center py-12 cursor-pointer min-h-[300px] flex items-center justify-center"
                onClick={() => {
                  // 단어(카드) 클릭할 때마다 음성 재생
                  handlePlaySound()
                  setShowMeaning(!showMeaning)
                }}
              >
                {module.type === "TYPE_B" && currentItem.payloadJson?.image_url && !showMeaning && (
                  <div className="mb-6">
                    <img
                      src={currentItem.payloadJson.image_url}
                      alt={currentItem.payloadJson?.word_text || ""}
                      className="max-w-full h-auto mx-auto rounded-lg"
                      style={{ maxHeight: "300px" }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                {showMeaning ? (
                  <p className="text-4xl font-bold text-blue-600">
                    {getCorrectMeaning(currentItem)}
                  </p>
                ) : (
                  <p className="text-4xl font-bold">
                    {currentItem.payloadJson?.word_text || ""}
                  </p>
                )}
              </div>
            </div>
          ) : phase === "writing" ? (
            // 쓰기학습 단계: 스펠링 입력 + 하트 3개
            <div className="space-y-4">
              <div className="flex justify-center gap-1 text-2xl">
                {Array.from({ length: 3 }).map((_, i) => {
                  const filled = i < writingHearts
                  return (
                    <span
                      key={i}
                      className={filled ? "text-red-500" : "text-gray-300"}
                    >
                      ♥
                    </span>
                  )
                })}
              </div>

              <div className="text-center py-8">
                {/* writing은 word를 숨기고, 뜻을 보고 스펠링을 입력 */}
                  {/* 문제: 스펠링 */}
                  <p className="text-3xl font-bold mb-2">{getExpectedSpelling(currentItem)}</p>
                  <p className="text-sm text-muted-foreground mb-6">뜻을 입력하고 “다음”을 누르세요.</p>

                {writingShowAnswer && (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs text-muted-foreground">정답</p>
                    <p className="text-2xl font-bold">{getCorrectMeaning(currentItem)}</p>
                    <p className="text-sm text-muted-foreground">정답을 보고 다시 입력한 뒤 “다음”을 누르세요.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    value={writingInput}
                    onChange={(e) => setWritingInput(e.target.value)}
                    disabled={isLoading || isCheckingWriting}
                    placeholder={writingShowAnswer ? "정답을 보고 다시 작성" : "예: 사과"}
                    className="w-full border rounded-lg px-3 py-2 text-base"
                  />

                  <Button className="w-full" disabled={isLoading || isCheckingWriting} onClick={handleWritingCheck}>
                    {isLoading || isCheckingWriting ? "처리 중..." : "다음"}
                  </Button>
                </div>

                {writingWrongCount > 0 && !writingShowAnswer && (
                  <p className="text-xs text-red-500 mt-3">
                    오답 {writingWrongCount} / 3
                  </p>
                )}
              </div>
            </div>
          ) : phase === "test" ? (
            // 테스트 단계: 퀴즈 모드
            module.type === "TYPE_A" ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-3xl font-bold mb-4">
                    {currentItem.payloadJson?.word_text || ""}
                  </p>
                  <div className="space-y-2 mt-6">
                    {currentItem.payloadJson && [
                      currentItem.payloadJson.choice1,
                      currentItem.payloadJson.choice2,
                      currentItem.payloadJson.choice3,
                      currentItem.payloadJson.choice4,
                    ].filter(Boolean).map((choice: string, idx: number) => {
                      const answerKey = safeCurrentIndex
                      const numKey = Number(answerKey)
                      // 저장할 때와 동일하게 숫자 키로 비교
                      const storedAnswer = quizAnswers[numKey]
                      const isSelected = storedAnswer !== undefined && Number(storedAnswer) === idx
                      return (
                        <Button
                          key={idx}
                          variant={
                            isSelected
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => {
                            const newAnswers = { ...quizAnswers }
                            newAnswers[numKey] = Number(idx)
                            setQuizAnswers(newAnswers)
                            // 답을 선택하면 경고 메시지 숨김
                            setShowAnswerRequired(false)
                          }}
                        >
                          {choice}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : module.type === "TYPE_B" ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  {currentItem.payloadJson?.image_url && (
                    <div className="mb-4">
                      <img
                        src={currentItem.payloadJson.image_url}
                        alt={currentItem.payloadJson?.word_text || ""}
                        className="max-w-full h-auto mx-auto rounded-lg"
                        style={{ maxHeight: "300px" }}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <p className="text-3xl font-bold mb-4">
                    {currentItem.payloadJson?.word_text || ""}
                  </p>
                  <div className="space-y-2 mt-6">
                    {currentItem.payloadJson && [
                      currentItem.payloadJson.choice1,
                      currentItem.payloadJson.choice2,
                      currentItem.payloadJson.choice3,
                      currentItem.payloadJson.choice4,
                    ].filter(Boolean).map((choice: string, idx: number) => {
                      const answerKey = safeCurrentIndex
                      const numKey = Number(answerKey)
                      // 저장할 때와 동일하게 숫자 키로 비교
                      const storedAnswer = quizAnswers[numKey]
                      const isSelected = storedAnswer !== undefined && Number(storedAnswer) === idx
                      return (
                        <Button
                          key={idx}
                          variant={
                            isSelected
                              ? "default"
                              : "outline"
                          }
                          className="w-full justify-start"
                          onClick={() => {
                            const newAnswers = { ...quizAnswers }
                            newAnswers[numKey] = Number(idx)
                            setQuizAnswers(newAnswers)
                            // 답을 선택하면 경고 메시지 숨김
                            setShowAnswerRequired(false)
                          }}
                        >
                          {choice}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">
                  지원하지 않는 학습 타입입니다.
                </p>
              </div>
            </div>
          )}

          {/* 네비게이션 */}
          {phase === "wordlist" ? null : (
            <div className="flex items-center justify-between mt-6">
            {phase === "writing" ? null : (
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={safeCurrentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {safeCurrentIndex + 1} / {sortedItems.length}
            </span>
            {isLast ? (
              phase === "writing" ? null : phase === "test" ? (
                <div className="flex flex-col items-end gap-1">
                  {(() => {
                    // 완료 버튼도 답 선택 확인
                    const numKey = Number(safeCurrentIndex)
                    const hasAnswer = quizAnswers[numKey] !== undefined && quizAnswers[numKey] !== null
                    const showRequired = !hasAnswer && showAnswerRequired
                    
                    return (
                      <>
                        <Button 
                          onClick={() => handleComplete()} 
                          disabled={isLoading || isCompleting}
                          className={showRequired ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                        >
                          {isLoading || isCompleting ? "처리 중..." : "완료"}
                        </Button>
                        {showRequired && (
                          <span className="text-xs text-red-500">답을 선택하세요</span>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <Button 
                  onClick={handleWordlistMemorizeComplete}
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "완료"}
                </Button>
              )
            ) : (
              <div className="flex flex-col items-end gap-1">
                {(() => {
                  // 테스트 단계에서는 답 선택 확인
                  if (phase === "test" && (module.type === "TYPE_A" || module.type === "TYPE_B")) {
                    const numKey = Number(safeCurrentIndex)
                    const hasAnswer = quizAnswers[numKey] !== undefined && quizAnswers[numKey] !== null
                    const showRequired = !hasAnswer && showAnswerRequired
                    
                    return (
                      <>
                        <Button 
                          onClick={handleNext}
                          className={showRequired ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                        >
                          다음
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        {showRequired && (
                          <span className="text-xs text-red-500">답을 선택하세요</span>
                        )}
                      </>
                    )
                  }
                  
                  // 쓰기학습은 카드 내부 “다음” 버튼을 사용
                  if (phase === "writing") {
                    return null
                  }

                  // 단어목록/암기학습은 답 선택 불필요
                  return (
                    <Button onClick={handleNext}>
                      다음
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )
                })()}
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
