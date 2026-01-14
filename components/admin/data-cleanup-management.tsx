"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Search, Trash2, AlertTriangle } from "lucide-react"

interface Campus {
  id: string
  name: string
}

interface DataCleanupManagementProps {
  campuses: Campus[]
}

export function DataCleanupManagement({ campuses }: DataCleanupManagementProps) {
  const { toast } = useToast()
  const [campusId, setCampusId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [previewData, setPreviewData] = useState<{
    campusName: string
    dateFrom: string
    dateTo: string
  } | null>(null)
  const [confirmText, setConfirmText] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 조회
  const handlePreview = async () => {
    if (!campusId) {
      toast({
        title: "오류",
        description: "캠퍼스를 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!dateFrom || !dateTo) {
      toast({
        title: "오류",
        description: "조회 기간을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/data-cleanup/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campus_id: campusId,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "조회에 실패했습니다.")
      }

      const data = await response.json()
      setPreviewData(data)
      setConfirmText("") // 확인 텍스트 초기화
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "조회에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 삭제 실행
  const handleExecute = async () => {
    if (!campusId || !dateFrom || !dateTo) {
      toast({
        title: "오류",
        description: "조건을 모두 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    if (confirmText !== "DELETE") {
      toast({
        title: "오류",
        description: "확인 텍스트를 정확히 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setDeleting(true)
    try {
      const response = await fetch("/api/admin/data-cleanup/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campus_id: campusId,
          date_from: dateFrom,
          date_to: dateTo,
          confirm_text: confirmText,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "삭제에 실패했습니다.")
      }

      const data = await response.json()
      toast({
        title: "성공",
        description: data.message || "데이터 정리가 완료되었습니다.",
      })

      // 초기화
      setCampusId("")
      setDateFrom("")
      setDateTo("")
      setPreviewData(null)
      setConfirmText("")
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "삭제에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    setPreviewData(null)
    setConfirmText("")
  }

  return (
    <div className="space-y-6">
      {/* 조회 조건 */}
      <Card>
        <CardHeader>
          <CardTitle>삭제 대상 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 캠퍼스 선택 */}
            <div>
              <Label>캠퍼스 *</Label>
              <Select value={campusId} onValueChange={setCampusId}>
                <SelectTrigger>
                  <SelectValue placeholder="캠퍼스 선택" />
                </SelectTrigger>
                <SelectContent>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 시작일 */}
            <div>
              <Label>시작일 *</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* 종료일 */}
            <div>
              <Label>종료일 *</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handlePreview} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              조회
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 조회 결과 및 확인 */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle>삭제 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                선택한 기간의 학습 및 성적 데이터가 삭제됩니다.
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="font-semibold">캠퍼스:</Label>
                <p>{previewData.campusName}</p>
              </div>
              <div>
                <Label className="font-semibold">기간:</Label>
                <p>
                  {new Date(previewData.dateFrom).toLocaleDateString("ko-KR")} ~{" "}
                  {new Date(previewData.dateTo).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">정말로 삭제하시겠습니까?</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE를 입력하세요"
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">
                삭제를 확인하려면 위 입력창에 <strong>DELETE</strong>를 입력하세요.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExecute}
                disabled={deleting || confirmText !== "DELETE"}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? "삭제 중..." : "예"}
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={deleting}>
                아니요
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
