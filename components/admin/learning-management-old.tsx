"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface LearningModule {
  id: string
  title: string
  type: string
  memo: string | null
  level: { id: string; value: string }
  grade: { id: string; value: string } | null
  items: Array<{ id: string }>
}

interface Code {
  id: string
  category: string
  value: string
}

interface LearningManagementProps {
  initialModules: LearningModule[]
  codes: Code[]
}

export function LearningManagement({
  initialModules,
  codes,
}: LearningManagementProps) {
  const { toast } = useToast()
  const [modules, setModules] = useState(initialModules)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<LearningModule | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    type: "FLASHCARD",
    levelId: "",
    gradeId: "",
    memo: "",
  })
  const [editFormData, setEditFormData] = useState({
    title: "",
    type: "FLASHCARD",
    levelId: "",
    gradeId: "",
    memo: "",
  })

  const handleSubmit = async () => {
    if (!formData.title || !formData.levelId) {
      toast({
        title: "오류",
        description: "제목과 레벨은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/learning-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          levelId: formData.levelId,
          gradeId: formData.gradeId && formData.gradeId !== "" && formData.gradeId !== "none" ? formData.gradeId : null,
          memo: formData.memo || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "생성 실패")
      }

      const newModule = await response.json()
      // 페이지 새로고침하여 최신 데이터 가져오기
      window.location.reload()
      toast({
        title: "성공",
        description: "학습이 생성되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "학습 생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const levelCodes = codes.filter((c) => c.category === "LEVEL")
  const gradeCodes = codes.filter((c) => c.category === "GRADE")

  // 학습 수정 다이얼로그 열기
  const handleOpenEditDialog = (module: LearningModule) => {
    setEditingModule(module)
    setEditFormData({
      title: module.title,
      type: module.type,
      levelId: module.level.id || "",
      gradeId: module.grade?.id || "",
      memo: module.memo || "",
    })
    setIsEditDialogOpen(true)
  }

  // 학습 정보 수정
  const handleUpdateModule = async () => {
    if (!editingModule) return

    if (!editFormData.title.trim() || !editFormData.levelId) {
      toast({
        title: "오류",
        description: "제목과 레벨은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/learning-modules/${editingModule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          type: editFormData.type,
          levelId: editFormData.levelId,
          gradeId: editFormData.gradeId && editFormData.gradeId !== "" && editFormData.gradeId !== "none" ? editFormData.gradeId : null,
          memo: editFormData.memo || null,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "수정 실패")
        } else {
          const text = await response.text()
          console.error("Non-JSON error response:", text)
          throw new Error(`서버 오류가 발생했습니다. (${response.status})`)
        }
      }

      toast({
        title: "성공",
        description: "학습 정보가 수정되었습니다.",
      })

      setIsEditDialogOpen(false)
      setEditingModule(null)
      // 페이지 새로고침하여 최신 데이터 가져오기
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학습 정보 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 수정 다이얼로그 닫기
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingModule(null)
    setEditFormData({
      title: "",
      type: "FLASHCARD",
      levelId: "",
      gradeId: "",
      memo: "",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              학습 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>학습 생성</DialogTitle>
              <DialogDescription>
                새로운 학습 콘텐츠를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>학습명</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 기초 단어 1"
                />
              </div>
              <div>
                <Label>타입</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLASHCARD">플래시카드</SelectItem>
                    <SelectItem value="QUIZ">퀴즈</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>레벨</Label>
                <Select
                  value={formData.levelId}
                  onValueChange={(v) => setFormData({ ...formData, levelId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>학년 (선택)</Label>
                <Select
                  value={formData.gradeId || undefined}
                  onValueChange={(v) => setFormData({ ...formData, gradeId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {gradeCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>메모 (선택)</Label>
                <Textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>학습 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>학년</TableHead>
                <TableHead>아이템 수</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>{module.title}</TableCell>
                  <TableCell>
                    {module.type === "FLASHCARD" ? "플래시카드" : "퀴즈"}
                  </TableCell>
                  <TableCell>{module.level.value}</TableCell>
                  <TableCell>{module.grade?.value || "-"}</TableCell>
                  <TableCell>{module.items.length}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditDialog(module)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 학습 정보 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학습 정보 수정</DialogTitle>
            <DialogDescription>
              학습 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingModule && (
            <div className="space-y-4">
              <div>
                <Label>학습명</Label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="예: 기초 단어 1"
                />
              </div>
              <div>
                <Label>타입</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(v) => setEditFormData({ ...editFormData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLASHCARD">플래시카드</SelectItem>
                    <SelectItem value="QUIZ">퀴즈</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>레벨</Label>
                <Select
                  value={editFormData.levelId}
                  onValueChange={(v) => setEditFormData({ ...editFormData, levelId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>학년 (선택)</Label>
                <Select
                  value={editFormData.gradeId || undefined}
                  onValueChange={(v) => setEditFormData({ ...editFormData, gradeId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {gradeCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>메모 (선택)</Label>
                <Textarea
                  value={editFormData.memo}
                  onChange={(e) => setEditFormData({ ...editFormData, memo: e.target.value })}
                  placeholder="메모를 입력하세요"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              취소
            </Button>
            <Button onClick={handleUpdateModule}>
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
