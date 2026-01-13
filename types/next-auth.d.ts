import { UserRole, StudentStatus } from "@prisma/client"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      role: UserRole
      campusId?: string | null
      studentId?: string
      studentStatus?: StudentStatus
      hasActiveClass?: boolean
    }
  }

  interface User {
    id: string
    username: string
    role: UserRole
    campusId?: string | null
    studentId?: string
    studentStatus?: StudentStatus
    hasActiveClass?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    role: UserRole
    campusId?: string | null
    studentId?: string
    studentStatus?: StudentStatus
    hasActiveClass?: boolean
  }
}
