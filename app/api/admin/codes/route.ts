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
  const session = await getServerSession(authOptions)

  // 코드값 관리는 최종 관리자만 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { category, value, order } = await request.json()

    if (!category || !value) {
      return NextResponse.json(
        { error: "카테고리와 값은 필수입니다." },
        { status: 400 }
      )
    }

    const code = await prisma.code.create({
      data: {
        category: category as CodeCategory,
        value: value.trim(),
        order: order || 0,
      },
    })

    return NextResponse.json(code)
  } catch (error: any) {
    console.error("Code creation error:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 코드값입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: "코드값 생성에 실패했습니다.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
