"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Minus, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  const [codes, setCodes] = useState(initialCodes)
  const [newCategory, setNewCategory] = useState<CodeCategory>("GRADE")
  const [newValue, setNewValue] = useState("")
  const [newOrder, setNewOrder] = useState(0)
  const [editingCode, setEditingCode] = useState<Code | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editOrder, setEditOrder] = useState(0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // 서버에서 최신 데이터 가져오기
  const refreshCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes")
      if (response.ok) {
        const latestCodes = await response.json()
        if (Array.isArray(latestCodes) && latestCodes.length > 0) {
          setCodes(latestCodes)
        } else if (Array.isArray(latestCodes)) {
          // 빈 배열인 경우에만 업데이트 (실제로 데이터가 없는 경우)
          setCodes(latestCodes)
        }
        // 응답이 실패하거나 유효하지 않으면 기존 상태 유지
      } else {
        console.error("Failed to refresh codes: HTTP", response.status)
        // 실패해도 기존 상태 유지
      }
    } catch (error) {
      console.error("Failed to refresh codes:", error)
      // 에러 발생해도 기존 상태 유지
    }
  }

  const handleEdit = (code: Code) => {
    setEditingCode(code)
    setEditValue(code.value)
    setEditOrder(code.order)
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
        }),
      })

      if (!response.ok) {
        throw new Error("수정 실패")
      }

      await refreshCodes()
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

    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          value: newValue,
          order: newOrder,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "추가 실패" }))
        console.error("Code creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        })
        throw new Error(errorData.error || errorData.details || "추가 실패")
      }

      const newCode = await response.json()
      // 성공한 경우에만 새로고침
      await refreshCodes()
      setNewValue("")
      setNewOrder(0)
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
      </div>
    </div>
  )
}
