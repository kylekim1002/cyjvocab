import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const campuses = await prisma.campus.findMany({
    include: {
      teachers: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(campuses)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "캠퍼스명은 필수입니다." },
        { status: 400 }
      )
    }

    const campus = await prisma.campus.create({
      data: {
        name: name.trim(),
      },
    })

    return NextResponse.json(campus)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 캠퍼스입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "캠퍼스 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
