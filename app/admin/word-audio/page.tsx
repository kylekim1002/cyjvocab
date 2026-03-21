import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { WordAudioManagement } from "@/components/admin/word-audio-management"

export default async function WordAudioPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/login")
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">음원 관리</h1>
        <p className="text-muted-foreground mt-1">
          단어별 MP3를 풀에 올린 뒤, 학습 관리에서 해당 학습에 대해 &quot;음원 풀에서 자동 연결&quot;을 실행하세요.
        </p>
      </div>
      <WordAudioManagement />
    </div>
  )
}
