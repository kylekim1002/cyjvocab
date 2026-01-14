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
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("로그인 시도:", { username })
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      console.log("로그인 결과:", result)

      if (result?.error) {
        console.error("로그인 오류:", result.error)
        let errorMessage = "아이디 또는 비밀번호가 올바르지 않습니다."
        
        if (result.error === "CredentialsSignin") {
          errorMessage = "아이디 또는 비밀번호가 올바르지 않습니다."
        } else if (result.error.includes("로그인 시도가 너무 많습니다")) {
          errorMessage = result.error
        } else {
          errorMessage = `로그인에 실패했습니다: ${result.error}`
        }
        
        toast({
          title: "로그인 실패",
          description: errorMessage,
          variant: "destructive",
        })
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
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
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
