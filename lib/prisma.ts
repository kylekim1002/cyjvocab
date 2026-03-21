import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Next.js 서버리스 환경에서 Prisma 클라이언트 싱글톤 패턴
// Vercel과 같은 서버리스 환경에서는 각 함수가 독립적으로 실행되므로
// globalThis를 사용하여 인스턴스를 재사용
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// 서버리스(Vercel)에서도 인스턴스 재사용 → 연결·콜드 스타트 부담 완화
globalForPrisma.prisma = prisma

// Prisma 연결 확인 함수
export async function checkPrismaConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    return true
  } catch (error) {
    console.error('Prisma connection error:', error)
    return false
  }
}
