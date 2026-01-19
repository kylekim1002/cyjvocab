import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 프로덕션과 개발 환경 모두에서 싱글톤으로 관리
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // 프로덕션에서도 싱글톤 유지
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma
  }
}
