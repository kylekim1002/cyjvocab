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
      console.log("로그인 시도:", { name, username })
      const result = await signIn("credentials", {
        username,
        // 학생 로그인: 비밀번호 없음(서버에서 name+username만 검증)
        password: "",
        name,
        redirect: false,
      })

      console.log("로그인 결과:", result)

      if (result?.error) {
        console.error("로그인 오류:", result.error)
        const errorMessage = "이름 또는 전화번호 뒷 4자리가 올바르지 않습니다."
        
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
              <Label htmlFor="name">이름</Label>
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
              <Label htmlFor="username">전화번호 뒷 4자리</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                inputMode="numeric"
                placeholder="예: 1234"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
