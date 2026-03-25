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
  status: "ACTIVE" | "INACTIVE"
  campus: {
    id: string
    name: string
  }
  studentClasses?: Array<{
    class: {
      name: string
      teacher?: {
        name: string | null
      } | null
    }
  }>
  grade: {
    id: string
    value: string
  } | null
  level: {
    id: string
    value: string
  } | null
  school: string | null
  /** 서버에서 평문 토큰 대신 링크 존재 여부만 전달 */
  hasAutoLoginLink: boolean
  createdAt: Date
}

interface StudentManagementProps {
  campuses: Campus[]
  gradeCodes: Code[]
  levelCodes: Code[]
  initialStudents: Student[]
  role: "SUPER_ADMIN" | "MANAGER"
}

export function StudentManagement({
  campuses: campusesProp,
  gradeCodes: gradeCodesProp,
  levelCodes: levelCodesProp,
  initialStudents,
  role,
}: StudentManagementProps) {
  const { toast } = useToast()
  const router = useRouter()
  /** 서버 props + 클라이언트 /api/admin/student-form-meta 병합 — MANAGER도 코드 목록 확보 */
  const [formCampuses, setFormCampuses] = useState(campusesProp)
  const [formGradeCodes, setFormGradeCodes] = useState(gradeCodesProp)
  const [formLevelCodes, setFormLevelCodes] = useState(levelCodesProp)

  useEffect(() => {
    setFormCampuses(campusesProp)
    setFormGradeCodes(gradeCodesProp)
    setFormLevelCodes(levelCodesProp)
  }, [campusesProp, gradeCodesProp, levelCodesProp])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/student-form-meta", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const d = await res.json()
        if (cancelled) return
        if (Array.isArray(d.campuses)) setFormCampuses(d.campuses)
        if (Array.isArray(d.gradeCodes)) setFormGradeCodes(d.gradeCodes)
        if (Array.isArray(d.levelCodes)) setFormLevelCodes(d.levelCodes)
      } catch (e) {
        console.error("student-form-meta:", e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [isUploading, setIsUploading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [students, setStudents] = useState<Student[]>(initialStudents || [])
  const [isResettingAllStudents, setIsResettingAllStudents] = useState(false)
  const [deletingStudentUsernames, setDeletingStudentUsernames] = useState<Record<string, boolean>>({})
  
  useEffect(() => {
    setStudents(initialStudents || [])
    setFilteredStudents(initialStudents || [])
  }, [initialStudents])
  
  const [formData, setFormData] = useState({
    campusId: "",
    name: "",
    gradeId: "",
    levelId: "",
    username: "",
    school: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  })
  const [editFormData, setEditFormData] = useState({
    name: "",
    username: "",
    gradeId: "",
    levelId: "",
    school: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  })
  
  // 필터링 상태
  const [filterCampusId, setFilterCampusId] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("전체")
  const [filterValue, setFilterValue] = useState<string>("")
  const [filterCodeId, setFilterCodeId] = useState<string>("") // 학년/레벨 코드 ID
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(initialStudents || [])
  const [nameSortOrder, setNameSortOrder] = useState<"asc" | "desc">("asc")
  const [hasSearched, setHasSearched] = useState((initialStudents?.length ?? 0) > 0)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState<Record<string, boolean>>({})
  const [autoLoginToken, setAutoLoginToken] = useState<string | null>(null)
  const [autoLoginUrl, setAutoLoginUrl] = useState<string | null>(null)
  const [issuedAutoLoginUrls, setIssuedAutoLoginUrls] = useState<Record<string, string>>({})

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
        description: (() => {
          const count = typeof data.count === "number" ? data.count : 0
          const skipped = typeof data.skippedDuplicateCount === "number" ? data.skippedDuplicateCount : 0
          return skipped > 0
            ? `등록 완료 (${count}명), 중복 제외 ${skipped}명`
            : `등록 완료 (${count}명)`
        })(),
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
    const sampleCampus = formCampuses[0]?.name ?? "캠퍼스명(캠퍼스관리와동일)"
    const sampleGrade = formGradeCodes[0]?.value ?? "학년코드값과동일"
    const sampleLevel = formLevelCodes[0]?.value ?? ""
    const row: Record<string, string> = {
      campus: sampleCampus,
      name: "홍길동",
      grade: sampleGrade,
      "숫자4자리": "1234",
      school: "예시초등학교",
    }
    if (sampleLevel) row.level = sampleLevel
    const template = [row]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "학생")
    const guide = [
      ["아래 컬럼명을 사용할 수 있습니다 (영문 또는 한글)."],
      ["campus / 캠퍼스", "캠퍼스 관리에 등록된 이름과 동일"],
      ["name / 이름"],
      ["grade / 학년", "코드값 관리의 학년(GRADE) 표시값과 동일"],
      ["level / 레벨", "선택, 코드값 관리 레벨(LEVEL)과 동일"],
      ["숫자4자리"],
      ["school / 학교", "선택"],
    ]
    const wsGuide = XLSX.utils.aoa_to_sheet(guide)
    XLSX.utils.book_append_sheet(wb, wsGuide, "컬럼안내")
    XLSX.writeFile(wb, "학생_등록_템플릿.xlsx")
  }

  const handleToggleStudentStatus = async (student: Student, nextStatus: "ACTIVE" | "INACTIVE") => {
    const key = student.id
    if (!key) return
    if (isTogglingStatus[key]) return

    setIsTogglingStatus((prev) => ({ ...prev, [key]: true }))

    // Optimistic UI
    const optimistic = (arr: Student[]) =>
      arr.map((s) => (s.id === key ? { ...s, status: nextStatus } : s))

    setStudents((prev) => optimistic(prev))
    setFilteredStudents((prev) => optimistic(prev))

    try {
      const response = await fetch(`/api/admin/students/${student.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          studentId: student.id,
          name: student.name,
          username: student.username,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json()
          throw new Error(data.error || "상태 변경 실패")
        }
        const text = await response.text()
        throw new Error(text || "상태 변경 실패")
      }

      toast({
        title: "성공",
        description: `${student.name} 상태가 ${nextStatus === "ACTIVE" ? "활성" : "비활성"}로 변경되었습니다.`,
      })

      // 데이터 구조가 바뀌지 않으므로 보통 optimistic만으로 충분하지만,
      // 간혹 새로고침이 필요할 수 있어 refresh를 한번 트리거합니다.
      router.refresh()
    } catch (error: any) {
      // Revert
      setStudents((prev) =>
        optimistic(prev).map((s) => (s.id === key ? { ...s, status: student.status } : s))
      )
      setFilteredStudents((prev) =>
        optimistic(prev).map((s) => (s.id === key ? { ...s, status: student.status } : s))
      )

      toast({
        title: "오류",
        description: error?.message || "상태 변경에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsTogglingStatus((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleAddStudent = async () => {
    if (!formData.campusId || !formData.name || !formData.gradeId || !formData.username) {
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
    const selectedCampus = formCampuses.find((c) => c.id === formData.campusId.trim())
    const selectedGrade = formGradeCodes.find((c) => c.id === formData.gradeId.trim())

    if (!selectedCampus) {
      console.error("Selected campus not found in available list:", formData.campusId)
      console.error("Available campuses:", formCampuses.map((c) => ({ id: c.id, name: c.name })))
      toast({
        title: "오류",
        description: "선택한 캠퍼스를 찾을 수 없습니다. 페이지를 새로고침해주세요.",
        variant: "destructive",
      })
      return
    }

    if (!selectedGrade) {
      console.error("Selected grade not found in available list:", formData.gradeId)
      console.error("Available grade codes:", formGradeCodes.map((c) => ({ id: c.id, value: c.value })))
      toast({
        title: "오류",
        description: "선택한 학년을 찾을 수 없습니다. 페이지를 새로고침해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      const levelRaw = formData.levelId?.trim()
      const payload = {
        campusId: formData.campusId.trim(),
        name: formData.name.trim(),
        gradeId: formData.gradeId.trim(),
        levelId:
          !levelRaw || levelRaw === "none" ? null : levelRaw,
        username: formData.username.trim(),
        school: formData.school?.trim() || null,
        status: formData.status,
      }

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
      school: "",
      status: "ACTIVE",
    })
    setAutoLoginToken(null)
    setAutoLoginUrl(null)
  }

  // 필터링 함수
  const handleFilter = async () => {
    if (!filterCampusId || filterCampusId === "all") {
      toast({
        title: "안내",
        description: "캠퍼스를 먼저 선택해 주세요.",
      })
      return
    }

    setHasSearched(true)
    setIsLoadingStudents(true)
    try {
      const response = await fetch(
        `/api/admin/students?campus_id=${encodeURIComponent(filterCampusId)}`,
        { cache: "no-store" }
      )
      if (!response.ok) {
        throw new Error("학생 목록 조회에 실패했습니다.")
      }

      const latestStudents = await response.json()
      const transformedStudents: Student[] = Array.isArray(latestStudents)
        ? latestStudents.map((student: any) => ({
            ...student,
            campus: student.campus || { id: "", name: "" },
            grade: student.grade || null,
            level: student.level || null,
          }))
        : []

      let filtered = [...transformedStudents]
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
          case "반명":
            if (filterValue.trim()) {
              const searchValue = filterValue.trim().toLowerCase()
              filtered = filtered.filter((s) =>
                (s.studentClasses || []).some((sc) =>
                  (sc.class?.name || "").toLowerCase().includes(searchValue)
                )
              )
            }
            break
          case "선생님":
            if (filterValue.trim()) {
              const searchValue = filterValue.trim().toLowerCase()
              filtered = filtered.filter((s) =>
                (s.studentClasses || []).some((sc) =>
                  (sc.class?.teacher?.name || "").toLowerCase().includes(searchValue)
                )
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

      setStudents(transformedStudents)
      setFilteredStudents(filtered)
      setHasSearched(true)
    } catch (error: any) {
      toast({
        title: "오류",
        description: error?.message || "학생 목록 조회에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingStudents(false)
    }
  }

  // 필터 초기화
  const handleResetFilter = () => {
    setFilterCampusId("all")
    setFilterType("전체")
    setFilterValue("")
    setFilterCodeId("")
    setStudents([])
    setFilteredStudents([])
    setHasSearched(false)
  }

  // 검색 타입 변경 시 필터 값 초기화
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value)
    setFilterValue("")
    setFilterCodeId("")
  }

  const sortedFilteredStudents = [...filteredStudents].sort((a, b) => {
    const left = (a.name || "").trim()
    const right = (b.name || "").trim()
    return nameSortOrder === "asc"
      ? left.localeCompare(right, "ko")
      : right.localeCompare(left, "ko")
  })

  useEffect(() => {
    if (!filterCampusId || filterCampusId === "all") {
      setStudents([])
      setFilteredStudents([])
      setHasSearched(false)
      return
    }
    // 캠퍼스를 바꾸면 이전 캠퍼스 조회 결과를 숨기고 다시 조회하도록 유도
    setStudents([])
    setFilteredStudents([])
    setHasSearched(false)
  }, [filterCampusId])

  // 학생 전체 초기화 (SUPER_ADMIN만)
  const handleResetAllStudents = async () => {
    if (role !== "SUPER_ADMIN") {
      toast({
        title: "권한이 없습니다.",
        description: "학생 전체 초기화는 최고관리자만 가능합니다.",
        variant: "destructive",
      })
      return
    }

    // 요청사항: 3번 확인
    const ok1 = confirm("삭제하시겠습니까?")
    if (!ok1) return
    const ok2 = confirm("정말 삭제 하시겠습니까?")
    if (!ok2) return
    const ok3 = confirm("모든 학생데이터가 삭제됩니다?")
    if (!ok3) return

    setIsResettingAllStudents(true)
    try {
      const response = await fetch("/api/admin/students/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "초기화 실패")
        }
        const text = await response.text()
        throw new Error(text || "초기화 실패")
      }

      toast({
        title: "성공",
        description: "모든 학생 데이터가 삭제되었습니다.",
      })

      // 즉시 UI 반영 후 서버 새로고침
      setStudents([])
      setFilteredStudents([])
      router.refresh()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error?.message || "학생 전체 초기화에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsResettingAllStudents(false)
    }
  }

  // 개별 학생 삭제 (관리자도 가능)
  const handleDeleteStudent = async (student: Student) => {
    const username = student.username
    if (!username) return

    // 요청사항: 1번만 확인
    const ok = confirm("삭제하시겠습니까?")
    if (!ok) return

    setDeletingStudentUsernames((prev) => ({ ...prev, [username]: true }))
    try {
      const response = await fetch(`/api/admin/students/${username}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json()
          throw new Error(error.error || "삭제 실패")
        }
        const text = await response.text()
        throw new Error(text || "삭제 실패")
      }

      toast({
        title: "성공",
        description: `${student.name} 학생이 삭제되었습니다.`,
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "오류",
        description: error?.message || "학생 삭제에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setDeletingStudentUsernames((prev) => ({ ...prev, [username]: false }))
    }
  }

  // 학생 수정 다이얼로그 열기
  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student)
    setEditFormData({
      name: student.name,
      username: student.username,
      gradeId: student.grade?.id || "",
      levelId: student.level?.id || "none",
      school: student.school || "",
      status: student.status,
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
        username: editFormData.username.trim(),
        gradeId: editFormData.gradeId.trim(),
        levelId: editFormData.levelId && editFormData.levelId !== "none" ? editFormData.levelId.trim() : null,
        school: editFormData.school?.trim() || null,
        status: editFormData.status,
      }

      const response = await fetch(`/api/admin/students/${editingStudent.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, studentId: editingStudent.id }),
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
      username: "",
      gradeId: "",
      levelId: "",
      school: "",
      status: "ACTIVE",
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
                {formCampuses.length === 0 ? (
                  <p className="text-sm text-amber-700 border rounded-md p-3 bg-amber-50">
                    등록된 캠퍼스가 없습니다. <strong>캠퍼스/선생님</strong> 메뉴에서 캠퍼스를 먼저 추가한 뒤 새로고침 해 주세요.
                  </p>
                ) : (
                  <Select
                    value={formData.campusId || undefined}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, campusId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="캠퍼스 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {formCampuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {formGradeCodes.length === 0 ? (
                  <p className="text-sm text-amber-700 border rounded-md p-3 bg-amber-50">
                    학년 코드가 없습니다. <strong>코드값 관리</strong>에서 학년(GRADE) 코드를 등록한 뒤 새로고침 해 주세요.
                  </p>
                ) : (
                  <Select
                    value={formData.gradeId || undefined}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, gradeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {formGradeCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>레벨 (선택)</Label>
                <Select
                  value={formData.levelId && formData.levelId !== "" ? formData.levelId : "none"}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, levelId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {formLevelCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
                        {code.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>숫자4자리 *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="로그인 숫자4자리 (예: 1234)"
                  inputMode="numeric"
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
              컬럼: <code className="text-xs">campus</code>/<strong>캠퍼스</strong>,{" "}
              <code className="text-xs">name</code>/<strong>이름</strong>,{" "}
              <code className="text-xs">grade</code>/<strong>학년</strong>,{" "}
              <code className="text-xs">level</code>/<strong>레벨</strong>(선택),{" "}
              <strong>숫자4자리</strong>, <code className="text-xs">school</code>/<strong>학교</strong>(선택).
              값은 코드값·캠퍼스명과 <strong>정확히 일치</strong>해야 합니다.
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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>학생 목록</CardTitle>
          {role === "SUPER_ADMIN" && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetAllStudents}
              disabled={isResettingAllStudents}
            >
              {isResettingAllStudents ? "학생전체초기화 중..." : "학생전체초기화"}
            </Button>
          )}
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
                  {formCampuses.map((campus) => (
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
                  <SelectItem value="반명">반명</SelectItem>
                  <SelectItem value="선생님">선생님</SelectItem>
                  <SelectItem value="학년">학년</SelectItem>
                  <SelectItem value="레벨">레벨</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterType !== "전체" && (
              <div className="flex-1">
                <Label>
                  {filterType === "이름" || filterType === "반명" || filterType === "선생님"
                    ? "검색어"
                    : filterType === "학년"
                      ? "학년 선택"
                      : "레벨 선택"}
                </Label>
                {filterType === "이름" || filterType === "반명" || filterType === "선생님" ? (
                  <Input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder={filterType === "이름" ? "이름 입력" : filterType === "반명" ? "반명 입력" : "선생님 입력"}
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
                      {formGradeCodes.map((code) => (
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
                      {formLevelCodes.map((code) => (
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
                   (((filterType === "이름" || filterType === "반명" || filterType === "선생님") && !filterValue.trim()) ||
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

          {/* 학생 목록 테이블 — 한 줄 정렬(줄바꿈 방지), 좁은 화면은 가로 스크롤 */}
          <div className="overflow-x-auto rounded-md border bg-background">
            <Table className="w-max min-w-full text-xs [&_th]:whitespace-nowrap [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead>캠퍼스</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => setNameSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                      title={`이름 ${nameSortOrder === "asc" ? "오름차순" : "내림차순"} 정렬`}
                    >
                      이름 {nameSortOrder === "asc" ? "▲" : "▼"}
                    </button>
                  </TableHead>
                  <TableHead>숫자4자리</TableHead>
                  <TableHead>반명</TableHead>
                  <TableHead>학년</TableHead>
                  <TableHead>레벨</TableHead>
                  <TableHead className="min-w-[7rem]">학교</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>자동로그인 링크</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasSearched ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      캠퍼스를 선택한 뒤 조회를 눌러주세요.
                    </TableCell>
                  </TableRow>
                ) : isLoadingStudents ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      학생 목록을 불러오는 중입니다...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      {students.length === 0
                        ? "등록된 학생이 없습니다."
                        : "조건에 맞는 학생이 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFilteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="whitespace-nowrap">{student.campus.name}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{student.name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{student.username}</TableCell>
                      <TableCell className="whitespace-nowrap max-w-[14rem]">
                        {student.studentClasses && student.studentClasses.length > 0
                          ? Array.from(
                              new Set(
                                student.studentClasses
                                  .map((sc) => sc.class?.name)
                                  .filter(Boolean)
                              )
                            ).join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{student.grade?.value || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{student.level?.value || "-"}</TableCell>
                      <TableCell
                        className="max-w-[12rem] truncate align-middle"
                        title={student.school || undefined}
                      >
                        {student.school || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-medium ${
                              student.status === "INACTIVE" ? "text-gray-900" : "text-gray-400"
                            }`}
                          >
                            OFF
                          </span>
                          <Switch
                            checked={student.status === "ACTIVE"}
                            disabled={!!isTogglingStatus[student.id]}
                            onCheckedChange={(checked) => {
                              handleToggleStudentStatus(student, checked ? "ACTIVE" : "INACTIVE")
                            }}
                          />
                          <span
                            className={`text-xs font-medium ${
                              student.status === "ACTIVE" ? "text-green-700" : "text-gray-400"
                            }`}
                          >
                            ON
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {student.hasAutoLoginLink ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">발급됨</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="이 브라우저에서 최근 발급된 링크 복사"
                              onClick={async () => {
                                const cachedUrl = issuedAutoLoginUrls[student.id]
                                if (!cachedUrl) {
                                  toast({
                                    title: "안내",
                                    description:
                                      "최근 발급 링크 정보가 없습니다. 재발급 후 복사해 주세요.",
                                  })
                                  return
                                }
                                try {
                                  await navigator.clipboard.writeText(cachedUrl)
                                  toast({
                                    title: "복사 완료",
                                    description: "기존(최근 발급) 자동로그인 링크가 복사되었습니다.",
                                  })
                                } catch {
                                  toast({
                                    title: "오류",
                                    description: "클립보드 복사에 실패했습니다.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="새 링크 발급 후 클립보드에 복사"
                              onClick={async () => {
                                try {
                                  const response = await fetch(
                                    `/api/admin/students/${student.username}/auto-login-token`,
                                    {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ studentId: student.id }),
                                    }
                                  )
                                  if (response.ok) {
                                    const data = await response.json()
                                    if (data.token) {
                                      const url = `${window.location.origin}/s/auto/${data.token}`
                                      setIssuedAutoLoginUrls((prev) => ({
                                        ...prev,
                                        [student.id]: url,
                                      }))
                                      await navigator.clipboard.writeText(url)
                                    }
                                    toast({
                                      title: "재발급 완료",
                                      description: "새 자동로그인 링크가 클립보드에 복사되었습니다.",
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
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {new Date(student.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(student)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={() => handleDeleteStudent(student)}
                          disabled={!!deletingStudentUsernames[student.username]}
                        >
                          <Trash2 className="h-3 w-3" />
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
              학생 정보를 수정합니다. (캠퍼스는 변경할 수 없습니다.)
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
                <Label>숫자4자리</Label>
                <Input
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  inputMode="numeric"
                  placeholder="숫자4자리 (예: 1234)"
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
                    {formGradeCodes.map((code) => (
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
                    {formLevelCodes.map((code) => (
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
                <Label>로그인 방식</Label>
                <Input value="이름 + 숫자4자리로 로그인 (비밀번호 없음)" disabled className="bg-gray-100" />
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
