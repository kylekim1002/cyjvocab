import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
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
    const { value, order } = await request.json()

    if (!value || value.trim() === "") {
      return NextResponse.json(
        { error: "값은 필수입니다." },
        { status: 400 }
      )
    }

    const code = await prisma.code.update({
      where: { id: params.id },
      data: {
        value: value.trim(),
        order: order !== undefined ? order : undefined,
      },
    })

    return NextResponse.json(code)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 코드값입니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "코드값 수정에 실패했습니다." },
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
    await prisma.code.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "코드값 삭제에 실패했습니다." },
      { status: 500 }
    )
  }
}
