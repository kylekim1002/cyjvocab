"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Download, Search } from "lucide-react"

interface Campus {
  id: string
  name: string
}

interface Code {
  id: string
  category: string
  value: string
}

interface ScoreData {
  date: string
  campusName: string
  className: string
  teacherName: string
  studentName: string
  grade: string
  level: string
  moduleTitle: string
  wordProgressPct: number
  memorizationProgressPct: number
  testBestScorePct: number | null
}

interface ScoresManagementProps {
  campuses: Campus[]
  codes: Code[]
}

export function ScoresManagement({ campuses, codes }: ScoresManagementProps) {
  const { toast } = useToast()
  const [campusId, setCampusId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterValue, setFilterValue] = useState<string>("")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [selectedGradeId, setSelectedGradeId] = useState<string>("")
  const [selectedLevelId, setSelectedLevelId] = useState<string>("")
  const [classes, setClasses] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [scores, setScores] = useState<ScoreData[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 0,
  })

  const gradeCodes = codes.filter((c) => c.category === "GRADE")
  const levelCodes = codes.filter((c) => c.category === "LEVEL")

  // 캠퍼스 선택 시 클래스 및 선생님 목록 조회
  const handleCampusChange = async (value: string) => {
    setCampusId(value)
    setSelectedClassId("")
    setSelectedTeacherId("")
    setClasses([])
    setTeachers([])

    if (!value) return

    try {
      const response = await fetch(`/api/admin/classes?campus_id=${value}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }

      const teacherResponse = await fetch(`/api/admin/teachers?campus_id=${value}`)
      if (teacherResponse.ok) {
        const teacherData = await teacherResponse.json()
        setTeachers(teacherData)
      }
    } catch (error) {
      console.error("Failed to fetch classes/teachers:", error)
    }
  }

  // 조회
  const handleSearch = async () => {
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
      const params = new URLSearchParams({
        campus_id: campusId,
        date_from: dateFrom,
        date_to: dateTo,
        page: "1",
        page_size: "100",
      })

      // 필터 조건 추가
      if (filterType && filterValue) {
        params.append("filter_type", filterType)
        params.append("filter_value", filterValue)
      }

      const response = await fetch(`/api/admin/scores?${params}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "조회에 실패했습니다.")
      }

      const data = await response.json()
      setScores(data.data)
      setPagination(data.pagination)
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

  // 엑셀 다운로드
  const handleExport = async () => {
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

    try {
      const params = new URLSearchParams({
        campus_id: campusId,
        date_from: dateFrom,
        date_to: dateTo,
      })

      if (filterType && filterValue) {
        params.append("filter_type", filterType)
        params.append("filter_value", filterValue)
      }

      const response = await fetch(`/api/admin/scores/export?${params}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "다운로드에 실패했습니다.")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `scores_${campusId}_${dateFrom}_${dateTo}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "성공",
        description: "엑셀 파일이 다운로드되었습니다.",
      })
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message || "다운로드에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 필터 타입 변경 시 필터 값 초기화
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value)
    setFilterValue("")
    setSelectedClassId("")
    setSelectedTeacherId("")
    setSelectedGradeId("")
    setSelectedLevelId("")
  }

  // 필터 값 설정
  const handleFilterValueChange = (value: string) => {
    setFilterValue(value)
    if (filterType === "class_name") {
      setSelectedClassId(value)
    } else if (filterType === "teacher_name") {
      setSelectedTeacherId(value)
    } else if (filterType === "grade") {
      setSelectedGradeId(value)
    } else if (filterType === "level") {
      setSelectedLevelId(value)
    }
  }

  return (
    <div className="space-y-6">
      {/* 조회 조건 */}
      <Card>
        <CardHeader>
          <CardTitle>조회 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 캠퍼스 선택 */}
            <div>
              <Label>캠퍼스 *</Label>
              <Select value={campusId} onValueChange={handleCampusChange}>
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

            {/* 필터 타입 */}
            <div>
              <Label>필터 조건</Label>
              <Select value={filterType} onValueChange={handleFilterTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="필터 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student_name">학생명</SelectItem>
                  <SelectItem value="class_name">반명</SelectItem>
                  <SelectItem value="teacher_name">선생님명</SelectItem>
                  <SelectItem value="grade">학년</SelectItem>
                  <SelectItem value="level">레벨</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 필터 값 */}
            {filterType && (
              <div>
                <Label>필터 값</Label>
                {filterType === "student_name" ? (
                  <Input
                    value={filterValue}
                    onChange={(e) => handleFilterValueChange(e.target.value)}
                    placeholder="학생명 입력"
                  />
                ) : filterType === "class_name" ? (
                  <Select value={filterValue} onValueChange={handleFilterValueChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="반 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : filterType === "teacher_name" ? (
                  <Select value={filterValue} onValueChange={handleFilterValueChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="선생님 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.name}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : filterType === "grade" ? (
                  <Select value={filterValue} onValueChange={handleFilterValueChange}>
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
                ) : filterType === "level" ? (
                  <Select value={filterValue} onValueChange={handleFilterValueChange}>
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
                ) : null}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              조회
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={loading || scores.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 결과 테이블 */}
      {scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              조회 결과 ({pagination.total}건, {pagination.page}/{pagination.totalPages}페이지)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>캠퍼스명</TableHead>
                    <TableHead>반명</TableHead>
                    <TableHead>선생님명</TableHead>
                    <TableHead>학생명</TableHead>
                    <TableHead>학년</TableHead>
                    <TableHead>레벨</TableHead>
                    <TableHead>학습명</TableHead>
                    <TableHead>단어목록 진행률(%)</TableHead>
                    <TableHead>암기학습 진행률(%)</TableHead>
                    <TableHead>테스트 최고점(점)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(score.date).toLocaleDateString("ko-KR")}</TableCell>
                      <TableCell>{score.campusName}</TableCell>
                      <TableCell>{score.className}</TableCell>
                      <TableCell>{score.teacherName}</TableCell>
                      <TableCell>{score.studentName}</TableCell>
                      <TableCell>{score.grade}</TableCell>
                      <TableCell>{score.level}</TableCell>
                      <TableCell>{score.moduleTitle}</TableCell>
                      <TableCell>{score.wordProgressPct}%</TableCell>
                      <TableCell>{score.memorizationProgressPct}%</TableCell>
                      <TableCell>{score.testBestScorePct !== null ? `${score.testBestScorePct}점` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
