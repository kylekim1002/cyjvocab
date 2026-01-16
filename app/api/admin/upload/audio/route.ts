import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from "@/lib/supabase"

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

    // Supabase Storage 사용 (프로덕션 필수)
    if (!isSupabaseConfigured() || !supabase) {
      console.error("Supabase is not configured")
      return NextResponse.json(
        { 
          error: "Supabase Storage가 설정되지 않았습니다. 환경 변수를 확인해주세요.",
          details: "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
        },
        { status: 500 }
      )
    }

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
      
      // 에러 타입별 상세 메시지
      let errorMessage = "파일 업로드에 실패했습니다."
      if (uploadError.message.includes("signature verification failed")) {
        errorMessage = "Supabase 인증 오류입니다. SUPABASE_SERVICE_ROLE_KEY를 확인해주세요."
      } else if (uploadError.message.includes("Bucket not found")) {
        errorMessage = `Storage 버킷 '${STORAGE_BUCKET}'을 찾을 수 없습니다. Supabase에서 버킷을 생성해주세요.`
      } else if (uploadError.message.includes("new row violates row-level security")) {
        errorMessage = "Storage 버킷 정책이 잘못 설정되었습니다. Supabase Storage 정책을 확인해주세요."
      } else {
        errorMessage = `파일 업로드 실패: ${uploadError.message}`
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: uploadError.message
        },
        { status: 500 }
      )
    }

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "파일 URL을 가져올 수 없습니다." },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error: any) {
    console.error("Audio upload error:", error)
    return NextResponse.json(
      { error: error.message || "파일 업로드에 실패했습니다." },
      { status: 500 }
    )
  }
}
