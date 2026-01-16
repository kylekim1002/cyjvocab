import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, password, campusId, isActive } = await request.json()

    const data: any = {}
    if (name !== undefined) data.name = name?.trim() || null
    if (campusId !== undefined) data.campusId = campusId || null
    if (typeof isActive === "boolean") data.isActive = isActive
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: {
        id: params.id,
      },
      data,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Update manager error:", error)
    return NextResponse.json(
      { error: "관리자 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

