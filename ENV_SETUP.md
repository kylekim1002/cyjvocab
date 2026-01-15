# 환경 변수 설정 가이드

## 로컬 개발 환경

`.env.local` 파일을 프로젝트 루트에 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# 데이터베이스 (Supabase PostgreSQL 또는 로컬 PostgreSQL)
# 로컬 개발 시:
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
# Supabase 사용 시:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth 설정
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[랜덤 문자열]"
# NEXTAUTH_SECRET 생성 방법:
# openssl rand -base64 32

# Node Environment
NODE_ENV="development"
```

## Vercel 프로덕션 환경

Vercel 프로젝트 설정 > Environment Variables에서 다음 변수들을 설정:

```
NEXT_PUBLIC_SUPABASE_URL = https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY = [YOUR-SERVICE-ROLE-KEY]
DATABASE_URL = postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
NEXTAUTH_URL = https://[YOUR-VERCEL-DOMAIN].vercel.app
NEXTAUTH_SECRET = [로컬과 동일한 값 또는 새로 생성]
NODE_ENV = production
```

**중요**: 
- `NEXTAUTH_SECRET`은 Production, Preview, Development 환경 모두에 설정해야 합니다.
- `NEXTAUTH_URL`은 각 환경에 맞게 설정 (Production: 배포된 도메인, Preview: Vercel Preview URL)

## Supabase 정보 확인 방법

1. Supabase 프로젝트 대시보드 접속
2. Settings > API 메뉴에서:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. Settings > Database 메뉴에서:
   - Connection string → `DATABASE_URL`
