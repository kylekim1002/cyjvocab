import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "선생님명은 필수입니다." },
        { status: 400 }
      )
    }

    const teacher = await prisma.teacher.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
      },
    })

    return NextResponse.json(teacher)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 선생님명입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "선생님명 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await prisma.teacher.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "선생님 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
