import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { getSemesterLevelMapRows, groupSemesterLevelMappings } from "@/lib/semester-level-map"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const rows = await getSemesterLevelMapRows()
    return NextResponse.json({
      rows,
      bySemester: groupSemesterLevelMappings(rows),
    })
  } catch (error: any) {
    console.error("Get semester-level map error:", error)
    return NextResponse.json(
      { error: error?.message || "학기-레벨 매핑 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
