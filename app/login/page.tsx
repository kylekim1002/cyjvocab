"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("학생 로그인 시도:", { name, username })
      const result = await signIn("credentials", {
        username,
        password: "",
        name,
        loginType: "student",
        redirect: false,
      })

      console.log("로그인 결과:", result)

      if (result?.error) {
        console.error("로그인 오류:", result.error)
        const errorMessage = "이름 또는 비밀번호가 올바르지 않습니다."
        
        if (result.error === "CredentialsSignin") {
          toast({
            title: "로그인 실패",
            description: errorMessage,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        } else if (result.error.includes("로그인 시도가 너무 많습니다")) {
          toast({
            title: "로그인 실패",
            description: result.error,
            variant: "destructive",
          })
          setIsLoading(false)
          return
        } else {
          toast({
            title: "로그인 실패",
            description: `로그인에 실패했습니다: ${result.error}`,
            variant: "destructive",
          })
        }
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // 세션에서 역할 확인 후 리다이렉트
        const response = await fetch("/api/auth/session")
        const session = await response.json()
        
        if (session?.user?.role === "STUDENT") {
          router.push("/student")
        } else {
          router.push("/admin")
        }
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "로그인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">아이디</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">비밀번호</Label>
              <Input
                id="username"
                type="password"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          {/* 테두리박스(카드) 하단 중앙 로고 - 기능 변경 없음 */}
          <div className="flex justify-center mt-6">
            <img
              src="/jr-logo.png"
              alt="정이솜 주니어 영어학습원"
              className="h-10 w-auto object-contain select-none pointer-events-none"
              draggable={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
