"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signOut } from "next-auth/react"

interface Student {
  id: string
  name: string
  username: string
  /** 평문 토큰은 DB에 저장하지 않으므로 링크 URL은 표시하지 않음 */
  hasAutoLoginLink: boolean
  campus: {
    name: string
  }
  grade: {
    value: string
  } | null
}

interface StudentSettingsProps {
  student: Student
}

export function StudentSettings({ student }: StudentSettingsProps) {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>학생 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>이름</Label>
            <Input value={student.name} disabled />
          </div>
          <div>
            <Label>숫자4자리</Label>
            <Input value={student.username} disabled />
          </div>
          <div>
            <Label>캠퍼스</Label>
            <Input value={student.campus.name} disabled />
          </div>
          {student.grade && (
            <div>
              <Label>학년</Label>
              <Input value={student.grade.value} disabled />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
