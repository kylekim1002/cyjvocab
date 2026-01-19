"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react"

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
  phase?: string // wordlist, memorization, test, finaltest
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [completedScore, setCompletedScore] = useState<number | null>(null)
  const [completedAnswers, setCompletedAnswers] = useState<Record<number, number>>({})
  // 단어목록/암기학습용 상태
  const [wordlistMaxIndex, setWordlistMaxIndex] = useState<number>(-1)
  const [memorizeMaxIndex, setMemorizeMaxIndex] = useState<number>(-1)
  const [showMeaning, setShowMeaning] = useState<boolean>(false) // 암기학습용 토글
  const [finalTestItems, setFinalTestItems] = useState<LearningItem[]>([]) // 최종테스트용 아이템

  useEffect(() => {
    console.log("LearningContent useEffect", { inProgressSession, progress, sessionId, isReviewMode, completedSession, phase })
    
    // 단어목록/암기학습은 항상 처음부터 시작
    if (phase === "wordlist" || phase === "memorization") {
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
    
    // 테스트/최종테스트 단계에서만 세션 체크
    if (phase === "test" || phase === "finaltest") {
      // 진행 중인 세션이 있으면 phase 확인 후 처리
      if (inProgressSession) {
        const sessionPayload = inProgressSession.payloadJson as any
        const sessionPhase = sessionPayload?.phase || "test"
        // 다른 phase의 세션이면 삭제하고 새 세션 시작
        if (sessionPhase !== phase) {
          fetch(`/api/student/sessions/${inProgressSession.id}`, {
            method: "DELETE",
          }).catch(console.error)
          // 다른 phase의 세션이므로 새 세션 시작
          if (!sessionId) {
            startNewSession()
          }
          return
        }
      }
      // 완료된 학습도 다시 시작할 수 있도록 항상 새 세션으로 시작
      // 완료된 학습이고 completedSession이 있으면 결과 다이얼로그 표시
      // 단, completedSession의 phase가 현재 phase와 일치하는 경우만
      if (completedSession && !showResultDialog) {
        const sessionPayload = completedSession.payloadJson as any
        const sessionPhase = sessionPayload?.phase || "test"
        // 현재 phase와 일치하는 세션만 표시
        if (sessionPhase === phase) {
          const answers = sessionPayload?.quizAnswers || {}
          setCompletedScore(completedSession.score)
          setCompletedAnswers(answers)
          setShowResultDialog(true)
        }
      }
      // 항상 새 세션 시작 (완료된 학습도 다시 시작 가능)
      if (!sessionId) {
        startNewSession()
      }
      
      // 최종테스트인 경우 세션에서 finalTestItems 가져오기
      if (phase === "finaltest") {
        const loadFinalTestItems = async () => {
          if (inProgressSession?.payloadJson) {
            const payload = inProgressSession.payloadJson as any
            if (payload.finalTestItems) {
              setFinalTestItems(payload.finalTestItems)
              return
            }
          }
          if (sessionId) {
            try {
              const res = await fetch(`/api/student/sessions/${sessionId}`)
              if (res.ok) {
                const data = await res.json()
                const payload = data.payloadJson as any
                if (payload?.finalTestItems) {
                  setFinalTestItems(payload.finalTestItems)
                }
              }
            } catch (error) {
              console.error("Failed to load final test items:", error)
            }
          }
        }
        loadFinalTestItems()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressSession, progress, isReviewMode, completedSession, phase])

  const startNewSession = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/student/assignments/${assignmentId}/modules/${module.id}/start`,
        { 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phase }),
        }
      )
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "알 수 없는 오류" }))
        throw new Error(error.error || "학습 시작에 실패했습니다.")
      }
      
      const data = await response.json()
      console.log("New session started:", data.sessionId)
      setSessionId(data.sessionId)
      
      // 최종테스트인 경우 세션에서 finalTestItems 가져오기
      if (phase === "finaltest" && data.sessionId) {
        try {
          const sessionResponse = await fetch(`/api/student/sessions/${data.sessionId}`)
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json()
            const payload = sessionData.payloadJson as any
            if (payload?.finalTestItems) {
              setFinalTestItems(payload.finalTestItems)
            }
          }
        } catch (error) {
          console.error("Failed to load final test items:", error)
        }
      }
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
    // 테스트/최종테스트 단계에서만 완료 처리
    if (phase !== "test" && phase !== "finaltest") {
      toast({
        title: "알림",
        description: "테스트 단계에서만 완료할 수 있습니다.",
      })
      return
    }

    console.log("handleComplete called", { sessionId, assignmentId, moduleId: module.id, inProgressSession })
    
    // sessionId가 없으면 inProgressSession에서 가져오기 시도
    let currentSessionId = sessionId
    if (!currentSessionId && inProgressSession) {
      currentSessionId = inProgressSession.id
      setSessionId(currentSessionId)
      console.log("Using sessionId from inProgressSession:", currentSessionId)
    }

    // sessionId가 없어도 완료 API는 세션을 찾을 수 있으므로 진행
    // API에서 세션을 자동으로 찾아서 처리함

    setIsLoading(true)
    try {
      console.log("Calling complete API", { 
        sessionId: currentSessionId, 
        assignmentId, 
        moduleId: module.id,
        quizAnswers,
        currentIndex 
      })
      
      // quizAnswers를 함께 전달
      const response = await fetch(
        `/api/student/assignments/${assignmentId}/modules/${module.id}/complete`,
        { 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quizAnswers,
            currentIndex,
            isReview: isReviewMode,
          }),
        }
      )

      console.log("Complete API response:", response.status, response.statusText)

      const responseText = await response.text()
      console.log("Complete API response text:", responseText)

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
      console.log("Complete API success:", data)

      // 복습 모드가 아닐 때만 완료 처리
      if (!isReviewMode) {
        const score = data.score !== null && data.score !== undefined ? data.score : 0
        setCompletedScore(score)
        setCompletedAnswers(quizAnswers)
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
    }
  }

  const handleNext = async () => {
    if (currentIndex < module.items.length - 1) {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      setShowMeaning(false) // 암기학습 토글 리셋
      
      // 단어목록/암기학습 진행률 업데이트
      if (phase === "wordlist" || phase === "memorization") {
        await updateProgress(newIndex)
      }
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowMeaning(false) // 암기학습 토글 리셋
    }
  }

  // 진행률 업데이트 함수
  const updateProgress = async (index: number) => {
    try {
      const mode = phase === "wordlist" ? "WORDLIST" : "MEMORIZE"
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
          totalCount: module.items.length,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Progress update failed:", response.status, errorText)
        return
      }

      const data = await response.json()
      console.log("Progress update success:", data)
      
      if (phase === "wordlist") {
        setWordlistMaxIndex(data.maxIndex)
      } else {
        setMemorizeMaxIndex(data.maxIndex)
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
    setIsLoading(true)
    try {
      const mode = phase === "wordlist" ? "WORDLIST" : "MEMORIZE"
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
          currentIndex: module.items.length - 1,
          totalCount: module.items.length,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "진행률 업데이트에 실패했습니다.")
      }

      const data = await response.json()
      console.log("Complete progress update:", data)
      
      toast({
        title: "완료",
        description: `${phase === "wordlist" ? "단어목록" : "암기학습"}이 완료되었습니다.`,
      })
      
      // 페이지 새로고침 후 이동
      router.refresh()
      setTimeout(() => {
        router.push("/student")
      }, 500)
    } catch (error: any) {
      console.error("Complete error:", error)
      toast({
        title: "오류",
        description: error.message || "완료 처리에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 음성 재생 함수
  const handlePlaySound = () => {
    const audioUrl = currentItem?.payloadJson?.audio_url
    
    // 음원 파일이나 링크가 있으면 재생
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audio.play().catch((error) => {
        console.error("Audio play error:", error)
        toast({
          title: "오류",
          description: "음원 재생에 실패했습니다.",
          variant: "destructive",
        })
      })
      return
    }
    
    // 음원이 없으면 음성 없음 표시
    toast({
      title: "알림",
      description: "음성 없음",
    })
  }

  // 정답 뜻 가져오기
  const getCorrectMeaning = (item: LearningItem) => {
    if (!item.payloadJson) return ""
    const correctIndex = item.payloadJson.correct_index || 0
    return item.payloadJson[`choice${correctIndex + 1}`] || ""
  }

  // 최종테스트인 경우 finalTestItems 사용, 아니면 module.items 사용
  const displayItems = phase === "finaltest" && finalTestItems.length > 0 
    ? finalTestItems 
    : module.items
  const currentItem = displayItems[currentIndex]
  const isLast = currentIndex === displayItems.length - 1

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

  // 테스트/최종테스트만 완료 체크 (단어목록/암기학습은 제외)
  if ((phase === "test" || phase === "finaltest") && isPhaseCompleted && !isReviewMode && !sessionId) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-2xl font-bold mb-4">학습이 완료되었습니다.</h2>
            <div className="flex flex-col gap-3 items-center">
              <Button onClick={handleRestart} className="w-full max-w-xs">
                복습하기
              </Button>
              <Button onClick={() => router.push("/student")} variant="outline" className="w-full max-w-xs">
                홈으로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 정답 확인 함수
  const getCorrectAnswer = (item: LearningItem) => {
    return item.payloadJson?.correct_index ?? -1
  }

  // 정오 확인 함수
  const isCorrect = (itemIndex: number) => {
    const correctIndex = getCorrectAnswer(module.items[itemIndex])
    return completedAnswers[itemIndex] === correctIndex
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* 학습 결과 다이얼로그 */}
      <Dialog open={showResultDialog} onOpenChange={(open) => {
        setShowResultDialog(open)
        // 다이얼로그를 닫으면 새 세션 시작 가능하도록 상태 초기화
        if (!open) {
          setSessionId(null)
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
            {(phase === "finaltest" && finalTestItems.length > 0 ? finalTestItems : module.items).map((item, idx) => {
              const correctIndex = getCorrectAnswer(item)
              const studentAnswer = completedAnswers[idx]
              const isCorrectAnswer = studentAnswer === correctIndex
              const choices = [
                item.payloadJson?.choice1,
                item.payloadJson?.choice2,
                item.payloadJson?.choice3,
                item.payloadJson?.choice4,
              ].filter(Boolean)

              return (
                <Card key={idx} className={isCorrectAnswer ? "border-green-500" : "border-red-500"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{item.payloadJson?.word_text || `문항 ${idx + 1}`}</p>
                        {module.type === "TYPE_B" && item.payloadJson?.image_url && (
                          <img
                            src={item.payloadJson.image_url}
                            alt={item.payloadJson?.word_text || ""}
                            className="max-w-full h-auto mt-2 rounded-lg"
                            style={{ maxHeight: "200px" }}
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
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowResultDialog(false)
              router.push("/student")
              router.refresh()
            }}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {module.title}
          {isReviewMode && <span className="ml-2 text-sm text-muted-foreground">(복습)</span>}
          {phase === "wordlist" && <span className="ml-2 text-sm text-muted-foreground">(단어목록)</span>}
          {phase === "memorization" && <span className="ml-2 text-sm text-muted-foreground">(암기학습)</span>}
          {phase === "test" && <span className="ml-2 text-sm text-muted-foreground">(테스트)</span>}
          {phase === "finaltest" && <span className="ml-2 text-sm text-muted-foreground">(최종테스트)</span>}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* 단어목록 단계: 1개 카드로 현재 단어/뜻 표시 */}
          {phase === "wordlist" ? (
            <div className="space-y-4">
              <div className="text-center py-12">
                {module.type === "TYPE_B" && currentItem.payloadJson?.image_url && (
                  <div className="mb-6">
                    <img
                      src={currentItem.payloadJson.image_url}
                      alt={currentItem.payloadJson?.word_text || ""}
                      className="max-w-full h-auto mx-auto rounded-lg"
                      style={{ maxHeight: "300px" }}
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
                    onClick={handlePlaySound}
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
                onClick={() => setShowMeaning(!showMeaning)}
              >
                {module.type === "TYPE_B" && currentItem.payloadJson?.image_url && !showMeaning && (
                  <div className="mb-6">
                    <img
                      src={currentItem.payloadJson.image_url}
                      alt={currentItem.payloadJson?.word_text || ""}
                      className="max-w-full h-auto mx-auto rounded-lg"
                      style={{ maxHeight: "300px" }}
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
          ) : phase === "test" || phase === "finaltest" ? (
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
                    ].filter(Boolean).map((choice: string, idx: number) => (
                      <Button
                        key={idx}
                        variant={
                          quizAnswers[currentIndex] === idx
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() => {
                          setQuizAnswers({ ...quizAnswers, [currentIndex]: idx })
                        }}
                      >
                        {choice}
                      </Button>
                    ))}
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
                    ].filter(Boolean).map((choice: string, idx: number) => (
                      <Button
                        key={idx}
                        variant={
                          quizAnswers[currentIndex] === idx
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() => {
                          setQuizAnswers({ ...quizAnswers, [currentIndex]: idx })
                        }}
                      >
                        {choice}
                      </Button>
                    ))}
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
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {displayItems.length}
            </span>
            {isLast ? (
              phase === "test" || phase === "finaltest" ? (
                <Button 
                  onClick={() => {
                    console.log("Complete button clicked", { sessionId, inProgressSession, currentIndex, moduleItemsLength: module.items.length })
                    handleComplete()
                  }} 
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "완료"}
                </Button>
              ) : (
                <Button 
                  onClick={handleWordlistMemorizeComplete}
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "완료"}
                </Button>
              )
            ) : (
              <Button onClick={handleNext}>
                다음
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
