import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { verifyCredentials, verifyAutoLoginToken, checkRateLimit } from "@/lib/auth"
import { UserRole, StudentStatus } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        name: { label: "이름", type: "text" },
        username: { label: "전화번호 뒷 4자리", type: "text" },
        password: { label: "비밀번호", type: "password" },
        loginType: { label: "로그인 타입", type: "text" },
        autoLogin: { label: "자동로그인", type: "text" },
      },
      async authorize(credentials, req) {
        try {
        // 자동로그인 처리 (password가 특별한 값인 경우)
        if (credentials?.password === "auto-login-token" && credentials?.username) {
            try {
          // username이 실제로는 토큰인 경우
          const user = await verifyAutoLoginToken(credentials.username)
          if (user) {
            return {
              id: user.id,
              username: user.username,
              role: user.role,
              campusId: user.campusId,
              studentId: user.studentId,
              studentStatus: user.studentStatus,
              hasActiveClass: user.hasActiveClass,
            }
              }
            } catch (error) {
              console.error("Auto login error:", error)
          }
          return null
        }

        // 일반 로그인
        if (!credentials?.username) return null
        const loginType =
          credentials?.loginType === "admin" ? "admin" : "student"

        // 레이트 리밋 확인
          try {
        const canProceed = await checkRateLimit(credentials.username)
        if (!canProceed) {
          throw new Error("로그인 시도가 너무 많습니다. 3분 후 다시 시도해주세요.")
            }
          } catch (error: any) {
            // 레이트 리밋 에러는 그대로 throw
            if (error.message?.includes("로그인 시도가 너무 많습니다")) {
              throw error
            }
            console.error("Rate limit check error:", error)
            // 다른 에러는 무시하고 계속 진행
        }

        const ipAddress = req?.headers?.["x-forwarded-for"] || 
                         req?.headers?.["x-real-ip"] || 
                         undefined

        const user = await verifyCredentials(
          credentials.username,
          credentials.password ?? "",
          credentials.name ?? undefined,
          Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
          loginType
        )

        if (!user) {
          return null
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          campusId: user.campusId,
          studentId: user.studentId,
          studentStatus: user.studentStatus,
          hasActiveClass: user.hasActiveClass,
          }
        } catch (error: any) {
          console.error("Auth authorize error:", error)
          // 레이트 리밋 에러는 그대로 throw
          if (error.message?.includes("로그인 시도가 너무 많습니다")) {
            throw error
          }
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.campusId = user.campusId
        token.studentId = user.studentId
        token.studentStatus = user.studentStatus
        token.hasActiveClass = user.hasActiveClass
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = token.role as UserRole
        session.user.campusId = token.campusId as string | null
        session.user.studentId = token.studentId as string | undefined
        session.user.studentStatus = token.studentStatus as StudentStatus | undefined
        session.user.hasActiveClass = token.hasActiveClass as boolean | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
