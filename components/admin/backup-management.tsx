"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Download, Upload, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function BackupManagement() {
  const { toast } = useToast()
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/admin/backup/export")
      
      if (!response.ok) {
        throw new Error("백업 생성에 실패했습니다.")
      }

      // 파일 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `backup-${new Date().toISOString().split("T")[0]}.json`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "성공",
        description: "백업 파일이 다운로드되었습니다.",
      })
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "오류",
        description: error.message || "백업 생성에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "오류",
        description: "백업 파일을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    // 확인 대화상자
    if (
      !confirm(
        "경고: 백업을 복원하면 현재 모든 데이터가 삭제되고 백업 데이터로 대체됩니다.\n이 작업은 되돌릴 수 없습니다.\n\n정말로 복원하시겠습니까?"
      )
    ) {
      return
    }

    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/admin/backup/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "백업 복원에 실패했습니다.")
      }

      toast({
        title: "성공",
        description: "백업이 성공적으로 복원되었습니다. 페이지를 새로고침합니다.",
      })

      setIsImportDialogOpen(false)
      setSelectedFile(null)

      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error("Import error:", error)
      toast({
        title: "오류",
        description: error.message || "백업 복원에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">데이터 백업 및 복원</h1>
        <p className="text-muted-foreground">
          모든 데이터를 백업하고 복원할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>백업 다운로드</CardTitle>
            <CardDescription>
              현재 데이터베이스의 모든 데이터를 JSON 파일로 다운로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "백업 생성 중..." : "백업 다운로드"}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              백업 파일에는 다음 데이터가 포함됩니다:
              <br />
              • 코드값, 캠퍼스, 선생님, 관리자
              <br />
              • 클래스, 학생, 학습 콘텐츠
              <br />
              • 배정, 진행도, 성적 데이터
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>백업 복원</CardTitle>
            <CardDescription>
              백업 파일을 업로드하여 데이터를 복원합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setIsImportDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              백업 파일 선택
            </Button>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">주의사항</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>복원 시 현재 모든 데이터가 삭제됩니다.</li>
                    <li>이 작업은 되돌릴 수 없습니다.</li>
                    <li>복원 전에 반드시 백업을 다운로드하세요.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>백업 파일 업로드</DialogTitle>
            <DialogDescription>
              백업 JSON 파일을 선택하여 데이터를 복원합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="backup-file">백업 파일</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  setSelectedFile(file || null)
                }}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  선택된 파일: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false)
                setSelectedFile(null)
              }}
              disabled={isImporting}
            >
              취소
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              variant="destructive"
            >
              {isImporting ? "복원 중..." : "복원하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
