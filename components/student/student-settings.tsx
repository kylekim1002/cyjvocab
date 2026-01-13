"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { signOut } from "next-auth/react"
import { Copy, RefreshCw } from "lucide-react"

interface Student {
  id: string
  name: string
  username: string
  autoLoginToken: string | null
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
  const { toast } = useToast()
  const [autoLoginToken, setAutoLoginToken] = useState(student.autoLoginToken)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleCopyToken = () => {
    if (!autoLoginToken) return

    const url = `${window.location.origin}/s/auto/${autoLoginToken}`
    navigator.clipboard.writeText(url)
    toast({
      title: "복사 완료",
      description: "자동로그인 링크가 복사되었습니다.",
    })
  }

  const handleRegenerateToken = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/student/auto-login-token`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("토큰 재생성 실패")
      }

      const data = await response.json()
      setAutoLoginToken(data.token)
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
    } finally {
      setIsRegenerating(false)
    }
  }

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
            <Label>아이디</Label>
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
          <CardTitle>자동로그인 링크</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {autoLoginToken ? (
            <>
              <div>
                <Label>링크</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/s/auto/${autoLoginToken}`}
                    readOnly
                  />
                  <Button onClick={handleCopyToken}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleRegenerateToken}
                disabled={isRegenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                링크 재생성
              </Button>
            </>
          ) : (
            <div>
              <p className="text-muted-foreground mb-4">
                자동로그인 링크가 없습니다.
              </p>
              <Button onClick={handleRegenerateToken} disabled={isRegenerating}>
                링크 생성
              </Button>
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
