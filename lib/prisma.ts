import { PrismaClient } from '@prisma/client'
import { applyPrismaPoolerQueryParams } from '@/lib/db-connection-url'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL
/** 풀러 URL이면 Prisma 서버리스에 맞게 쿼리스트링 보강 */
const resolvedDbUrl = applyPrismaPoolerQueryParams(rawDbUrl)

// Next.js 서버리스 환경에서 Prisma 클라이언트 싱글톤 패턴
// Vercel과 같은 서버리스 환경에서는 각 함수가 독립적으로 실행되므로
// globalThis를 사용하여 인스턴스를 재사용
//
// DATABASE_URL: Supabase 프로덕션에서는 Transaction pooler(예: 포트 6543)를 쓰는 것을 권장.
// 마이그레이션용 직접 연결은 prisma/schema.prisma 의 directUrl(DIRECT_URL)을 사용합니다.
// 단, 운영 환경변수 오입력/누락 시 서비스 전체가 죽지 않도록 DIRECT_URL을 폴백으로 허용합니다.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: resolvedDbUrl,
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
