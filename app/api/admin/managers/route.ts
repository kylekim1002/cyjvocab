import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    include: {
      campus: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    managers.map((m) => ({
      id: m.id,
      username: m.username,
      name: m.name,
      role: m.role,
      isActive: m.isActive,
      campusId: m.campusId,
      campusName: m.campus?.name || null,
      createdAt: m.createdAt,
    }))
  )
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { username, password, name, campusId } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호는 필수입니다." },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashed,
        name: name?.trim() || null,
        role: "MANAGER",
        campusId: campusId || null,
        isActive: true,
      },
    })

    return NextResponse.json({ id: user.id }, { status: 201 })
  } catch (error: any) {
    console.error("Create manager error:", error)
    return NextResponse.json(
      { error: "관리자 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}

