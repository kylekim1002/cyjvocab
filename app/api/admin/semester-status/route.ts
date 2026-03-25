import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getSemesterStatusRows, toSemesterStatusMap } from "@/lib/semester-status"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await getSemesterStatusRows()
    return NextResponse.json({
      rows,
      bySemester: toSemesterStatusMap(rows),
    })
  } catch (error: any) {
    console.error("Get semester status error:", error)
    return NextResponse.json(
      { error: error?.message || "학기 상태 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
