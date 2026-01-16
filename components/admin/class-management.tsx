"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Users, BookOpen, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

interface Class {
  id: string
  name: string
  createdAt: Date
  campus: { id: string; name: string }
  level: { value: string }
  grade: { value: string }
  teacher: { name: string }
}

interface Campus {
  id: string
  name: string
  teachers: Array<{ id: string; name: string }>
}

interface Code {
  id: string
  category: string
  value: string
}

interface ClassManagementProps {
  initialClasses: Class[]
  campuses: Campus[]
  codes: Code[]
}

export function ClassManagement({
  initialClasses,
  campuses,
  codes,
}: ClassManagementProps) {
  const { toast } = useToast()
  const [classes, setClasses] = useState(initialClasses)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isStudentAssignDialogOpen, setIsStudentAssignDialogOpen] = useState(false)
  const [isLearningAssignDialogOpen, setIsLearningAssignDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    campusId: "",
    levelId: "",
    gradeId: "",
    teacherId: "",
  })
  const [selectedCampusTeachers, setSelectedCampusTeachers] = useState<
    Array<{ id: string; name: string }>
  >([])
  
  // 학생 배치 관련 상태
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [assignedStudents, setAssignedStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentFilter, setStudentFilter] = useState({ name: "", gradeId: "all", levelId: "all", campusId: "" })
  
  // 학습 등록 관련 상태
  const [levels, setLevels] = useState<Code[]>([])
  const [selectedLevelId, setSelectedLevelId] = useState("")
  const [availableModules, setAvailableModules] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [assignmentForm, setAssignmentForm] = useState({ date: "", moduleIds: [] as string[] })
  const [newModuleIds, setNewModuleIds] = useState<string[]>([])
  
  // 클래스 펼침/접힘 상태
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set())
  const [classStudents, setClassStudents] = useState<Record<string, any[]>>({})
  
  // 조회 필터 상태
  const [filterCampusId, setFilterCampusId] = useState<string>("")
  const [filterType, setFilterType] = useState<"all" | "level" | "grade" | "teacher">("all")
  const [filterValue, setFilterValue] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  // 디버깅: 다이얼로그 상태 변경 추적
  useEffect(() => {
    console.log("isStudentAssignDialogOpen changed:", isStudentAssignDialogOpen)
  }, [isStudentAssignDialogOpen])

  useEffect(() => {
    console.log("isLearningAssignDialogOpen changed:", isLearningAssignDialogOpen)
  }, [isLearningAssignDialogOpen])

  const handleCampusChange = (campusId: string) => {
    const campus = campuses.find((c) => c.id === campusId)
    const teachers = campus?.teachers || []
    setSelectedCampusTeachers(teachers)
    setFormData({ ...formData, campusId, teacherId: "" })
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.campusId || !formData.levelId || !formData.gradeId || !formData.teacherId) {
      toast({
        title: "오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("생성 실패")
      }

      const newClass = await response.json()
      // 페이지 새로고침하여 최신 데이터 가져오기
      window.location.reload()
      toast({
        title: "성공",
        description: "클래스가 생성되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "클래스 생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? 종강 처리됩니다.")) return

    try {
      const response = await fetch(`/api/admin/classes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      // 페이지 새로고침하여 최신 데이터 가져오기
      window.location.reload()
      toast({
        title: "성공",
        description: "클래스가 종강 처리되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "클래스 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const levelCodes = codes.filter((c) => c.category === "LEVEL")
  const gradeCodes = codes.filter((c) => c.category === "GRADE")
  
  // 조회 함수
  const handleSearch = async () => {
    if (!filterCampusId) {
      toast({
        title: "오류",
        description: "캠퍼스를 선택해주세요.",
        variant: "destructive",
      })
      return
    }
    
    if (filterType !== "all" && !filterValue) {
      toast({
        title: "오류",
        description: "조회 조건을 선택해주세요.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        campus_id: filterCampusId,
      })
      
      if (filterType !== "all" && filterValue) {
        if (filterType === "level") {
          params.append("level_id", filterValue)
        } else if (filterType === "grade") {
          params.append("grade_id", filterValue)
        } else if (filterType === "teacher") {
          params.append("teacher_id", filterValue)
        }
      }
      
      const response = await fetch(`/api/admin/classes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
        toast({
          title: "성공",
          description: `${data.length}개의 클래스가 조회되었습니다.`,
        })
      } else {
        throw new Error("조회 실패")
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "클래스 조회에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // 전체 조회 (필터 초기화)
  const handleReset = async () => {
    setFilterCampusId("")
    setFilterType("all")
    setFilterValue("")
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/classes")
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "클래스 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // 선택된 캠퍼스의 선생님 목록
  const selectedCampusForFilter = campuses.find((c) => c.id === filterCampusId)
  const availableTeachers = selectedCampusForFilter?.teachers || []

  // 학생 배치 다이얼로그 열기
  const handleOpenStudentAssignDialog = async (cls: Class) => {
    console.log("Opening student assign dialog for class:", cls)
    if (!cls || !cls.id) {
      console.error("Invalid class object:", cls)
      toast({
        title: "오류",
        description: "클래스 정보가 올바르지 않습니다.",
        variant: "destructive",
      })
      return
    }
    
    // 상태 업데이트를 먼저 수행
    setSelectedStudentIds([])
    setStudentFilter({ name: "", gradeId: "all", levelId: "all", campusId: "" })
    setSelectedClass(cls)
    
    // 다이얼로그 열기
    setIsStudentAssignDialogOpen(true)
    console.log("Dialog state set to open, isStudentAssignDialogOpen should be true")
    
    // 현재 배치된 학생 조회
    try {
      const response = await fetch(`/api/admin/classes/${cls.id}/students`)
      if (response.ok) {
        const data = await response.json()
        setAssignedStudents(data.students || [])
      } else {
        console.error("Failed to load assigned students:", response.status)
      }
    } catch (error) {
      console.error("Failed to load assigned students:", error)
    }
    
    // 배치 가능한 학생 조회는 사용자가 조회 버튼을 클릭할 때만 실행
    // 자동 조회 제거
  }

  // 배치 가능한 학생 조회
  const loadAvailableStudents = async (cls: Class) => {
    try {
      // 필터에서 캠퍼스 ID 확인 (필수)
      if (!studentFilter.campusId) {
        toast({
          title: "오류",
          description: "캠퍼스를 선택해주세요.",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams({
        campus_id: studentFilter.campusId,
      })
      
      if (studentFilter.name) params.append("name", studentFilter.name)
      if (studentFilter.gradeId && studentFilter.gradeId !== "all") params.append("grade_id", studentFilter.gradeId)
      if (studentFilter.levelId && studentFilter.levelId !== "all") params.append("level_id", studentFilter.levelId)
      
      const response = await fetch(`/api/admin/students?${params}`)
      if (response.ok) {
        const students = await response.json()
        setAvailableStudents(students)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to load available students:", response.status, errorData)
        toast({
          title: "오류",
          description: "학생 목록을 불러올 수 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to load available students:", error)
      toast({
        title: "오류",
        description: "학생 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학생 배치
  const handleAssignStudents = async () => {
    if (!selectedClass || selectedStudentIds.length === 0) {
      toast({
        title: "오류",
        description: "학생을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/classes/${selectedClass.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: selectedStudentIds }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "배치 실패")
        } else {
          const text = await response.text()
          console.error("Non-JSON error response:", text)
          throw new Error(`서버 오류가 발생했습니다. (${response.status})`)
        }
      }

      toast({
        title: "성공",
        description: "학생이 배치되었습니다.",
      })

      // 배치된 학생 목록 새로고침
      if (selectedClass) {
        await loadClassStudents(selectedClass.id)
      }

      setIsStudentAssignDialogOpen(false)
      await handleOpenStudentAssignDialog(selectedClass)
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학생 배치에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학생 배치 해제
  const handleUnassignStudents = async (studentIds: string[]) => {
    if (!selectedClass) return

    try {
      const response = await fetch(`/api/admin/classes/${selectedClass.id}/students/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: studentIds }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "해제 실패")
        } else {
          const text = await response.text()
          console.error("Non-JSON error response:", text)
          throw new Error(`서버 오류가 발생했습니다. (${response.status})`)
        }
      }

      toast({
        title: "성공",
        description: "학생 배치가 해제되었습니다.",
      })

      // 배치된 학생 목록 새로고침
      if (selectedClass) {
        await loadClassStudents(selectedClass.id)
      }

      await handleOpenStudentAssignDialog(selectedClass)
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학생 배치 해제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학습 등록 다이얼로그 열기
  const handleOpenLearningAssignDialog = async (cls: Class) => {
    console.log("Opening learning assign dialog for class:", cls)
    if (!cls || !cls.id) {
      console.error("Invalid class object:", cls)
      toast({
        title: "오류",
        description: "클래스 정보가 올바르지 않습니다.",
        variant: "destructive",
      })
      return
    }
    
    // 상태 업데이트를 먼저 수행
    setSelectedLevelId("")
    setAvailableModules([])
    setAssignmentForm({ date: "", moduleIds: [] })
    setNewModuleIds([])
    setSelectedClass(cls)
    
    // 다이얼로그 열기
    setIsLearningAssignDialogOpen(true)
    console.log("Learning dialog state set to open, isLearningAssignDialogOpen should be true")
    
    // 레벨 목록 조회
    try {
      const response = await fetch("/api/admin/levels")
      if (response.ok) {
        const levelsData = await response.json()
        setLevels(levelsData)
      }
    } catch (error) {
      console.error("Failed to load levels:", error)
    }
    
    // 배정 목록 조회
    await loadAssignments(cls)
  }

  // 배정 목록 조회
  const loadAssignments = async (cls: Class) => {
    try {
      const response = await fetch(`/api/admin/classes/${cls.id}/assignments`)
      if (response.ok) {
        const assignmentsData = await response.json()
        setAssignments(assignmentsData)
      }
    } catch (error) {
      console.error("Failed to load assignments:", error)
    }
  }

  // 클래스의 학생 목록 조회
  const loadClassStudents = async (classId: string) => {
    try {
      const response = await fetch(`/api/admin/classes/${classId}/students`)
      if (response.ok) {
        const data = await response.json()
        setClassStudents((prev) => ({
          ...prev,
          [classId]: data.students || [],
        }))
      }
    } catch (error) {
      console.error("Failed to load class students:", error)
      setClassStudents((prev) => ({
        ...prev,
        [classId]: [],
      }))
    }
  }

  // 클래스 행 클릭 핸들러 (토글)
  const handleClassRowClick = async (classId: string) => {
    const newExpanded = new Set(expandedClasses)
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId)
    } else {
      newExpanded.add(classId)
      // 펼칠 때 학생 목록 로드
      if (!classStudents[classId]) {
        await loadClassStudents(classId)
      }
    }
    setExpandedClasses(newExpanded)
  }

  // 레벨 선택 시 학습 목록 필터링
  const handleLevelChange = async (levelId: string) => {
    setSelectedLevelId(levelId)
    setAssignmentForm({ ...assignmentForm, moduleIds: [] })
    setNewModuleIds([])
    
    if (!levelId) {
      setAvailableModules([])
      return
    }

    try {
      const response = await fetch(`/api/admin/learning-modules?levelId=${levelId}`)
      if (response.ok) {
        const modules = await response.json()
        setAvailableModules(modules)
      }
    } catch (error) {
      console.error("Failed to load modules:", error)
    }
  }

  // 학습 배정 저장
  const handleSaveAssignment = async () => {
    const moduleIdsToSave = assignmentForm.moduleIds.length > 0 ? assignmentForm.moduleIds : newModuleIds.filter(id => id)
    
    if (!selectedClass || !assignmentForm.date || moduleIdsToSave.length === 0) {
      toast({
        title: "오류",
        description: "날짜와 학습을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/classes/${selectedClass.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: assignmentForm.date,
          module_ids: moduleIdsToSave,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "배정 실패")
      }

      toast({
        title: "성공",
        description: "학습이 배정되었습니다.",
      })

      setAssignmentForm({ date: "", moduleIds: [] })
      setNewModuleIds([])
      await loadAssignments(selectedClass)
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학습 배정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 학습 제거
  const handleRemoveModule = async (assignmentId: string, moduleId: string) => {
    try {
      const response = await fetch(`/api/admin/assignments/${assignmentId}/modules/${moduleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("제거 실패")
      }

      toast({
        title: "성공",
        description: "학습이 제거되었습니다.",
      })

      if (selectedClass) {
        await loadAssignments(selectedClass)
      }
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학습 제거에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 배정 전체 삭제
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    if (!selectedClass) return

    try {
      const response = await fetch(`/api/admin/classes/${selectedClass.id}/assignments/${assignmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      toast({
        title: "성공",
        description: "배정이 삭제되었습니다.",
      })

      await loadAssignments(selectedClass)
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "배정 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button">
              <Plus className="h-4 w-4 mr-2" />
              클래스 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>클래스 생성</DialogTitle>
              <DialogDescription>
                새로운 클래스를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>반명</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 1반"
                />
              </div>
              <div>
                <Label>캠퍼스</Label>
                <Select
                  value={formData.campusId}
                  onValueChange={handleCampusChange}
                >
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
                <Label>학년</Label>
                <Select
                  value={formData.gradeId}
                  onValueChange={(v) => setFormData({ ...formData, gradeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>선생님</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(v) => setFormData({ ...formData, teacherId: v })}
                  disabled={selectedCampusTeachers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선생님 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCampusTeachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleSubmit}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>클래스 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 조회 필터 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>캠퍼스 *</Label>
                <Select
                  value={filterCampusId}
                  onValueChange={(value) => {
                    setFilterCampusId(value)
                    setFilterValue("")
                  }}
                >
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
              <div>
                <Label>조회 조건</Label>
                <Select
                  value={filterType}
                  onValueChange={(value: "all" | "level" | "grade" | "teacher") => {
                    setFilterType(value)
                    setFilterValue("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="조회 조건 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="level">레벨</SelectItem>
                    <SelectItem value="grade">학년</SelectItem>
                    <SelectItem value="teacher">선생님</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {filterType === "all" ? "조회 조건을 선택하세요" : 
                   filterType === "level" ? "레벨 선택" :
                   filterType === "grade" ? "학년 선택" :
                   "선생님 선택"}
                </Label>
                {filterType === "all" ? (
                  <Input disabled placeholder="조회 조건을 선택하세요" />
                ) : filterType === "level" ? (
                  <Select
                    value={filterValue}
                    onValueChange={setFilterValue}
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
                ) : filterType === "grade" ? (
                  <Select
                    value={filterValue}
                    onValueChange={setFilterValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={filterValue}
                    onValueChange={setFilterValue}
                    disabled={availableTeachers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선생님 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={isLoading || !filterCampusId || (filterType !== "all" && !filterValue)}
                >
                  조회
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  전체
                </Button>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>반명</TableHead>
                <TableHead>캠퍼스</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>학년</TableHead>
                <TableHead>선생님</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cls) => {
                const isExpanded = expandedClasses.has(cls.id)
                const students = classStudents[cls.id] || []
                
                return (
                  <React.Fragment key={cls.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleClassRowClick(cls.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                          <Link
                            href={`/admin/classes/${cls.id}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cls.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{cls.campus.name}</TableCell>
                      <TableCell>{cls.level.value}</TableCell>
                      <TableCell>{cls.grade.value}</TableCell>
                      <TableCell>{cls.teacher.name}</TableCell>
                      <TableCell>
                        {new Date(cls.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="relative z-10"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log("Student assign button clicked for class:", cls)
                          // 즉시 상태 업데이트
                          setSelectedClass(cls)
                          setIsStudentAssignDialogOpen(true)
                          // 비동기 작업은 별도로 처리
                          setTimeout(() => {
                            handleOpenStudentAssignDialog(cls).catch((error) => {
                              console.error("Error opening student assign dialog:", error)
                              toast({
                                title: "오류",
                                description: "학생 배치 다이얼로그를 열 수 없습니다.",
                                variant: "destructive",
                              })
                            })
                          }, 0)
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="relative z-10"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log("Learning assign button clicked for class:", cls)
                          // 즉시 상태 업데이트
                          setSelectedClass(cls)
                          setIsLearningAssignDialogOpen(true)
                          // 비동기 작업은 별도로 처리
                          setTimeout(() => {
                            handleOpenLearningAssignDialog(cls).catch((error) => {
                              console.error("Error opening learning assign dialog:", error)
                              toast({
                                title: "오류",
                                description: "학습 등록 다이얼로그를 열 수 없습니다.",
                                variant: "destructive",
                              })
                            })
                          }, 0)
                        }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(cls.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {/* 학생 목록 (펼쳐진 경우) */}
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-gray-50 p-4">
                      <div className="space-y-2">
                        <div className="font-medium text-sm text-gray-700 mb-3">
                          배치된 학생 ({students.length}명)
                        </div>
                        {students.length === 0 ? (
                          <div className="text-sm text-gray-500 py-4 text-center">
                            배치된 학생이 없습니다.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {students.map((student: any) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between py-2 px-3 bg-white rounded border text-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="font-medium">{student.name}</span>
                                  <span className="text-gray-500">({student.username})</span>
                                  {student.grade && (
                                    <span className="text-gray-600">{student.grade}</span>
                                  )}
                                  {student.level && (
                                    <span className="text-gray-600">{student.level}</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {student.assignedAt
                                    ? new Date(student.assignedAt).toLocaleDateString("ko-KR")
                                    : "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
              )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 학생 배치 다이얼로그 */}
      <Dialog open={isStudentAssignDialogOpen} onOpenChange={setIsStudentAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학생 배치</DialogTitle>
            <DialogDescription>
              {selectedClass && `${selectedClass.campus.name} - ${selectedClass.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4">
              {/* 필터 */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>캠퍼스</Label>
                  <Select
                    value={studentFilter.campusId}
                    onValueChange={(v) => {
                      setStudentFilter({ ...studentFilter, campusId: v })
                    }}
                  >
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
                <div>
                  <Label>학생명</Label>
                  <Input
                    value={studentFilter.name}
                    onChange={(e) => {
                      setStudentFilter({ ...studentFilter, name: e.target.value })
                    }}
                    placeholder="이름 검색"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        loadAvailableStudents(selectedClass)
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>학년</Label>
                  <Select
                    value={studentFilter.gradeId}
                    onValueChange={(v) => {
                      setStudentFilter({ ...studentFilter, gradeId: v })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {gradeCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>레벨</Label>
                  <Select
                    value={studentFilter.levelId}
                    onValueChange={(v) => {
                      setStudentFilter({ ...studentFilter, levelId: v })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {levelCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={() => loadAvailableStudents(selectedClass)} disabled={!studentFilter.campusId}>조회</Button>

              {/* 학생 목록 */}
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>캠퍼스</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>아이디</TableHead>
                      <TableHead>학년</TableHead>
                      <TableHead>레벨</TableHead>
                      <TableHead>현재 배정</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableStudents.map((student) => {
                      const isAssigned = assignedStudents.some((s) => s.id === student.id)
                      const currentClass = student.studentClasses?.[0]?.class
                      
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedStudentIds.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStudentIds([...selectedStudentIds, student.id])
                                } else {
                                  setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id))
                                }
                              }}
                              disabled={isAssigned}
                            />
                          </TableCell>
                          <TableCell>{student.campus?.name || "-"}</TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {student.name}
                            </span>
                          </TableCell>
                          <TableCell>{student.username}</TableCell>
                          <TableCell>{student.grade?.value || "-"}</TableCell>
                          <TableCell>{student.level?.value || "-"}</TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">배정됨</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnassignStudents([student.id])}
                                >
                                  해제
                                </Button>
                              </div>
                            ) : currentClass ? (
                              <span className="text-orange-600">{currentClass.name}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsStudentAssignDialogOpen(false)}>
              닫기
            </Button>
            <Button type="button" onClick={handleAssignStudents}>선택 학생 등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 학습 등록 다이얼로그 */}
      <Dialog open={isLearningAssignDialogOpen} onOpenChange={setIsLearningAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학습 등록</DialogTitle>
            <DialogDescription>
              {selectedClass && `${selectedClass.campus.name} - ${selectedClass.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <div className="space-y-4">
              {/* 학습 추가 폼 */}
              <Card>
                <CardHeader>
                  <CardTitle>+ 학습 추가</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>날짜 *</Label>
                    <Input
                      type="date"
                      value={assignmentForm.date}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>레벨 *</Label>
                    <Select value={selectedLevelId} onValueChange={handleLevelChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="레벨 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>학습 목록 *</Label>
                    <div className="space-y-2">
                      {newModuleIds.map((moduleId, index) => (
                        <div key={index} className="flex gap-2">
                          <Select
                            value={moduleId}
                            onValueChange={(v) => {
                              const updated = [...newModuleIds]
                              updated[index] = v
                              setNewModuleIds(updated)
                            }}
                            disabled={!selectedLevelId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="학습 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModules
                                .filter((m) => !newModuleIds.includes(m.id) || m.id === moduleId)
                                .map((module) => (
                                  <SelectItem key={module.id} value={module.id}>
                                    {module.title} ({module.items?.length || 0}문항)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewModuleIds(newModuleIds.filter((_, i) => i !== index))
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewModuleIds([...newModuleIds, ""])
                        }}
                        disabled={!selectedLevelId || availableModules.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        학습 추가
                      </Button>
                    </div>
                  </div>
                  <Button 
                    onClick={async () => {
                      if (newModuleIds.length === 0 || newModuleIds.some(id => !id)) {
                        toast({
                          title: "오류",
                          description: "학습을 선택해주세요.",
                          variant: "destructive",
                        })
                        return
                      }
                      setAssignmentForm({ ...assignmentForm, moduleIds: newModuleIds })
                      await handleSaveAssignment()
                      setNewModuleIds([])
                    }} 
                    disabled={!assignmentForm.date || newModuleIds.length === 0 || newModuleIds.some(id => !id)}
                  >
                    저장
                  </Button>
                </CardContent>
              </Card>

              {/* 배정 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle>등록된 학습 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <Label className="font-semibold">
                              {new Date(assignment.assignedDate).toLocaleDateString("ko-KR")}
                            </Label>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({assignment.modules.length}개 학습)
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {assignment.modules.map((am: any) => (
                            <div key={am.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span>{am.module.title}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveModule(assignment.id, am.moduleId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {assignments.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        등록된 학습이 없습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsLearningAssignDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
