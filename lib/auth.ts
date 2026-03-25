import { UserRole, StudentStatus } from '@prisma/client'
import { prisma } from './prisma'
import { devLog } from './safe-log'
import { hashAutoLoginToken } from './auto-login-token'
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
  name?: string,
  ipAddress?: string,
  loginType: "student" | "admin" = "student"
): Promise<AuthUser | null> {
  try {
    devLog("verifyCredentials", {
      usernameLen: username?.length,
      nameProvided: !!name,
      passwordProvided: !!password,
      loginType,
    })

    const inputName = (name ?? "").trim()
    const normalizedInputName = inputName.replace(/\s+/g, "").toLowerCase()

    // 1) 관리자/매니저 로그인: 기본은 아이디(username) 검증,
    // 과거 안내 문구 혼선으로 이름을 입력한 경우를 위해 name도 보조 허용.
    const adminInput = (username ?? "").trim()
    const adminInclude = {
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
    } as const

    let user = await prisma.user.findUnique({
      where: { username: adminInput },
      include: adminInclude,
    })

    if (!user && adminInput) {
      user = await prisma.user.findFirst({
        where: {
          name: adminInput,
          role: { in: [UserRole.SUPER_ADMIN, UserRole.MANAGER] },
        },
        include: adminInclude,
      })
    }

    if (loginType === "admin") {
      if (!user) {
        await recordLoginAttempt(username, false, ipAddress)
        return null
      }
      if (!user.isActive) {
        await recordLoginAttempt(username, false, ipAddress, user.id)
        return null
      }

      if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.MANAGER) {
        await recordLoginAttempt(username, false, ipAddress, user.id)
        return null
      }

      const inputPassword = (password ?? "").trim()
      if (!inputPassword) {
        await recordLoginAttempt(username, false, ipAddress, user.id)
        return null
      }

      const isPasswordValid = await bcrypt.compare(inputPassword, user.password)
      if (!isPasswordValid) {
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
    }

    // 2) 학생 로그인: Student.username(숫자4자리, 중복 가능) + Student.name
    if (!inputName) {
      await recordLoginAttempt(username, false, ipAddress)
      return null
    }

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

    await recordLoginAttempt(username, false, ipAddress)
    return null
  } catch (error: any) {
    console.error(
      "verifyCredentials failed:",
      error?.message ?? error,
      error?.code
    )
    return null
  }
}

export async function verifyAutoLoginToken(
  token: string
): Promise<AuthUser | null> {
  try {
    devLog("verifyAutoLoginToken attempt", { tokenLen: token?.length })

    const tokenHash = hashAutoLoginToken(token)
    const student = await prisma.student.findUnique({
      where: { autoLoginTokenHash: tokenHash },
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
      devLog("verifyAutoLoginToken: no student for token hash lookup")
      return null
    }

    devLog("verifyAutoLoginToken: student row found")

    // 토큰 만료 확인
    if (student.autoLoginTokenExpiresAt && student.autoLoginTokenExpiresAt < new Date()) {
      devLog("verifyAutoLoginToken: token expired")
      return null
    }

    // 학생 상태 확인
    if (student.status !== StudentStatus.ACTIVE) {
      devLog("verifyAutoLoginToken: student not ACTIVE")
      return null
    }

    // 클래스 배정 확인은 제거 (학생이 클래스 배정 전에도 자동 로그인 가능하도록)
    // 클래스 배정이 없어도 로그인은 가능하지만, 학습 기능은 제한됨

    if (!student.user) {
      devLog("verifyAutoLoginToken: no user record")
      return null
    }

    devLog("verifyAutoLoginToken: success")

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
    console.error("verifyAutoLoginToken failed:", error?.message ?? error)
    return null
  }
}

type AutoLoginCandidate = {
  userId: string
  username: string
}

export async function getAutoLoginCandidateByToken(
  token: string
): Promise<AutoLoginCandidate | null> {
  try {
    const tokenHash = hashAutoLoginToken(token)
    const student = await prisma.student.findUnique({
      where: { autoLoginTokenHash: tokenHash },
      select: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })

    if (!student?.user?.id || !student.user.username) return null

    return {
      userId: student.user.id,
      username: student.user.username,
    }
  } catch (error) {
    console.error("getAutoLoginCandidateByToken failed:", error)
    return null
  }
}

const AUTO_LOGIN_ATTEMPT_PREFIX = "__AUTOLOGIN_ATTEMPT__:"
const AUTO_LOGIN_LOCK_PREFIX = "__AUTOLOGIN_LOCK__:"
const AUTO_LOGIN_WINDOW_MS = 60_000
const AUTO_LOGIN_LOCK_MS = 10 * 60_000
const AUTO_LOGIN_MAX_ATTEMPTS = 5

function autoLoginAttemptKey(userId: string): string {
  return `${AUTO_LOGIN_ATTEMPT_PREFIX}${userId}`
}

function autoLoginLockKey(userId: string): string {
  return `${AUTO_LOGIN_LOCK_PREFIX}${userId}`
}

export async function isAutoLoginLocked(userId: string): Promise<boolean> {
  try {
    const lockWindowStart = new Date(Date.now() - AUTO_LOGIN_LOCK_MS)
    const lock = await prisma.loginAttempt.findFirst({
      where: {
        userId,
        username: autoLoginLockKey(userId),
        createdAt: {
          gte: lockWindowStart,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    })
    return !!lock
  } catch (error) {
    console.error("isAutoLoginLocked failed:", error)
    return false
  }
}

export async function recordAutoLoginAttemptAndCheckLock(
  userId: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    // 현재 시도를 먼저 기록해 "5회 이상" 조건에 현재 요청도 포함
    await prisma.loginAttempt.create({
      data: {
        userId,
        username: autoLoginAttemptKey(userId),
        success: false,
        ipAddress,
      },
    })

    const windowStart = new Date(Date.now() - AUTO_LOGIN_WINDOW_MS)
    const recentAttempts = await prisma.loginAttempt.count({
      where: {
        userId,
        username: autoLoginAttemptKey(userId),
        createdAt: {
          gte: windowStart,
        },
      },
    })

    if (recentAttempts < AUTO_LOGIN_MAX_ATTEMPTS) {
      return false
    }

    await prisma.loginAttempt.create({
      data: {
        userId,
        username: autoLoginLockKey(userId),
        success: false,
        ipAddress,
      },
    })

    return true
  } catch (error) {
    console.error("recordAutoLoginAttemptAndCheckLock failed:", error)
    return false
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
