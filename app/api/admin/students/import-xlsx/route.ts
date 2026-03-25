import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { hashAutoLoginToken } from "@/lib/auto-login-token"
import { generateAutoLoginToken } from "@/lib/utils"
import bcrypt from "bcryptjs"

/** 엑셀 행에서 한글/영문 컬럼명 모두 허용 */
function firstNonEmpty(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    if (k in row) {
      const v = row[k]
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim()
      }
    }
  }
  return ""
}

function normEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

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
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[]

    const errors: Array<{ row: number; reason: string }> = []
    let createdCount = 0
    let skippedDuplicateCount = 0

    // 캠퍼스 및 코드 조회
    const campuses = await prisma.campus.findMany({ orderBy: { name: "asc" } })
    const gradeCodes = await prisma.code.findMany({
      where: { category: "GRADE" },
      orderBy: { order: "asc" },
    })
    const levelCodes = await prisma.code.findMany({
      where: { category: "LEVEL" },
      orderBy: { order: "asc" },
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // 헤더 제외

      try {
        const campusName = firstNonEmpty(row, ["campus", "캠퍼스", "Campus"])
        const studentName = firstNonEmpty(row, ["name", "이름", "Name"])
        const gradeValue = firstNonEmpty(row, ["grade", "학년", "Grade"])
        const last4 = firstNonEmpty(row, ["숫자4자리", "phoneLast4", "last4", "username", "아이디"])
        const school = firstNonEmpty(row, ["school", "학교", "School"])
        const levelValueRaw = firstNonEmpty(row, ["level", "레벨", "Level"])

        // 필수 필드 확인
        if (!campusName || !studentName || !gradeValue || !last4) {
          errors.push({
            row: rowNum,
            reason: "필수 필드가 누락되었습니다.",
          })
          continue
        }

        // 캠퍼스 확인 (대소문자·앞뒤 공백 무시)
        const campus = campuses.find((c) => normEq(c.name, campusName))
        if (!campus) {
          errors.push({
            row: rowNum,
            reason: `캠퍼스 '${campusName}'를 찾을 수 없습니다. (등록된 캠퍼스명과 동일해야 합니다)`,
          })
          continue
        }

        // 학년 코드 확인
        const gradeCode = gradeCodes.find((c) => normEq(c.value, gradeValue))
        if (!gradeCode) {
          errors.push({
            row: rowNum,
            reason: `학년 '${gradeValue}'를 찾을 수 없습니다. (코드값 관리의 학년 표시와 동일)`,
          })
          continue
        }

        // 레벨 코드 확인 (선택)
        let levelId: string | null = null
        if (levelValueRaw) {
          const levelCode = levelCodes.find((c) => normEq(c.value, levelValueRaw))
          if (!levelCode) {
            errors.push({
              row: rowNum,
              reason: `레벨 '${levelValueRaw}'를 찾을 수 없습니다.`,
            })
            continue
          }
          levelId = levelCode.id
        }

        // (요청사항) 이름 + 숫자4자리가 동일한 학생은 중복으로 보고 제외
        const duplicate = await prisma.student.findFirst({
          where: {
            username: last4,
            name: { equals: studentName, mode: "insensitive" },
          },
          select: { id: true },
        })
        if (duplicate) {
          skippedDuplicateCount += 1
          continue
        }

        // 학생은 (이름 + 숫자4자리)로 로그인합니다.
        // User.username은 유니크 제약이 있으므로 내부용으로만 별도 값을 넣습니다.
        const hashedPassword = await bcrypt.hash(last4, 10)
        const internalUserUsername = `${last4}_${Date.now()}_${Math.random().toString(16).slice(2)}`

        // 자동로그인 토큰 생성
        const plainToken = generateAutoLoginToken()
        const autoLoginTokenHash = hashAutoLoginToken(plainToken)
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
              name: studentName,
            },
          })

          await tx.student.create({
            data: {
              id: user.id,
              name: studentName,
              username: last4,
              password: hashedPassword,
              campusId: campus.id,
              gradeId: gradeCode.id,
              levelId,
              school: school ? school : null,
              status: "ACTIVE",
              autoLoginTokenHash,
              autoLoginTokenExpiresAt: expiresAt,
            },
          })
        })

        createdCount += 1
      } catch (error: any) {
        if (error.code === "P2002") {
          const phoneLast4ForError = firstNonEmpty(row, ["숫자4자리", "phoneLast4", "last4", "username"])
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
          createdCount,
          skippedDuplicateCount,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "등록 완료",
      count: createdCount,
      skippedDuplicateCount,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "엑셀 업로드에 실패했습니다." },
      { status: 500 }
    )
  }
}
