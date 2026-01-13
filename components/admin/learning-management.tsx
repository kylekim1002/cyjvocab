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
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import * as XLSX from "xlsx"

interface LearningItem {
  word_text: string
  choice1: string
  choice2: string
  choice3: string
  choice4: string
  correct_index: number
  image_url?: string
  image_file?: File | null
}

interface LearningModule {
  id: string
  title: string
  type: string
  memo: string | null
  level: { id: string; value: string }
  grade: { id: string; value: string } | null
  items: Array<{ id: string; order: number; payloadJson: any }>
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
    type: "TYPE_A",
    levelId: "",
    gradeId: "",
    memo: "",
  })
  const [items, setItems] = useState<LearningItem[]>([])
  const [editFormData, setEditFormData] = useState({
    title: "",
    type: "TYPE_A",
    levelId: "",
    gradeId: "",
    memo: "",
  })
  const [editItems, setEditItems] = useState<LearningItem[]>([])
  const [isExcelUpload, setIsExcelUpload] = useState(false)

  const levelCodes = codes.filter((c) => c.category === "LEVEL")
  const gradeCodes = codes.filter((c) => c.category === "GRADE")

  // 문항 추가
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        word_text: "",
        choice1: "",
        choice2: "",
        choice3: "",
        choice4: "",
        correct_index: 0,
        image_url: "",
      },
    ])
  }

  // 문항 삭제
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 문항 업데이트
  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // 이미지 파일 변경
  const handleImageFileChange = (index: number, file: File | null) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      image_file: file,
      image_url: file ? undefined : newItems[index].image_url,
    }
    setItems(newItems)
  }

  // 학습 생성
  const handleSubmit = async () => {
    if (!formData.title || !formData.levelId) {
      toast({
        title: "오류",
        description: "제목과 레벨은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: "오류",
        description: "최소 1개 이상의 문항이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    // 문항 검증
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.word_text.trim()) {
        toast({
          title: "오류",
          description: `문항 ${i + 1}: 단어를 입력해주세요.`,
          variant: "destructive",
        })
        return
      }
      if (!item.choice1.trim() || !item.choice2.trim() || !item.choice3.trim() || !item.choice4.trim()) {
        toast({
          title: "오류",
          description: `문항 ${i + 1}: 보기 4개를 모두 입력해주세요.`,
          variant: "destructive",
        })
        return
      }
      if (formData.type === "TYPE_B") {
        if (item.image_file && item.image_url) {
          toast({
            title: "오류",
            description: `문항 ${i + 1}: 이미지 파일과 URL을 동시에 입력할 수 없습니다.`,
            variant: "destructive",
          })
          return
        }
        if (!item.image_file && !item.image_url) {
          toast({
            title: "오류",
            description: `문항 ${i + 1}: TYPE_B는 이미지 파일 또는 URL이 필요합니다.`,
            variant: "destructive",
          })
          return
        }
      }
    }

    try {
      // 이미지 파일이 있는 경우 업로드 (나중에 Supabase Storage 연동)
      const itemsToSubmit = await Promise.all(
        items.map(async (item) => {
          let imageUrl = item.image_url || null
          
          if (item.image_file) {
            // TODO: Supabase Storage에 업로드
            // 임시로 URL 생성 (실제로는 업로드 후 URL 반환)
            toast({
              title: "알림",
              description: "이미지 업로드 기능은 준비 중입니다.",
            })
          }

          return {
            word_text: item.word_text.trim(),
            choice1: item.choice1.trim(),
            choice2: item.choice2.trim(),
            choice3: item.choice3.trim(),
            choice4: item.choice4.trim(),
            correct_index: item.correct_index,
            image_url: imageUrl?.trim() || null,
          }
        })
      )

      const response = await fetch("/api/admin/learning-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          levelId: formData.levelId,
          gradeId: formData.gradeId && formData.gradeId !== "" && formData.gradeId !== "none" ? formData.gradeId : null,
          memo: formData.memo || null,
          items: itemsToSubmit,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "생성 실패")
      }

      toast({
        title: "성공",
        description: "학습이 생성되었습니다.",
      })

      setIsDialogOpen(false)
      setFormData({
        title: "",
        type: "TYPE_A",
        levelId: "",
        gradeId: "",
        memo: "",
      })
      setItems([])
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학습 생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 엑셀 템플릿 다운로드
  const handleDownloadTemplate = () => {
    const template = [
      {
        type: "TYPE_A",
        word_text: "apple",
        image_url: "",
        choice1: "사과",
        choice2: "바나나",
        choice3: "오렌지",
        choice4: "포도",
        correct_choice: 1,
      },
      {
        type: "TYPE_B",
        word_text: "book",
        image_url: "https://example.com/book.jpg",
        choice1: "책",
        choice2: "펜",
        choice3: "책상",
        choice4: "의자",
        correct_choice: 1,
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "학습 문항")
    XLSX.writeFile(wb, "학습_문항_템플릿.xlsx")
  }

  // 엑셀 업로드
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]

      const errors: Array<{ row: number; reason: string }> = []
      const parsedItems: LearningItem[] = []

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNum = i + 2

        // 타입 검증
        if (row.type !== formData.type) {
          errors.push({
            row: rowNum,
            reason: `타입이 학습 타입(${formData.type})과 일치하지 않습니다.`,
          })
          continue
        }

        // TYPE_A 검증: image_url 비어있어야 함
        if (formData.type === "TYPE_A" && row.image_url) {
          errors.push({
            row: rowNum,
            reason: "TYPE_A는 image_url이 비어있어야 합니다.",
          })
          continue
        }

        // TYPE_B 검증: image_url 필요
        if (formData.type === "TYPE_B" && !row.image_url) {
          errors.push({
            row: rowNum,
            reason: "TYPE_B는 image_url이 필요합니다.",
          })
          continue
        }

        // 필수 필드 검증
        if (!row.word_text || !row.choice1 || !row.choice2 || !row.choice3 || !row.choice4) {
          errors.push({
            row: rowNum,
            reason: "필수 필드가 누락되었습니다.",
          })
          continue
        }

        // correct_choice 검증
        const correctChoice = parseInt(row.correct_choice)
        if (isNaN(correctChoice) || correctChoice < 1 || correctChoice > 4) {
          errors.push({
            row: rowNum,
            reason: "correct_choice는 1~4 사이의 값이어야 합니다.",
          })
          continue
        }

        parsedItems.push({
          word_text: row.word_text,
          choice1: row.choice1,
          choice2: row.choice2,
          choice3: row.choice3,
          choice4: row.choice4,
          correct_index: correctChoice - 1, // 0-based index
          image_url: row.image_url || undefined,
        })
      }

      if (errors.length > 0) {
        const errorMsg = errors.map((e) => `행 ${e.row}: ${e.reason}`).join("\n")
        toast({
          title: "오류",
          description: `조건이 맞지 않습니다.\n${errorMsg}`,
          variant: "destructive",
        })
        return
      }

      setItems(parsedItems)
      setIsExcelUpload(false)
      toast({
        title: "성공",
        description: `${parsedItems.length}개의 문항이 업로드되었습니다.`,
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "엑셀 파일을 읽는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학습 수정 다이얼로그 열기
  const handleOpenEditDialog = (module: LearningModule) => {
    setEditingModule(module)
    setEditFormData({
      title: module.title,
      type: module.type,
      levelId: module.level.id,
      gradeId: module.grade?.id || "",
      memo: module.memo || "",
    })
    
    // 기존 문항 로드
    const loadedItems: LearningItem[] = module.items.map((item) => ({
      word_text: item.payloadJson.word_text || "",
      choice1: item.payloadJson.choice1 || "",
      choice2: item.payloadJson.choice2 || "",
      choice3: item.payloadJson.choice3 || "",
      choice4: item.payloadJson.choice4 || "",
      correct_index: item.payloadJson.correct_index || 0,
      image_url: item.payloadJson.image_url || undefined,
    }))
    setEditItems(loadedItems)
    setIsEditDialogOpen(true)
  }

  // 학습 수정
  const handleUpdateModule = async () => {
    if (!editingModule) return

    if (!editFormData.title || !editFormData.levelId) {
      toast({
        title: "오류",
        description: "제목과 레벨은 필수입니다.",
        variant: "destructive",
      })
      return
    }

    if (editItems.length === 0) {
      toast({
        title: "오류",
        description: "최소 1개 이상의 문항이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    // 문항 검증
    for (let i = 0; i < editItems.length; i++) {
      const item = editItems[i]
      if (!item.word_text.trim()) {
        toast({
          title: "오류",
          description: `문항 ${i + 1}: 단어를 입력해주세요.`,
          variant: "destructive",
        })
        return
      }
      if (!item.choice1.trim() || !item.choice2.trim() || !item.choice3.trim() || !item.choice4.trim()) {
        toast({
          title: "오류",
          description: `문항 ${i + 1}: 보기 4개를 모두 입력해주세요.`,
          variant: "destructive",
        })
        return
      }
      if (editFormData.type === "TYPE_B") {
        if (item.image_file && item.image_url) {
          toast({
            title: "오류",
            description: `문항 ${i + 1}: 이미지 파일과 URL을 동시에 입력할 수 없습니다.`,
            variant: "destructive",
          })
          return
        }
        if (!item.image_file && !item.image_url) {
          toast({
            title: "오류",
            description: `문항 ${i + 1}: TYPE_B는 이미지 파일 또는 URL이 필요합니다.`,
            variant: "destructive",
          })
          return
        }
      }
    }

    try {
      const itemsToSubmit = await Promise.all(
        editItems.map(async (item) => {
          let imageUrl = item.image_url || null
          if (item.image_file) {
            // TODO: 이미지 업로드
          }
          return {
            word_text: item.word_text.trim(),
            choice1: item.choice1.trim(),
            choice2: item.choice2.trim(),
            choice3: item.choice3.trim(),
            choice4: item.choice4.trim(),
            correct_index: item.correct_index,
            image_url: imageUrl?.trim() || null,
          }
        })
      )

      const response = await fetch(`/api/admin/learning-modules/${editingModule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          type: editFormData.type,
          levelId: editFormData.levelId,
          gradeId: editFormData.gradeId && editFormData.gradeId !== "none" ? editFormData.gradeId : null,
          memo: editFormData.memo || null,
          items: itemsToSubmit,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "수정 실패")
      }

      toast({
        title: "성공",
        description: "학습 정보가 수정되었습니다.",
      })

      setIsEditDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학습 정보 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>학습 생성</DialogTitle>
              <DialogDescription>
                새로운 학습 콘텐츠를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>학습명 *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 기초 단어 1"
                />
              </div>
              <div>
                <Label>타입 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => {
                    setFormData({ ...formData, type: v })
                    setItems([]) // 타입 변경 시 문항 초기화
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TYPE_A">단어+뜻</SelectItem>
                    <SelectItem value="TYPE_B">그림+단어+뜻</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>레벨 *</Label>
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

              {/* 문항 입력 섹션 */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label>문항 입력</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      템플릿 다운로드
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExcelUpload(!isExcelUpload)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      엑셀 업로드
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      문항 추가
                    </Button>
                  </div>
                </div>

                {isExcelUpload && (
                  <div className="mb-4 p-4 border rounded">
                    <Label>엑셀 파일 업로드</Label>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      컬럼: type, word_text, image_url (TYPE_B만), choice1, choice2, choice3, choice4, correct_choice (1~4)
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <Label>문항 {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label>단어 (문항) *</Label>
                          <Input
                            value={item.word_text}
                            onChange={(e) => handleUpdateItem(index, "word_text", e.target.value)}
                            placeholder="단어 입력"
                          />
                        </div>
                        {formData.type === "TYPE_B" && (
                          <div className="space-y-2">
                            <Label>이미지 (파일 또는 URL 중 하나만)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileChange(index, e.target.files?.[0] || null)}
                            />
                            <Input
                              value={item.image_url || ""}
                              onChange={(e) => handleUpdateItem(index, "image_url", e.target.value)}
                              placeholder="이미지 URL 입력"
                              disabled={!!item.image_file}
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>보기 1 *</Label>
                            <Input
                              value={item.choice1}
                              onChange={(e) => handleUpdateItem(index, "choice1", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>보기 2 *</Label>
                            <Input
                              value={item.choice2}
                              onChange={(e) => handleUpdateItem(index, "choice2", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>보기 3 *</Label>
                            <Input
                              value={item.choice3}
                              onChange={(e) => handleUpdateItem(index, "choice3", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>보기 4 *</Label>
                            <Input
                              value={item.choice4}
                              onChange={(e) => handleUpdateItem(index, "choice4", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>정답 *</Label>
                          <Select
                            value={item.correct_index.toString()}
                            onValueChange={(v) => handleUpdateItem(index, "correct_index", parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">보기 1</SelectItem>
                              <SelectItem value="1">보기 2</SelectItem>
                              <SelectItem value="2">보기 3</SelectItem>
                              <SelectItem value="3">보기 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
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
                <TableHead>문항 수</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell>{module.title}</TableCell>
                  <TableCell>
                    {module.type === "TYPE_A" ? "단어+뜻" : "그림+단어+뜻"}
                  </TableCell>
                  <TableCell>{module.level.value}</TableCell>
                  <TableCell>{module.grade?.value || "-"}</TableCell>
                  <TableCell>{module.items.length}</TableCell>
                  <TableCell>
                    {new Date((module as any).createdAt).toLocaleDateString("ko-KR")}
                  </TableCell>
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

      {/* 학습 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학습 정보 수정</DialogTitle>
            <DialogDescription>
              학습 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingModule && (
            <>
              <div className="space-y-4">
                <div>
                  <Label>학습명 *</Label>
                  <Input
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    placeholder="예: 기초 단어 1"
                  />
                </div>
                <div>
                  <Label>타입 *</Label>
                  <Select
                    value={editFormData.type}
                    onValueChange={(v) => {
                      setEditFormData({ ...editFormData, type: v })
                      setEditItems([]) // 타입 변경 시 문항 초기화
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TYPE_A">단어+뜻</SelectItem>
                      <SelectItem value="TYPE_B">그림+단어+뜻</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>레벨 *</Label>
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

                {/* 문항 편집 섹션 - 생성과 동일한 구조 */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label>문항 편집</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditItems([
                          ...editItems,
                          {
                            word_text: "",
                            choice1: "",
                            choice2: "",
                            choice3: "",
                            choice4: "",
                            correct_index: 0,
                            image_url: "",
                          },
                        ])
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      문항 추가
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {editItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <Label>문항 {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label>단어 (문항) *</Label>
                            <Input
                              value={item.word_text}
                              onChange={(e) => {
                                const newItems = [...editItems]
                                newItems[index] = { ...newItems[index], word_text: e.target.value }
                                setEditItems(newItems)
                              }}
                              placeholder="단어 입력"
                            />
                          </div>
                          {editFormData.type === "TYPE_B" && (
                            <div className="space-y-2">
                              <Label>이미지 (파일 또는 URL 중 하나만)</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = {
                                    ...newItems[index],
                                    image_file: e.target.files?.[0] || null,
                                    image_url: e.target.files?.[0] ? undefined : newItems[index].image_url,
                                  }
                                  setEditItems(newItems)
                                }}
                              />
                              <Input
                                value={item.image_url || ""}
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = { ...newItems[index], image_url: e.target.value }
                                  setEditItems(newItems)
                                }}
                                placeholder="이미지 URL 입력"
                                disabled={!!item.image_file}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label>보기 1 *</Label>
                              <Input
                                value={item.choice1}
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = { ...newItems[index], choice1: e.target.value }
                                  setEditItems(newItems)
                                }}
                              />
                            </div>
                            <div>
                              <Label>보기 2 *</Label>
                              <Input
                                value={item.choice2}
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = { ...newItems[index], choice2: e.target.value }
                                  setEditItems(newItems)
                                }}
                              />
                            </div>
                            <div>
                              <Label>보기 3 *</Label>
                              <Input
                                value={item.choice3}
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = { ...newItems[index], choice3: e.target.value }
                                  setEditItems(newItems)
                                }}
                              />
                            </div>
                            <div>
                              <Label>보기 4 *</Label>
                              <Input
                                value={item.choice4}
                                onChange={(e) => {
                                  const newItems = [...editItems]
                                  newItems[index] = { ...newItems[index], choice4: e.target.value }
                                  setEditItems(newItems)
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>정답 *</Label>
                            <Select
                              value={item.correct_index.toString()}
                              onValueChange={(v) => {
                                const newItems = [...editItems]
                                newItems[index] = { ...newItems[index], correct_index: parseInt(v) }
                                setEditItems(newItems)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">보기 1</SelectItem>
                                <SelectItem value="1">보기 2</SelectItem>
                                <SelectItem value="2">보기 3</SelectItem>
                                <SelectItem value="3">보기 4</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleUpdateModule}>수정</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
