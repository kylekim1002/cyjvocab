import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { username: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      gradeId,
      levelId,
      school,
      status,
      username: newUsername,
      studentId,
    } = body

    if (!params.username) {
      return NextResponse.json(
        { error: "학생 숫자4자리가 필요합니다." },
        { status: 400 }
      )
    }

    console.log("Update student request:", {
      username: params.username,
      body: { name, gradeId, levelId, school, status, studentId },
    })

    // 학생 존재 확인 (숫자4자리가 중복될 수 있으므로 studentId 우선)
    const targetStudent = studentId
      ? await prisma.student.findUnique({ where: { id: String(studentId) } })
      : await prisma.student.findFirst({
          where: {
            username: params.username,
            ...(typeof name === "string" && name.trim()
              ? { name: name.trim() }
              : {}),
          },
          orderBy: { createdAt: "desc" },
        })

    if (!targetStudent) {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학년 코드 검증
    let trimmedGradeId = targetStudent.gradeId
    if (gradeId && gradeId.trim()) {
      const gradeCode = await prisma.code.findUnique({
        where: { id: gradeId.trim() },
      })
      if (!gradeCode || gradeCode.category !== "GRADE") {
        return NextResponse.json(
          { error: "학년 코드를 찾을 수 없습니다." },
          { status: 400 }
        )
      }
      trimmedGradeId = gradeId.trim()
    }

    // 레벨 코드 검증 (선택사항)
    let trimmedLevelId = targetStudent.levelId
    if (levelId !== undefined) {
      if (levelId && levelId !== "none" && levelId.trim()) {
        const levelCode = await prisma.code.findUnique({
          where: { id: levelId.trim() },
        })
        if (!levelCode || levelCode.category !== "LEVEL") {
          return NextResponse.json(
            { error: "레벨 코드를 찾을 수 없습니다." },
            { status: 400 }
          )
        }
        trimmedLevelId = levelId.trim()
      } else {
        trimmedLevelId = null
      }
    }

    // 업데이트 데이터 준비
    const trimmedNewUsername =
      typeof newUsername === "string" && newUsername.trim()
        ? newUsername.trim()
        : undefined

    const updateData: any = {
      name: typeof name === "string" ? name.trim() : targetStudent.name,
      gradeId: trimmedGradeId,
      levelId: trimmedLevelId,
      school:
        school !== undefined ? (school?.trim() || null) : targetStudent.school,
      status: status || targetStudent.status,
      ...(trimmedNewUsername ? { username: trimmedNewUsername } : {}),
    }
    const updatedStudent = await prisma.student.update({
      where: { id: targetStudent.id },
      data: updateData,
      include: {
        campus: true,
        grade: true,
        level: true,
      },
    })

    console.log("Student updated successfully:", updatedStudent.id)
    return NextResponse.json(updatedStudent)
  } catch (error: any) {
    console.error("Update student error:", error)
    console.error("Error stack:", error.stack)
    
    // Prisma 에러 처리
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "학생을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: error.message || "학생 정보 수정에 실패했습니다." },
      { status: 500 }
    )
  }
}
