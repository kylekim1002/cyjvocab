import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // SUPER_ADMIN만 접근 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { campus_id, date_from, date_to } = await request.json()

    // 캠퍼스 필수
    if (!campus_id) {
      return NextResponse.json(
        { error: "캠퍼스를 선택해주세요." },
        { status: 400 }
      )
    }

    // 날짜 필수
    if (!date_from || !date_to) {
      return NextResponse.json(
        { error: "조회 기간을 선택해주세요." },
        { status: 400 }
      )
    }

    // 날짜를 명시적으로 설정 (시작일 00:00:00, 종료일 23:59:59.999)
    const fromDate = new Date(date_from)
    fromDate.setHours(0, 0, 0, 0) // 시작일 00:00:00
    const toDate = new Date(date_to)
    toDate.setHours(23, 59, 59, 999) // 종료일 23:59:59.999

    // 31일 제한 검증
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 31) {
      return NextResponse.json(
        { error: "조회 기간은 최대 31일까지 가능합니다." },
        { status: 400 }
      )
    }

    // 캠퍼스 정보 조회
    const campus = await prisma.campus.findUnique({
      where: { id: campus_id },
      select: { name: true },
    })

    if (!campus) {
      return NextResponse.json(
        { error: "캠퍼스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      campusName: campus.name,
      dateFrom: date_from,
      dateTo: date_to,
    })
  } catch (error: any) {
    console.error("Data cleanup preview error:", error)
    return NextResponse.json(
      { error: "조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
