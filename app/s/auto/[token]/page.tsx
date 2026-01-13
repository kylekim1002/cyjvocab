"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AutoLoginPage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = params.token as string
    if (!token) {
      setStatus("error")
      setMessage("토큰이 없습니다.")
      return
    }

    handleAutoLogin(token)
  }, [params.token])

  const handleAutoLogin = async (token: string) => {
    try {
      console.log("Auto login attempt with token:", token)
      
      // 토큰 검증
      const response = await fetch("/api/auth/auto-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      console.log("Auto login API response:", data)

      if (!response.ok) {
        setStatus("error")
        if (data.error === "INACTIVE") {
          setMessage("캠퍼스로 문의하세요")
        } else if (data.error === "NO_CLASS") {
          setMessage("캠퍼스로 문의하세요(반 배정 필요)")
        } else {
          setMessage(data.error || "자동로그인에 실패했습니다.")
        }
        return
      }

      console.log("Token verified, attempting signIn...")

      // NextAuth 세션 생성 (토큰을 username으로 전달)
      const result = await signIn("credentials", {
        username: token, // 토큰을 username으로 전달
        password: "auto-login-token", // 특별한 값으로 자동로그인 구분
        redirect: false,
      })

      console.log("SignIn result:", result)

      if (result?.ok) {
        setStatus("success")
        // 세션이 생성될 시간을 주기 위해 약간의 지연
        setTimeout(() => {
          router.push("/student")
          router.refresh()
        }, 500)
      } else {
        setStatus("error")
        console.error("SignIn failed:", result?.error)
        setMessage(result?.error || "로그인에 실패했습니다.")
      }
    } catch (error: any) {
      console.error("Auto login error:", error)
      setStatus("error")
      setMessage(error.message || "오류가 발생했습니다.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">자동 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="text-center py-8">
              <p>로그인 중...</p>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-4">
              <p className="text-center text-destructive">{message}</p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
              >
                로그인 페이지로 이동
              </Button>
            </div>
          )}
          {status === "success" && (
            <div className="text-center py-8">
              <p>로그인 성공! 이동 중...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
