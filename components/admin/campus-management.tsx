"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Minus, Edit } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Teacher {
  id: string
  name: string
}

interface Campus {
  id: string
  name: string
  teachers: Teacher[]
}

interface CampusManagementProps {
  initialCampuses: Campus[]
}

export function CampusManagement({ initialCampuses }: CampusManagementProps) {
  const { toast } = useToast()
  const [campuses, setCampuses] = useState(initialCampuses || [])
  
  // 컴포넌트 마운트 시 항상 서버에서 최신 데이터 가져오기
  useEffect(() => {
    refreshCampuses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [newCampusName, setNewCampusName] = useState("")
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null)
  const [newTeacherName, setNewTeacherName] = useState("")
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<{ id: string; name: string; campusId: string } | null>(null)
  const [editTeacherName, setEditTeacherName] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // 서버에서 최신 데이터 가져오기
  const refreshCampuses = async () => {
    try {
      const response = await fetch("/api/admin/campus")
      if (response.ok) {
        const latestCampuses = await response.json()
        setCampuses(latestCampuses)
      }
    } catch (error) {
      console.error("Failed to refresh campuses:", error)
    }
  }

  const handleAddCampus = async () => {
    if (!newCampusName.trim()) {
      toast({
        title: "오류",
        description: "캠퍼스명을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/campus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampusName }),
      })

      if (!response.ok) {
        throw new Error("추가 실패")
      }

      const newCampus = await response.json()
      await refreshCampuses() // 서버에서 최신 데이터 가져오기
      setNewCampusName("")
      toast({
        title: "성공",
        description: "캠퍼스가 추가되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "캠퍼스 추가에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCampus = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.")) return

    try {
      const response = await fetch(`/api/admin/campus/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      await refreshCampuses() // 서버에서 최신 데이터 가져오기
      toast({
        title: "성공",
        description: "캠퍼스가 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "캠퍼스 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAddTeacher = async () => {
    if (!selectedCampus || !newTeacherName.trim()) {
      toast({
        title: "오류",
        description: "캠퍼스와 선생님명을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: selectedCampus,
          name: newTeacherName,
        }),
      })

      if (!response.ok) {
        throw new Error("추가 실패")
      }

      const newTeacher = await response.json()
      await refreshCampuses() // 서버에서 최신 데이터 가져오기
      setNewTeacherName("")
      setIsTeacherDialogOpen(false)
      setSelectedCampus(null)
      toast({
        title: "성공",
        description: "선생님이 추가되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "선생님 추가에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleEditTeacher = (teacher: { id: string; name: string }, campusId: string) => {
    setEditingTeacher({ ...teacher, campusId })
    setEditTeacherName(teacher.name)
    setIsEditDialogOpen(true)
  }

  const handleUpdateTeacher = async () => {
    if (!editingTeacher || !editTeacherName.trim()) {
      toast({
        title: "오류",
        description: "선생님명을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTeacherName }),
      })

      if (!response.ok) {
        throw new Error("수정 실패")
      }

      await refreshCampuses()
      setIsEditDialogOpen(false)
      setEditingTeacher(null)
      toast({
        title: "성공",
        description: "선생님명이 수정되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "선생님명 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTeacher = async (campusId: string, teacherId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      await refreshCampuses() // 서버에서 최신 데이터 가져오기
      toast({
        title: "성공",
        description: "선생님이 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "선생님 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선생님명 수정</DialogTitle>
            <DialogDescription>
              선생님명을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>선생님명</Label>
              <Input
                value={editTeacherName}
                onChange={(e) => setEditTeacherName(e.target.value)}
                placeholder="선생님 이름"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button type="button" onClick={handleUpdateTeacher}>수정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>캠퍼스 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>캠퍼스명</Label>
              <Input
                value={newCampusName}
                onChange={(e) => setNewCampusName(e.target.value)}
                placeholder="예: 강남캠퍼스"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddCampus}>
                <Plus className="h-4 w-4 mr-2" />
                추가
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {campuses.map((campus) => (
          <Card key={campus.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{campus.name}</CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCampus(campus.id)}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">선생님 목록</h3>
                  <Dialog open={isTeacherDialogOpen && selectedCampus === campus.id} onOpenChange={(open) => {
                    setIsTeacherDialogOpen(open)
                    if (open) {
                      setSelectedCampus(campus.id)
                    } else {
                      setSelectedCampus(null)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        선생님 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>선생님 추가</DialogTitle>
                        <DialogDescription>
                          {campus.name}에 선생님을 추가합니다.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>선생님명</Label>
                          <Input
                            value={newTeacherName}
                            onChange={(e) => setNewTeacherName(e.target.value)}
                            placeholder="선생님 이름"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={handleAddTeacher}>추가</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campus.teachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>{teacher.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTeacher(teacher, campus.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTeacher(campus.id, teacher.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
