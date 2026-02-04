import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const campusId = searchParams.get("campus_id")

  const where: any = {}
  if (campusId) {
    where.campusId = campusId
  }

  const teachers = await prisma.teacher.findMany({
    where,
    orderBy: { name: "asc" },
  })

  return NextResponse.json(teachers)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { campusId, name } = await request.json()

    if (!campusId || !name || !name.trim()) {
      return NextResponse.json(
        { error: "캠퍼스와 선생님명은 필수입니다." },
        { status: 400 }
      )
    }

    const teacher = await prisma.teacher.create({
      data: {
        campusId,
        name: name.trim(),
      },
    })

    return NextResponse.json(teacher)
  } catch (error: any) {
    console.error("Teacher creation error:", error)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 선생님입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: "선생님 생성에 실패했습니다.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
