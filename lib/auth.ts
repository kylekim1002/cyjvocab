import { UserRole, StudentStatus } from '@prisma/client'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

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
  ipAddress?: string
): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        student: {
          include: {
            studentClasses: {
              where: {
                class: {
                  deletedAt: null,
                },
              },
              take: 1,
            },
          },
        },
      },
    })

    if (!user) {
      // 로그인 실패 기록
      await recordLoginAttempt(username, false, ipAddress)
      return null
    }

    // 관리자/학생 공통: 비활성 사용자는 로그인 불가
    if (!user.isActive) {
      await recordLoginAttempt(username, false, ipAddress, user.id)
      return null
    }

    // 학생인 경우 상태 확인
    if (user.role === UserRole.STUDENT && user.student) {
      if (user.student.status !== StudentStatus.ACTIVE) {
        await recordLoginAttempt(username, false, ipAddress, user.id)
        return null
      }

      // 클래스 배정 확인
      if (user.student.studentClasses.length === 0) {
        await recordLoginAttempt(username, false, ipAddress, user.id)
        return null
      }
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      await recordLoginAttempt(username, false, ipAddress, user.id)
      return null
    }

    // 성공 기록
    await recordLoginAttempt(username, true, ipAddress, user.id)

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      campusId: user.campusId,
      studentId: user.student?.id,
      studentStatus: user.student?.status,
      hasActiveClass: user.student?.studentClasses.length > 0,
    }
  } catch (error: any) {
    // 데이터베이스 연결 실패 시 에러 로깅
    console.error('Database connection error in verifyCredentials:', error)
    throw new Error('데이터베이스 연결에 실패했습니다. 관리자에게 문의하세요.')
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

    // 클래스 배정 확인
    if (student.studentClasses.length === 0) {
      console.log("Student has no active classes")
      return null
    }

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
