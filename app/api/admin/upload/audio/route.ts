import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      )
    }

    // 파일 크기 제한: 10MB
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 넘을 수 없습니다." },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "오디오 파일만 업로드할 수 있습니다." },
        { status: 400 }
      )
    }

    // Supabase가 설정되어 있으면 Supabase Storage 사용 시도, 실패 시 로컬 파일 시스템으로 폴백
    if (isSupabaseConfigured() && supabase) {
      try {
        // Supabase Storage에 업로드
        const timestamp = Date.now()
        const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `audio/${fileName}`

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Supabase Storage에 업로드
        const { data, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error("Supabase upload error:", uploadError)
          // Supabase 업로드 실패 시 로컬 파일 시스템으로 폴백
          console.log("Falling back to local file system storage")
          throw uploadError
        }

        // 공개 URL 가져오기
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath)

        if (!urlData?.publicUrl) {
          throw new Error("파일 URL을 가져올 수 없습니다.")
        }

        return NextResponse.json({ url: urlData.publicUrl })
      } catch (supabaseError: any) {
        // Supabase 업로드 실패 시 로컬 파일 시스템으로 폴백
        console.warn("Supabase upload failed, using local storage:", supabaseError.message)
        // 아래 로컬 저장 로직으로 계속 진행
      }
    }
    
    // 로컬 파일 시스템에 저장 (Supabase가 없거나 업로드 실패한 경우)
    {
      // 로컬 개발 환경: 파일 시스템에 저장
      const uploadDir = join(process.cwd(), "public", "uploads", "audio")
      
      // 디렉토리가 없으면 생성
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // 파일명 생성 (타임스탬프 + 원본 파일명)
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = join(uploadDir, fileName)

      // 파일 저장
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // 공개 URL 반환
      const publicUrl = `/uploads/audio/${fileName}`

      return NextResponse.json({ url: publicUrl })
    }
  } catch (error: any) {
    console.error("Audio upload error:", error)
    return NextResponse.json(
      { error: error.message || "파일 업로드에 실패했습니다." },
      { status: 500 }
    )
  }
}
