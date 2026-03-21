import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { generateAutoLoginToken } from "@/lib/utils"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get("campus_id")
    const name = searchParams.get("name")
    const gradeId = searchParams.get("grade_id")
    const levelId = searchParams.get("level_id")

    const where: any = {
      status: "ACTIVE",
    }
    
    // campus_id가 있으면 필터링, 없으면 모든 학생 조회
    if (campusId) {
      where.campusId = campusId
    }

    if (name) {
      where.name = { contains: name, mode: "insensitive" }
    }

    if (gradeId) {
      where.gradeId = gradeId
    }

    if (levelId) {
      where.levelId = levelId
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        campus: {
          select: {
            id: true,
            name: true,
          },
        },
        grade: true,
        level: true,
        studentClasses: {
          where: {
            endAt: null, // 현재 배정된 클래스만
          },
          include: {
            class: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("Get students error:", error)
    return NextResponse.json(
      { error: "학생 목록 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log("=== API: Received request body ===")
    console.log(JSON.stringify(body, null, 2))
    
    const { campusId, name, gradeId, levelId, username, school, status } = body

    // 필수 필드 확인
    if (!campusId || !name || !gradeId || !username) {
      console.error("Missing required fields:", { 
        campusId: campusId || "MISSING", 
        name: name || "MISSING", 
        gradeId: gradeId || "MISSING", 
        username: username || "MISSING", 
      })
      return NextResponse.json(
        { error: "캠퍼스, 학생명, 학년, 아이디는 필수입니다." },
        { status: 400 }
      )
    }

    // 빈 문자열 체크
    if (!campusId.trim() || !gradeId.trim()) {
      console.error("Empty string in IDs:", { 
        campusId: `"${campusId}"`, 
        gradeId: `"${gradeId}"`,
        campusIdLength: campusId?.length,
        gradeIdLength: gradeId?.length
      })
      return NextResponse.json(
        { error: "캠퍼스와 학년을 선택해주세요." },
        { status: 400 }
      )
    }

    console.log("Validating IDs:", {
      campusId: campusId.trim(),
      gradeId: gradeId.trim(),
      campusIdType: typeof campusId,
      gradeIdType: typeof gradeId
    })

    // ID 정리 (먼저 trim)
    const trimmedCampusId = campusId.trim()
    const trimmedGradeId = gradeId.trim()
    const phoneLast4 = username.trim()
    const studentName = name.trim()
    // User.username은 DB 유니크 제약이 있으므로 학생의 숫자4자리와 분리합니다.
    // 로그인은 Student.name + Student.username(숫자4자리)로 처리합니다.
    const internalUserUsername = `${phoneLast4}_${Date.now()}_${Math.random().toString(16).slice(2)}`

    // (요청사항) 이름 + 숫자4자리가 동일한 학생이 이미 있으면 중복으로 보고 등록 차단
    const existingStudent = await prisma.student.findFirst({
      where: {
        username: phoneLast4,
        name: { equals: studentName, mode: "insensitive" },
      },
      select: { id: true },
    })

    if (existingStudent) {
      return NextResponse.json(
        { error: "이미 등록된 학생입니다. (이름 + 숫자4자리 중복)" },
        { status: 409 }
      )
    }

    // 캠퍼스 존재 확인
    const campus = await prisma.campus.findUnique({
      where: { id: trimmedCampusId },
    })

    if (!campus) {
      console.error("Campus not found:", trimmedCampusId)
      // 모든 캠퍼스 목록 확인
      const allCampuses = await prisma.campus.findMany()
      console.error("Available campuses:", allCampuses.map(c => ({ id: c.id, name: c.name })))
      return NextResponse.json(
        { error: `캠퍼스를 찾을 수 없습니다. (ID: ${trimmedCampusId})` },
        { status: 400 }
      )
    }

    // 학년 코드 존재 확인
    const gradeCode = await prisma.code.findUnique({
      where: { id: trimmedGradeId },
    })

    if (!gradeCode) {
      console.error("Grade code not found:", trimmedGradeId)
      // 모든 학년 코드 목록 확인
      const allGradeCodes = await prisma.code.findMany({
        where: { category: "GRADE" },
      })
      console.error("Available grade codes:", allGradeCodes.map(c => ({ id: c.id, value: c.value })))
      return NextResponse.json(
        { error: `학년 코드를 찾을 수 없습니다. (ID: ${trimmedGradeId})` },
        { status: 400 }
      )
    }

    if (gradeCode.category !== "GRADE") {
      console.error("Grade code category mismatch:", gradeCode.category)
      return NextResponse.json(
        { error: `선택한 코드가 학년 코드가 아닙니다. (카테고리: ${gradeCode.category})` },
        { status: 400 }
      )
    }

    // 학생은 "이름 + 아이디(username)"로 로그인 (비밀번호 입력 없음)
    // 스키마 상 password가 필수라서 내부적으로 username 기반 해시 저장
    const hashedPassword = await bcrypt.hash(phoneLast4, 10)

    // 자동로그인 토큰 생성
    const autoLoginToken = generateAutoLoginToken()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    console.log("Creating student with IDs:", {
      campusId: trimmedCampusId,
      gradeId: trimmedGradeId,
      campusExists: !!campus,
      gradeCodeExists: !!gradeCode
    })

    // 트랜잭션으로 User를 먼저 생성하고 Student를 생성
    // Student.id가 User.id를 참조하므로, User를 먼저 생성해야 함
    const result = await prisma.$transaction(async (tx) => {
      // 임시로 User를 생성하여 ID를 얻음 (나중에 업데이트)
      const tempUser = await tx.user.create({
        data: {
          username: internalUserUsername,
          password: hashedPassword,
          role: "STUDENT",
          campusId: trimmedCampusId,
        },
      })

      const studentId = tempUser.id

      console.log("Created user with ID:", studentId)

      // 레벨 코드 검증 (선택사항)
      let trimmedLevelId = null
      if (levelId && levelId !== "none" && levelId.trim()) {
        const levelCode = await tx.code.findUnique({
          where: { id: levelId.trim() },
        })
        if (!levelCode || levelCode.category !== "LEVEL") {
          throw new Error("레벨 코드를 찾을 수 없거나 유효하지 않습니다.")
        }
        trimmedLevelId = levelId.trim()
      }

      // Student 생성 (User ID와 동일한 ID 사용)
      const student = await tx.student.create({
        data: {
          id: studentId,
          name: studentName,
          username: phoneLast4,
          password: hashedPassword,
          plainPassword: null,
          campusId: trimmedCampusId,
          gradeId: trimmedGradeId,
          levelId: trimmedLevelId,
          school: school?.trim() || null,
          status: status || "ACTIVE",
          autoLoginToken,
          autoLoginTokenExpiresAt: expiresAt,
        },
      })

      return student
    })

    return NextResponse.json({
      ...result,
      autoLoginToken,
    })
  } catch (error: any) {
    console.error("Create student error:", error)
    
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0]
      if (field === "username") {
        return NextResponse.json(
          { error: "이미 존재하는 아이디입니다." },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `이미 존재하는 ${field}입니다.` },
        { status: 400 }
      )
    }

    if (error.code === "P2003") {
      console.error("Foreign key constraint failed:", error.meta)
      const fieldName = error.meta?.field_name || "unknown"
      
      // 어떤 필드에서 문제가 발생했는지 확인
      if (fieldName.includes("campusId") || fieldName.includes("Campus")) {
        return NextResponse.json(
          { error: `캠퍼스를 찾을 수 없습니다. (필드: ${fieldName})` },
          { status: 400 }
        )
      } else if (fieldName.includes("gradeId") || fieldName.includes("Grade") || fieldName.includes("Code")) {
        return NextResponse.json(
          { error: `학년 코드를 찾을 수 없습니다. (필드: ${fieldName})` },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `외래키 제약 조건 위반: ${fieldName}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "학생 등록에 실패했습니다." },
      { status: 500 }
    )
  }
}
