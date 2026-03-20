import { UserRole, StudentStatus } from '@prisma/client'
import { prisma } from './prisma'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  campusId?: string | null
  studentId?: string
  studentStatus?: StudentStatus
  hasActiveClass?: boolean
}

export async function verifyCredentials(
  username: string,
  password: string,
  name?: string,
  ipAddress?: string
): Promise<AuthUser | null> {
  try {
    console.log("=== verifyCredentials 시작 ===")
    console.log("Username:", username)
    console.log("Password length:", password?.length)
    console.log("Name provided:", !!name)

    const inputName = (name ?? "").trim()
    if (!inputName) {
      await recordLoginAttempt(username, false, ipAddress)
      return null
    }
    const normalizedInputName = inputName.replace(/\s+/g, "").toLowerCase()

    // 학생 로그인: Student.username(숫자4자리, 중복 가능) + Student.name 조합으로 찾음
    const candidateStudents = await prisma.student.findMany({
      where: { username },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            campusId: true,
            isActive: true,
          },
        },
        studentClasses: {
          where: {
            class: { deletedAt: null },
          },
          take: 1,
        },
      },
      take: 20,
    })

    const matchedStudent = candidateStudents.find((s) => {
      const actual = (s.name ?? "").trim()
      if (!actual) return false
      const normalizedActual = actual.replace(/\s+/g, "").toLowerCase()
      return normalizedActual === normalizedInputName
    })

    if (matchedStudent) {
      if (matchedStudent.status !== StudentStatus.ACTIVE) {
        await recordLoginAttempt(username, false, ipAddress, matchedStudent.id)
        return null
      }
      if (!matchedStudent.user || !matchedStudent.user.isActive) {
        await recordLoginAttempt(username, false, ipAddress, matchedStudent.id)
        return null
      }

      await recordLoginAttempt(username, true, ipAddress, matchedStudent.user.id)

      return {
        id: matchedStudent.user.id,
        username: matchedStudent.user.username,
        role: matchedStudent.user.role,
        campusId: matchedStudent.user.campusId,
        studentId: matchedStudent.id,
        studentStatus: matchedStudent.status,
        hasActiveClass: (matchedStudent.studentClasses?.length ?? 0) > 0,
      }
    }

    // 관리자/매니저 로그인: User.username(유니크) + User.name 일치로 인증
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        student: {
          include: {
            studentClasses: {
              where: {
                class: { deletedAt: null },
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!user) {
      await recordLoginAttempt(username, false, ipAddress)
      return null
    }

    if (!user.isActive) {
      await recordLoginAttempt(username, false, ipAddress, user.id)
      return null
    }

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.MANAGER) {
      // 학생인데 user.username으로는 매칭되지 않은 케이스이므로 실패 처리
      await recordLoginAttempt(username, false, ipAddress, user.id)
      return null
    }

    const actualName = (user.name ?? "").trim()
    const normalizedActualName = actualName.replace(/\s+/g, "").toLowerCase()
    if (!actualName || normalizedActualName !== normalizedInputName) {
      await recordLoginAttempt(username, false, ipAddress, user.id)
      return null
    }

    await recordLoginAttempt(username, true, ipAddress, user.id)

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      campusId: user.campusId,
      studentId: user.student?.id,
      studentStatus: user.student?.status,
      hasActiveClass: (user.student?.studentClasses?.length ?? 0) > 0,
    }
  } catch (error: any) {
    // 데이터베이스 연결 실패 시 에러 로깅
    console.error('Database connection error in verifyCredentials:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    })
    // 에러를 throw하지 않고 null 반환 (로그인 실패로 처리)
    return null
  }
}

export async function verifyAutoLoginToken(
  token: string
): Promise<AuthUser | null> {
  try {
    console.log("Verifying auto login token:", token)
    
    const student = await prisma.student.findUnique({
      where: { autoLoginToken: token },
      include: {
        studentClasses: {
          where: {
            class: {
              deletedAt: null,
            },
          },
          take: 1,
        },
        user: true,
      },
    })

    if (!student) {
      console.log("Student not found for token:", token)
      return null
    }

    console.log("Student found:", {
      id: student.id,
      username: student.username,
      status: student.status,
      hasClasses: student.studentClasses.length > 0,
      hasUser: !!student.user,
    })

    // 토큰 만료 확인
    if (student.autoLoginTokenExpiresAt && student.autoLoginTokenExpiresAt < new Date()) {
      console.log("Token expired:", student.autoLoginTokenExpiresAt)
      return null
    }

    // 학생 상태 확인
    if (student.status !== StudentStatus.ACTIVE) {
      console.log("Student is not ACTIVE:", student.status)
      return null
    }

    // 클래스 배정 확인은 제거 (학생이 클래스 배정 전에도 자동 로그인 가능하도록)
    // 클래스 배정이 없어도 로그인은 가능하지만, 학습 기능은 제한됨

    if (!student.user) {
      console.log("Student has no user record")
      return null
    }

    console.log("Auto login token verified successfully")

    return {
      id: student.user.id,
      username: student.user.username,
      role: UserRole.STUDENT,
      campusId: student.campusId,
      studentId: student.id,
      studentStatus: student.status,
      hasActiveClass: student.studentClasses.length > 0,
    }
  } catch (error: any) {
    console.error('Database connection error in verifyAutoLoginToken:', error)
    return null
  }
}

async function recordLoginAttempt(
  username: string,
  success: boolean,
  ipAddress?: string,
  userId?: string
) {
  try {
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      })
      userId = user?.id || 'unknown'
    }

    await prisma.loginAttempt.create({
      data: {
        userId,
        username,
        success,
        ipAddress,
      },
    })
  } catch (error) {
    // 데이터베이스 연결 실패 시 로그인 시도 기록을 건너뛰기
    console.error('Failed to record login attempt:', error)
  }
}

export async function checkRateLimit(username: string): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const recentFailures = await prisma.loginAttempt.count({
      where: {
        username,
        success: false,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    })

    return recentFailures < 10
  } catch (error) {
    // 데이터베이스 연결 실패 시 레이트 리밋 체크를 건너뛰고 허용
    console.error('Rate limit check failed:', error)
    return true
  }
}
