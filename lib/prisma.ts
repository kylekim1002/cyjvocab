import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 프로덕션과 개발 환경 모두에서 싱글톤으로 관리
// 연결 풀 문제 방지를 위해 명시적으로 싱글톤 패턴 사용
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // 연결 풀 설정 (Supabase Session Pooler 사용 시)
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// 프로덕션에서도 명시적으로 싱글톤 유지
export const prisma = globalForPrisma.prisma

// 프로세스 종료 시 연결 정리
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
