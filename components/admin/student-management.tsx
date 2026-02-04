"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Download, Plus, Copy, RefreshCw, Trash2, Edit } from "lucide-react"
import * as XLSX from "xlsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRouter } from "next/navigation"

interface Campus {
  id: string
  name: string
}

interface Code {
  id: string
  value: string
}

interface Student {
  id: string
  name: string
  username: string
  plainPassword: string | null
  status: "ACTIVE" | "INACTIVE"
  campus: {
    id: string
    name: string
  }
  grade: {
    id: string
    value: string
  } | null
  level: {
    id: string
    value: string
  } | null
  school: string | null
  autoLoginToken: string | null
  createdAt: Date
}

interface StudentManagementProps {
  campuses: Campus[]
  gradeCodes: Code[]
  levelCodes: Code[]
  initialStudents: Student[]
}

export function StudentManagement({
  campuses,
  gradeCodes,
  levelCodes,
  initialStudents,
}: StudentManagementProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [students, setStudents] = useState(initialStudents || [])
  
  // 서버에서 최신 데이터 가져오기
  const refreshStudents = async () => {
    try {
      const response = await fetch("/api/admin/students")
      if (response.ok) {
        const latestStudents = await response.json()
        setStudents(latestStudents)
        setFilteredStudents(latestStudents)
      }
    } catch (error) {
      console.error("Failed to refresh students:", error)
    }
  }
  
  // 컴포넌트 마운트 시 항상 서버에서 최신 데이터 가져오기
  useEffect(() => {
    refreshStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // initialStudents가 변경되면 students state 업데이트 (서버 사이드 데이터가 있으면 사용)
  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents)
      setFilteredStudents(initialStudents)
    }
  }, [initialStudents])
  
  const [formData, setFormData] = useState({
    campusId: "",
    name: "",
    gradeId: "",
    levelId: "",
    username: "",
    password: "",
    school: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    gradeId: "",
    levelId: "",
    school: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    password: "",
  })
  
  // 필터링 상태
  const [filterCampusId, setFilterCampusId] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("전체")
  const [filterValue, setFilterValue] = useState<string>("")
  const [filterCodeId, setFilterCodeId] = useState<string>("") // 학년/레벨 코드 ID
  const [filteredStudents, setFilteredStudents] = useState(initialStudents)
  const [autoLoginToken, setAutoLoginToken] = useState<string | null>(null)
  const [autoLoginUrl, setAutoLoginUrl] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/students/import-xlsx", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.errors && data.errors.length > 0) {
          const errorMsg = data.errors
            .map((e: any) => `행 ${e.row}: ${e.reason}`)
            .join("\n")
          toast({
            title: "오류",
            description: `조건이 맞지 않습니다.\n${errorMsg}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "오류",
            description: data.error || "업로드에 실패했습니다.",
            variant: "destructive",
          })
        }
        return
      }

      toast({
        title: "성공",
        description: `등록 완료 (${data.count}명)`,
      })
      
      // 학생 목록 새로고침
      router.refresh()
    } catch (error) {
      toast({
        title: "오류",
        description: "업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleDownloadTemplate = () => {
    // 템플릿 엑셀 생성
    const template = [
      {
        campus: "강남캠퍼스",
        name: "홍길동",
        grade: "1학년",
        username: "student1",
        password: "password123",
        school: "예시초등학교",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "학생")
    XLSX.writeFile(wb, "학생_등록_템플릿.xlsx")
  }

  const handleAddStudent = async () => {
    if (!formData.campusId || !formData.name || !formData.gradeId || !formData.username || !formData.password) {
      toast({
        title: "오류",
        description: "필수 필드를 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    // 값 검증
    if (!formData.campusId.trim() || !formData.gradeId.trim()) {
      toast({
        title: "오류",
        description: "캠퍼스와 학년을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    // 선택한 ID가 실제로 존재하는지 확인
    const selectedCampus = campuses.find(c => c.id === formData.campusId.trim())
    const selectedGrade = gradeCodes.find(c => c.id === formData.gradeId.trim())

    if (!selectedCampus) {
      console.error("Selected campus not found in available list:", formData.campusId)
      console.error("Available campuses:", campuses.map(c => ({ id: c.id, name: c.name })))
      toast({
        title: "오류",
        description: "선택한 캠퍼스를 찾을 수 없습니다. 페이지를 새로고침해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!selectedGrade) {
      console.error("Selected grade not found in available list:", formData.gradeId)
      console.error("Available grade codes:", gradeCodes.map(c => ({ id: c.id, value: c.value })))
      toast({
        title: "오류",
        description: "선택한 학년을 찾을 수 없습니다. 페이지를 새로고침해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const payload = {
        campusId: formData.campusId.trim(),
        name: formData.name.trim(),
        gradeId: formData.gradeId.trim(),
        levelId: formData.levelId?.trim() || null,
        username: formData.username.trim(),
        password: formData.password,
        school: formData.school?.trim() || null,
        status: formData.status,
      }

      console.log("=== Student Registration Debug ===")
      console.log("Form data:", formData)
      console.log("Selected campus:", selectedCampus)
      console.log("Selected grade:", selectedGrade)
      console.log("Sending student data:", payload)
      console.log("Available campuses:", campuses.map(c => ({ id: c.id, name: c.name })))
      console.log("Available grade codes:", gradeCodes.map(c => ({ id: c.id, value: c.value })))
      console.log("=================================")

      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "등록 실패")
      }

      const data = await response.json()
      setAutoLoginToken(data.autoLoginToken)
      setAutoLoginUrl(`${window.location.origin}/s/auto/${data.autoLoginToken}`)
      
      toast({
        title: "성공",
        description: "학생이 등록되었습니다.",
      })

      // 학생 목록 새로고침
      router.refresh()
      
      // 다이얼로그는 닫지 않고 자동로그인 링크를 보여줌
      // 사용자가 수동으로 닫거나 페이지를 새로고침할 수 있음
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학생 등록에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCopyAutoLoginUrl = () => {
    if (autoLoginUrl) {
      navigator.clipboard.writeText(autoLoginUrl)
      toast({
        title: "복사 완료",
        description: "자동로그인 링크가 복사되었습니다.",
      })
    }
  }

  const handleRegenerateToken = async () => {
    if (!formData.username) {
      toast({
        title: "오류",
        description: "학생을 먼저 등록해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/admin/students/${formData.username}/auto-login-token`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("토큰 재생성 실패")
      }

      const data = await response.json()
      setAutoLoginToken(data.token)
      setAutoLoginUrl(`${window.location.origin}/s/auto/${data.token}`)
      
      toast({
        title: "성공",
        description: "자동로그인 링크가 재생성되었습니다.",
      })
    } catch (error) {
      toast({
        title: "오류",
        description: "토큰 재생성에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setFormData({
      campusId: "",
      name: "",
      gradeId: "",
      levelId: "",
      username: "",
      password: "",
      school: "",
      status: "ACTIVE",
    })
    setAutoLoginToken(null)
    setAutoLoginUrl(null)
  }

  // 필터링 함수
  const handleFilter = () => {
    let filtered = [...students]

    // 조건1: 캠퍼스 필터
    if (filterCampusId && filterCampusId !== "all") {
      filtered = filtered.filter((s) => s.campus.id === filterCampusId)
    }

    // 조건2: 검색 타입별 필터
    if (filterType !== "전체") {
      switch (filterType) {
        case "이름":
          if (filterValue.trim()) {
            const searchValue = filterValue.trim().toLowerCase()
            filtered = filtered.filter((s) =>
              s.name.toLowerCase().includes(searchValue)
            )
          }
          break
        case "학년":
          if (filterCodeId) {
            filtered = filtered.filter((s) => s.grade?.id === filterCodeId)
          }
          break
        case "레벨":
          if (filterCodeId) {
            filtered = filtered.filter((s) => s.level?.id === filterCodeId)
          }
          break
      }
    }

    setFilteredStudents(filtered)
  }

  // 필터 초기화
  const handleResetFilter = () => {
    setFilterCampusId("all")
    setFilterType("전체")
    setFilterValue("")
    setFilterCodeId("")
    setFilteredStudents(students)
  }

  // 검색 타입 변경 시 필터 값 초기화
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value)
    setFilterValue("")
    setFilterCodeId("")
  }

  // 학생 수정 다이얼로그 열기
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student)
    setEditFormData({
      name: student.name,
      gradeId: student.grade?.id || "",
      levelId: student.level?.id || "none",
      school: student.school || "",
      status: student.status,
      password: "",
    })
    setIsEditDialogOpen(true)
  }

  // 학생 정보 수정
  const handleUpdateStudent = async () => {
    if (!editingStudent) return

    if (!editFormData.name.trim()) {
      toast({
        title: "오류",
        description: "학생명을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!editFormData.gradeId.trim()) {
      toast({
        title: "오류",
        description: "학년을 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const payload: any = {
        name: editFormData.name.trim(),
        gradeId: editFormData.gradeId.trim(),
        levelId: editFormData.levelId && editFormData.levelId !== "none" ? editFormData.levelId.trim() : null,
        school: editFormData.school?.trim() || null,
        status: editFormData.status,
      }

      // 비밀번호가 입력된 경우에만 포함
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim()
      }

      const response = await fetch(`/api/admin/students/${editingStudent.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        description: "학생 정보가 수정되었습니다.",
      })

      setIsEditDialogOpen(false)
      setEditingStudent(null)
      router.refresh()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "학생 정보 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 수정 다이얼로그 닫기
  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingStudent(null)
    setEditFormData({
      name: "",
      gradeId: "",
      levelId: "",
      school: "",
      status: "ACTIVE",
      password: "",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              학생 개별 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>학생 개별 등록</DialogTitle>
              <DialogDescription>
                학생을 개별적으로 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>캠퍼스 *</Label>
                <Select
                  value={formData.campusId || undefined}
                  onValueChange={(v) => {
                    console.log("Campus selected:", v, "Type:", typeof v)
                    setFormData((prev) => ({ ...prev, campusId: v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="캠퍼스 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.length === 0 ? (
                      <SelectItem value="no-campus" disabled>캠퍼스가 없습니다</SelectItem>
                    ) : (
                      campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.campusId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    선택된 캠퍼스 ID: {formData.campusId}
                  </p>
                )}
              </div>
              <div>
                <Label>학생명 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="학생 이름"
                />
              </div>
              <div>
                <Label>학년 *</Label>
                <Select
                  value={formData.gradeId || undefined}
                  onValueChange={(v) => {
                    console.log("Grade selected:", v, "Type:", typeof v)
                    setFormData((prev) => ({ ...prev, gradeId: v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeCodes.length === 0 ? (
                      <SelectItem value="no-grade" disabled>학년 코드가 없습니다</SelectItem>
                    ) : (
                      gradeCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.value}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.gradeId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    선택된 학년 ID: {formData.gradeId}
                  </p>
                )}
              </div>
              <div>
                <Label>레벨 (선택)</Label>
                <Select
                  value={formData.levelId || undefined}
                  onValueChange={(v) => {
                    console.log("Level selected:", v, "Type:", typeof v)
                    setFormData((prev) => ({ ...prev, levelId: v }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {levelCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>아이디 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="로그인 아이디"
                />
              </div>
              <div>
                <Label>비밀번호 *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="비밀번호"
                />
              </div>
              <div>
                <Label>학교</Label>
                <Input
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  placeholder="학교명 (선택사항)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="status"
                  checked={formData.status === "ACTIVE"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? "ACTIVE" : "INACTIVE" })
                  }
                />
                <Label htmlFor="status">
                  {formData.status === "ACTIVE" ? "활성" : "비활성"}
                </Label>
              </div>
              {autoLoginUrl && (
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                  <Label>자동로그인 링크</Label>
                  <div className="flex gap-2">
                    <Input value={autoLoginUrl} readOnly />
                    <Button type="button" variant="outline" onClick={handleCopyAutoLoginUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" onClick={handleRegenerateToken}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button 
                type="button"
                onClick={async () => {
                  await handleAddStudent()
                  // 등록 성공 후 다이얼로그는 자동으로 닫히지 않고 자동로그인 링크를 보여줌
                }}
              >
                등록
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>엑셀 일괄 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>엑셀 파일 업로드</Label>
            <p className="text-sm text-muted-foreground mb-2">
              컬럼 순서: campus, name, grade, username, password, school(optional)
            </p>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                템플릿 다운로드
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>학생 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터링 UI */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>캠퍼스</Label>
              <Select
                value={filterCampusId || "all"}
                onValueChange={setFilterCampusId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="캠퍼스 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {campuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>검색 타입</Label>
              <Select
                value={filterType}
                onValueChange={handleFilterTypeChange}
                disabled={!filterCampusId || filterCampusId === "all"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="이름">이름</SelectItem>
                  <SelectItem value="학년">학년</SelectItem>
                  <SelectItem value="레벨">레벨</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterType !== "전체" && (
              <div className="flex-1">
                <Label>
                  {filterType === "이름" ? "검색어" : filterType === "학년" ? "학년 선택" : "레벨 선택"}
                </Label>
                {filterType === "이름" ? (
                  <Input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="이름 입력"
                    disabled={!filterCampusId || filterCampusId === "all"}
                  />
                ) : filterType === "학년" ? (
                  <Select
                    value={filterCodeId || undefined}
                    onValueChange={setFilterCodeId}
                    disabled={!filterCampusId || filterCampusId === "all"}
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
                    value={filterCodeId || undefined}
                    onValueChange={setFilterCodeId}
                    disabled={!filterCampusId || filterCampusId === "all"}
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
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={handleFilter} 
                disabled={
                  !filterCampusId || 
                  filterCampusId === "all" ||
                  (filterType !== "전체" && 
                   ((filterType === "이름" && !filterValue.trim()) ||
                    ((filterType === "학년" || filterType === "레벨") && !filterCodeId)))
                }
              >
                조회
              </Button>
              <Button type="button" variant="outline" onClick={handleResetFilter}>
                초기화
              </Button>
            </div>
          </div>

          {/* 학생 목록 테이블 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>비밀번호</TableHead>
                  <TableHead>캠퍼스</TableHead>
                  <TableHead>학년</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead>학교</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>자동로그인 링크</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      {students.length === 0
                        ? "등록된 학생이 없습니다."
                        : "조건에 맞는 학생이 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.plainPassword || "-"}</TableCell>
                      <TableCell>{student.campus.name}</TableCell>
                      <TableCell>{student.grade?.value || "-"}</TableCell>
                      <TableCell>{student.level?.value || "-"}</TableCell>
                      <TableCell>{student.school || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            student.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {student.status === "ACTIVE" ? "활성" : "비활성"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {student.autoLoginToken ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`/s/auto/${student.autoLoginToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              링크
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(
                                    `/api/admin/students/${student.username}/auto-login-token`,
                                    { method: "POST" }
                                  )
                                  if (response.ok) {
                                    toast({
                                      title: "성공",
                                      description: "자동로그인 링크가 재생성되었습니다.",
                                    })
                                    router.refresh()
                                  }
                                } catch (error) {
                                  toast({
                                    title: "오류",
                                    description: "토큰 재생성에 실패했습니다.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(student.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(student)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          수정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 학생 정보 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>학생 정보 수정</DialogTitle>
            <DialogDescription>
              학생 정보를 수정합니다. (캠퍼스와 아이디는 변경할 수 없습니다.)
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4">
              <div>
                <Label>캠퍼스</Label>
                <Input
                  value={editingStudent.campus.name}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>아이디</Label>
                <Input
                  value={editingStudent.username}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>학생명 *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="학생 이름"
                />
              </div>
              <div>
                <Label>학년 *</Label>
                <Select
                  value={editFormData.gradeId || undefined}
                  onValueChange={(v) => setEditFormData({ ...editFormData, gradeId: v })}
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
                <Label>레벨 (선택)</Label>
                <Select
                  value={editFormData.levelId || "none"}
                  onValueChange={(v) => setEditFormData({ ...editFormData, levelId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {levelCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>학교</Label>
                <Input
                  value={editFormData.school}
                  onChange={(e) => setEditFormData({ ...editFormData, school: e.target.value })}
                  placeholder="학교명 (선택사항)"
                />
              </div>
              <div>
                <Label>비밀번호 (변경 시에만 입력)</Label>
                <Input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="비밀번호를 변경하려면 입력하세요"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-status"
                  checked={editFormData.status === "ACTIVE"}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, status: checked ? "ACTIVE" : "INACTIVE" })
                  }
                />
                <Label htmlFor="edit-status">
                  {editFormData.status === "ACTIVE" ? "활성" : "비활성"}
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
              취소
            </Button>
            <Button type="button" onClick={handleUpdateStudent}>
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
