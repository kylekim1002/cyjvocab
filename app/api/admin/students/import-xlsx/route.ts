import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import * as XLSX from "xlsx"
import { generateAutoLoginToken } from "@/lib/utils"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet) as any[]

    const errors: Array<{ row: number; reason: string }> = []
    const successCount = 0

    // 캠퍼스 및 코드 조회
    const campuses = await prisma.campus.findMany()
    const gradeCodes = await prisma.code.findMany({
      where: { category: "GRADE" },
    })

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // 헤더 제외

      try {
        // 필수 필드 확인
        if (!row.campus || !row.name || !row.grade || !row.username || !row.password) {
          errors.push({
            row: rowNum,
            reason: "필수 필드가 누락되었습니다.",
          })
          continue
        }

        // 캠퍼스 확인
        const campus = campuses.find((c) => c.name === row.campus)
        if (!campus) {
          errors.push({
            row: rowNum,
            reason: `캠퍼스 '${row.campus}'를 찾을 수 없습니다.`,
          })
          continue
        }

        // 학년 코드 확인
        const gradeCode = gradeCodes.find((c) => c.value === row.grade)
        if (!gradeCode) {
          errors.push({
            row: rowNum,
            reason: `학년 '${row.grade}'를 찾을 수 없습니다.`,
          })
          continue
        }

        // 비밀번호 해시
        const hashedPassword = await bcrypt.hash(row.password, 10)

        // 자동로그인 토큰 생성
        const autoLoginToken = generateAutoLoginToken()
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        // 학생 생성
        const student = await prisma.student.create({
          data: {
            name: row.name,
            username: row.username,
            password: hashedPassword,
            plainPassword: row.password, // 관리자용 평문 비밀번호 저장
            campusId: campus.id,
            gradeId: gradeCode.id,
            school: row.school || null,
            status: "ACTIVE",
            autoLoginToken,
            autoLoginTokenExpiresAt: expiresAt,
          },
        })

        // User 생성
        await prisma.user.create({
          data: {
            id: student.id,
            username: student.username,
            password: hashedPassword,
            role: "STUDENT",
            campusId: campus.id,
          },
        })
      } catch (error: any) {
        if (error.code === "P2002") {
          errors.push({
            row: rowNum,
            reason: `아이디 '${row.username}'가 이미 존재합니다.`,
          })
        } else {
          errors.push({
            row: rowNum,
            reason: error.message || "알 수 없는 오류",
          })
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "일부 행에서 오류가 발생했습니다.",
          errors,
          successCount: data.length - errors.length,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "등록 완료",
      count: data.length,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "엑셀 업로드에 실패했습니다." },
      { status: 500 }
    )
  }
}
