import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-options"
import { WordImageManagement } from "@/components/admin/word-image-management"

export default async function WordImagePage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    redirect("/login")
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">이미지 관리</h1>
        <p className="text-muted-foreground mt-1">
          단어별 이미지를 풀에 올린 뒤, 학습 관리(TYPE_B)에서 해당 학습에 대해 &quot;이미지 풀에서 자동 연결&quot;을
          실행하세요. (음원 풀과 동일하게 파일명·단어 키로 매칭)
        </p>
      </div>
      <WordImageManagement />
    </div>
  )
}
