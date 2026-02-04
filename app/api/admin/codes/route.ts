import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { CodeCategory } from "@prisma/client"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // 코드값 관리는 최종 관리자만 가능
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const codes = await prisma.code.findMany({
      orderBy: [
        { category: "asc" },
        { order: "asc" },
      ],
    })

    return NextResponse.json(codes)
  } catch (error) {
    console.error("Error fetching codes:", error)
    return NextResponse.json(
      { error: "코드값 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // 세션 확인
    let session
    try {
      session = await getServerSession(authOptions)
    } catch (sessionError: any) {
      console.error("Session error:", sessionError)
      return NextResponse.json(
        { 
          error: "세션 확인에 실패했습니다.",
          details: sessionError.message,
        },
        { status: 500 }
      )
    }

    // 코드값 관리는 최종 관리자만 가능
    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      console.error("Unauthorized code creation attempt:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        role: session?.user?.role,
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 요청 본문 파싱
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error("Request body parse error:", parseError)
      return NextResponse.json(
        { 
          error: "요청 데이터를 읽을 수 없습니다.",
          details: parseError.message,
        },
        { status: 400 }
      )
    }

    console.log("Code creation request:", { 
      body, 
      sessionUser: session.user.username,
      timestamp: new Date().toISOString(),
    })

    const { category, value, order } = body

    if (!category || !value) {
      return NextResponse.json(
        { error: "카테고리와 값은 필수입니다." },
        { status: 400 }
      )
    }

    // 코드 생성
    const code = await prisma.code.create({
      data: {
        category: category as CodeCategory,
        value: value.trim(),
        order: order || 0,
      },
    })

    console.log("Code created successfully:", { id: code.id, category: code.category, value: code.value })
    return NextResponse.json(code)
  } catch (error: any) {
    console.error("Code creation error:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      name: error.name,
    })
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 코드값입니다." },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: "코드값 생성에 실패했습니다.",
        details: error.message || "알 수 없는 오류가 발생했습니다.",
        errorCode: error.code || "UNKNOWN",
      },
      { status: 500 }
    )
  }
}
