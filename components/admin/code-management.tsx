"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Minus, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { CodeCategory } from "@prisma/client"

interface Code {
  id: string
  category: CodeCategory
  value: string
  order: number
}

interface CodeManagementProps {
  initialCodes: Code[]
}

export function CodeManagement({ initialCodes }: CodeManagementProps) {
  const { toast } = useToast()
  const [codes, setCodes] = useState(initialCodes || [])
  const [newCategory, setNewCategory] = useState<CodeCategory>("GRADE")
  const [newValue, setNewValue] = useState("")
  const [newOrder, setNewOrder] = useState(0)
  const [editingCode, setEditingCode] = useState<Code | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editOrder, setEditOrder] = useState(0)
  const [newSemesterLevelIds, setNewSemesterLevelIds] = useState<string[]>([])
  const [editSemesterLevelIds, setEditSemesterLevelIds] = useState<string[]>([])
  const [semesterLevelMapBySemester, setSemesterLevelMapBySemester] = useState<Record<string, string[]>>({})
  const [semesterActiveMap, setSemesterActiveMap] = useState<Record<string, boolean>>({})
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const refreshSemesterLevelMaps = async () => {
    try {
      const response = await fetch("/api/admin/semester-level-maps")
      if (!response.ok) return
      const data = await response.json()
      setSemesterLevelMapBySemester(data?.bySemester || {})
    } catch {
      setSemesterLevelMapBySemester({})
    }
  }

  const refreshSemesterStatus = async () => {
    try {
      const response = await fetch("/api/admin/semester-status")
      if (!response.ok) return
      const data = await response.json()
      setSemesterActiveMap(data?.bySemester || {})
    } catch {
      setSemesterActiveMap({})
    }
  }

  // 서버에서 최신 데이터 가져오기 (성공하고 데이터가 있을 때만 업데이트)
  const refreshCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes")
      if (response.ok) {
        const latestCodes = await response.json()
        if (Array.isArray(latestCodes) && latestCodes.length > 0) {
          setCodes(latestCodes)
          console.log("Refreshed codes:", latestCodes.length)
        } else {
          console.log("API returned empty array, keeping existing data")
          // 빈 배열이면 기존 데이터 유지
        }
      } else {
        console.error("Failed to refresh codes: HTTP", response.status)
        // 실패해도 기존 상태 유지
      }
    } catch (error) {
      console.error("Failed to refresh codes:", error)
      // 에러 발생해도 기존 상태 유지
    }
  }

  // initialCodes가 있으면 우선 사용, 없을 때만 API 호출
  useEffect(() => {
    if (!initialCodes || initialCodes.length === 0) {
      console.log("No initial codes, fetching from API")
      refreshCodes()
    } else {
      console.log("Using initial codes:", initialCodes.length)
      setCodes(initialCodes)
    }
    refreshSemesterLevelMaps()
    refreshSemesterStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEdit = (code: Code) => {
    setEditingCode(code)
    setEditValue(code.value)
    setEditOrder(code.order)
    if (code.category === "SEMESTER") {
      setEditSemesterLevelIds(semesterLevelMapBySemester[code.id] || [])
    } else {
      setEditSemesterLevelIds([])
    }
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingCode || !editValue.trim()) {
      toast({
        title: "오류",
        description: "값을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/codes/${editingCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: editValue,
          order: editOrder,
          ...(editingCode.category === "SEMESTER" && { levelIds: editSemesterLevelIds }),
        }),
      })

      if (!response.ok) {
        throw new Error("수정 실패")
      }

      await refreshCodes()
      await refreshSemesterLevelMaps()
      await refreshSemesterStatus()
      setIsEditDialogOpen(false)
      setEditingCode(null)
      toast({
        title: "성공",
        description: "코드값이 수정되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "코드값 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAdd = async () => {
    if (!newValue.trim()) {
      toast({
        title: "오류",
        description: "값을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (newCategory === "SEMESTER" && newSemesterLevelIds.length === 0) {
      toast({
        title: "오류",
        description: "학기에 사용할 레벨을 1개 이상 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          value: newValue,
          order: newOrder,
          ...(newCategory === "SEMESTER" && { levelIds: newSemesterLevelIds }),
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (parseError) {
          const text = await response.text()
          console.error("Failed to parse error response:", {
            status: response.status,
            statusText: response.statusText,
            text,
          })
          throw new Error(`서버 오류 (${response.status}): ${response.statusText}`)
        }
        
        console.error("Code creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        })
        
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "추가 실패"
        throw new Error(errorMessage)
      }

      const newCode = await response.json()
      // 성공한 경우에만 새로고침
      await refreshCodes()
      await refreshSemesterLevelMaps()
      await refreshSemesterStatus()
      setNewValue("")
      setNewOrder(0)
      setNewSemesterLevelIds([])
      toast({
        title: "성공",
        description: "코드값이 추가되었습니다.",
      })
    } catch (error: any) {
      console.error("Code creation error:", error)
      const errorMessage = error.message || "코드값 추가에 실패했습니다."
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      })
      // 실패 시 refreshCodes를 호출하지 않음 (기존 상태 유지)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/admin/codes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      await refreshCodes() // 서버에서 최신 데이터 가져오기
      await refreshSemesterLevelMaps()
      await refreshSemesterStatus()
      toast({
        title: "성공",
        description: "코드값이 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "코드값 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const gradeCodes = codes.filter((c) => c.category === "GRADE")
  const levelCodes = codes.filter((c) => c.category === "LEVEL")
  const semesterCodes = codes.filter((c) => c.category === "SEMESTER")

  const toggleNewSemesterLevel = (levelId: string, checked: boolean) => {
    if (checked) {
      setNewSemesterLevelIds((prev) => Array.from(new Set([...prev, levelId])))
      return
    }
    setNewSemesterLevelIds((prev) => prev.filter((id) => id !== levelId))
  }

  const toggleEditSemesterLevel = (levelId: string, checked: boolean) => {
    if (checked) {
      setEditSemesterLevelIds((prev) => Array.from(new Set([...prev, levelId])))
      return
    }
    setEditSemesterLevelIds((prev) => prev.filter((id) => id !== levelId))
  }

  const handleSemesterStatusToggle = async (semesterId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/semester-status/${semesterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!response.ok) {
        throw new Error("상태 변경 실패")
      }
      setSemesterActiveMap((prev) => ({ ...prev, [semesterId]: isActive }))
      toast({
        title: "성공",
        description: isActive ? "학기 상태를 ON으로 변경했습니다." : "학기 상태를 OFF로 변경했습니다.",
      })
    } catch {
      toast({
        title: "오류",
        description: "학기 상태 변경에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코드값 수정</DialogTitle>
            <DialogDescription>
              코드값을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>값</Label>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="예: 1학년, Level 1"
              />
            </div>
            <div>
              <Label>순서</Label>
              <Input
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            {editingCode?.category === "SEMESTER" && (
              <div>
                <Label>사용 레벨 선택</Label>
                <div className="mt-2 max-h-40 overflow-y-auto rounded border p-3 space-y-2">
                  {levelCodes.map((level) => {
                    const checked = editSemesterLevelIds.includes(level.id)
                    return (
                      <label key={level.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleEditSemesterLevel(level.id, v === true)}
                        />
                        <span>{level.value}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleUpdate}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>코드값 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>카테고리</Label>
              <Select 
                value={newCategory} 
                onValueChange={(v) => {
                  console.log("Category changed:", v)
                  setNewCategory(v as CodeCategory)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRADE">학년</SelectItem>
                  <SelectItem value="LEVEL">레벨</SelectItem>
                  <SelectItem value="SEMESTER">학기</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>값</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="예: 1학년, Level 1"
              />
            </div>
            <div className="w-24">
              <Label>순서</Label>
              <Input
                type="number"
                value={newOrder}
                onChange={(e) => setNewOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Add button clicked")
                  handleAdd()
                }}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                추가
              </Button>
            </div>
          </div>
          {newCategory === "SEMESTER" && (
            <div className="mt-4">
              <Label>학기에 사용할 레벨</Label>
              <div className="mt-2 max-h-44 overflow-y-auto rounded border p-3 space-y-2">
                {levelCodes.map((level) => {
                  const checked = newSemesterLevelIds.includes(level.id)
                  return (
                    <label key={level.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleNewSemesterLevel(level.id, v === true)}
                      />
                      <span>{level.value}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                선택한 학기 사용 시 학생 화면에는 체크한 레벨만 표시됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>학년</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>값</TableHead>
                  <TableHead>순서</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>{code.value}</TableCell>
                    <TableCell>{code.order}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>레벨</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>값</TableHead>
                  <TableHead>순서</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>{code.value}</TableCell>
                    <TableCell>{code.order}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>학기</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>값</TableHead>
                  <TableHead>순서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>연결 레벨</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semesterCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>{code.value}</TableCell>
                    <TableCell>{code.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {(semesterActiveMap[code.id] ?? true) ? "ON" : "OFF"}
                        </span>
                        <Switch
                          checked={semesterActiveMap[code.id] ?? true}
                          onCheckedChange={(checked) => handleSemesterStatusToggle(code.id, checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(semesterLevelMapBySemester[code.id] || [])
                        .map((levelId) => levelCodes.find((l) => l.id === levelId)?.value || null)
                        .filter(Boolean)
                        .join(", ") || "전체"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(code)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
