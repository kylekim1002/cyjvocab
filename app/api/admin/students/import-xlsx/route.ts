import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { generateAutoLoginToken } from "@/lib/utils"
import bcrypt from "bcryptjs"

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
    const levelCodes = await prisma.code.findMany({
      where: { category: "LEVEL" },
    })

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 2 // 헤더 제외

      try {
        const phoneLast4 =
          row["숫자4자리"] ??
          row.phoneLast4 ??
          row.last4 ??
          row.username

        // 필수 필드 확인
        if (!row.campus || !row.name || !row.grade || !phoneLast4) {
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

        // 레벨 코드 확인 (선택)
        let levelId: string | null = null
        if (row.level !== undefined && row.level !== null && String(row.level).trim()) {
          const levelValue = String(row.level).trim()
          const levelCode = levelCodes.find((c) => c.value === levelValue)
          if (!levelCode) {
            errors.push({
              row: rowNum,
              reason: `레벨 '${levelValue}'를 찾을 수 없습니다.`,
            })
            continue
          }
          levelId = levelCode.id
        }

        // 학생은 (이름 + 숫자4자리)로 로그인합니다.
        // User.username은 유니크 제약이 있으므로 내부용으로만 별도 값을 넣습니다.
        const last4 = String(phoneLast4).trim()
        const hashedPassword = await bcrypt.hash(last4, 10)
        const internalUserUsername = `${last4}_${Date.now()}_${Math.random().toString(16).slice(2)}`

        // 자동로그인 토큰 생성
        const autoLoginToken = generateAutoLoginToken()
        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        // 스키마에서 Student.id는 User.id를 참조하므로, User를 먼저 생성해야 함
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              username: internalUserUsername,
              password: hashedPassword,
              role: "STUDENT",
              campusId: campus.id,
              name: String(row.name),
            },
          })

          await tx.student.create({
            data: {
              id: user.id,
              name: String(row.name),
              username: last4,
              password: hashedPassword,
              plainPassword: null,
              campusId: campus.id,
              gradeId: gradeCode.id,
              levelId,
              school: row.school || null,
              status: "ACTIVE",
              autoLoginToken,
              autoLoginTokenExpiresAt: expiresAt,
            },
          })
        })
      } catch (error: any) {
        if (error.code === "P2002") {
          const phoneLast4ForError =
            row["숫자4자리"] ?? row.phoneLast4 ?? row.last4 ?? row.username
          errors.push({
            row: rowNum,
            reason: `숫자4자리 '${phoneLast4ForError}'가 이미 존재합니다.`,
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
