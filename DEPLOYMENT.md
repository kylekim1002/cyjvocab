# 배포 가이드 (Vercel + Supabase)

이 문서는 단어 학습 LMS를 Vercel과 Supabase를 사용하여 온라인에 배포하는 방법을 설명합니다.

## 사전 준비

1. **Supabase 계정 생성**
   - [Supabase](https://supabase.com)에 가입
   - 새 프로젝트 생성
   - 프로젝트 설정에서 다음 정보 확인:
     - Project URL
     - Service Role Key (Settings > API)

2. **Vercel 계정 생성**
   - [Vercel](https://vercel.com)에 가입
   - GitHub 계정 연결

## 1단계: Supabase 설정

### 1.1 데이터베이스 설정

1. Supabase 프로젝트 대시보드에서 "SQL Editor" 열기
2. `prisma/schema.prisma` 파일을 기반으로 테이블 생성
   - 또는 Prisma Migrate 사용 (권장)

```bash
# 로컬에서 Supabase 연결 문자열로 마이그레이션
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" npm run db:push
```

3. 시드 데이터 실행 (선택사항)
```bash
DATABASE_URL="[YOUR-SUPABASE-DATABASE-URL]" npm run db:seed
```

### 1.2 Storage 버킷 생성

1. Supabase 대시보드에서 "Storage" 메뉴 클릭
2. "New bucket" 클릭
3. 버킷 이름: `learning-audio`
4. Public bucket: **체크** (학생들이 음원 파일에 접근할 수 있도록)
5. File size limit: 10MB
6. Allowed MIME types: `audio/*`

### 1.3 Storage 정책 설정

**방법 1: SQL Editor 사용 (권장)**

1. Supabase 대시보드 > SQL Editor 열기
2. `scripts/setup-supabase-storage.sql` 파일의 내용을 복사하여 실행

**방법 2: UI에서 수동 설정**

Storage > Policies에서 다음 정책 추가:

**정책 1: 업로드 허용 (관리자만)**
- Policy name: `Allow admin uploads`
- Allowed operation: `INSERT`
- Target roles: `service_role`
- Policy definition: `true`

**정책 2: 읽기 허용 (모든 사용자)**
- Policy name: `Allow public read`
- Allowed operation: `SELECT`
- Target roles: `anon`, `authenticated`
- Policy definition: `true`

## 2단계: 환경 변수 설정

### 2.1 로컬 개발 환경 (.env.local)

`.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[랜덤 문자열 생성 - openssl rand -base64 32]

# Node Environment
NODE_ENV=development
```

### 2.2 Vercel 환경 변수 설정

1. Vercel 프로젝트 설정 > Environment Variables
2. 다음 변수들 추가:

```
NEXT_PUBLIC_SUPABASE_URL = https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY = [YOUR-SERVICE-ROLE-KEY]
DATABASE_URL = postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
NEXTAUTH_URL = https://[YOUR-VERCEL-DOMAIN].vercel.app
NEXTAUTH_SECRET = [로컬과 동일한 값 또는 새로 생성]
NODE_ENV = production
```

**중요**: `NEXTAUTH_SECRET` 생성 방법:
```bash
openssl rand -base64 32
```

## 3단계: Vercel 배포

### 3.1 GitHub 저장소 연결

1. 프로젝트를 GitHub에 푸시 (아직 안 했다면)
```bash
git add .
git commit -m "배포 준비 완료"
git push origin main
```

2. Vercel 대시보드에서 "New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - Framework Preset: Next.js (자동 감지)
   - Root Directory: `./` (기본값)
   - Build Command: `prisma generate && next build` (자동 설정됨)
   - Output Directory: `.next` (기본값)
   - Install Command: `npm install` (기본값)

### 3.2 환경 변수 입력

프로젝트 생성 시 환경 변수 입력 화면에서 위의 환경 변수들을 모두 입력합니다.

### 3.3 배포

1. "Deploy" 버튼 클릭
2. 배포 완료 대기 (약 2-5분)
3. 배포된 URL 확인

## 4단계: 배포 후 확인

### 4.1 데이터베이스 마이그레이션

배포 후 첫 실행 시 데이터베이스 스키마가 적용되어 있는지 확인합니다.
필요하면 Vercel의 "Deployments" 탭에서 "Redeploy"를 실행하거나,
로컬에서 Supabase로 직접 마이그레이션을 실행합니다.

### 4.2 기본 관리자 계정 확인

시드 데이터가 실행되었다면 다음 계정으로 로그인:
- 아이디: `cyjkyle`
- 비밀번호: `kyle1002!@`

### 4.3 파일 업로드 테스트

1. 관리자로 로그인
2. 학습 관리 > 학습 생성 > 문항 추가
3. 음원 파일 업로드 테스트
4. 학생 화면에서 음원 재생 테스트

## 5단계: 확장성 고려사항

### 현재 구성 (20명 테스트)

- **Vercel**: Free 플랜
- **Supabase**: Free 플랜 (500MB DB, 1GB Storage)

### 1차 확장 (500명)

- **Vercel**: Pro 플랜 ($20/월)
  - 더 많은 대역폭
  - 팀 기능
  - 더 나은 성능

- **Supabase**: Pro 플랜 ($25/월)
  - 8GB 데이터베이스
  - 100GB 파일 스토리지
  - 자동 백업
  - 더 나은 성능

### 2차 확장 (3000명)

- **Vercel**: Pro 플랜 유지
- **Supabase**: Pro 플랜 + 스토리지 확장
  - 필요시 데이터베이스 크기 업그레이드
  - CDN 캐싱 최적화

### 모니터링

1. **Vercel Analytics**: 트래픽 및 성능 모니터링
2. **Supabase Dashboard**: 데이터베이스 사용량 및 성능 모니터링
3. **Vercel Logs**: 에러 로그 확인

## 문제 해결

### 파일 업로드 실패

1. Supabase Storage 버킷이 생성되었는지 확인
2. Storage 정책이 올바르게 설정되었는지 확인
3. `SUPABASE_SERVICE_ROLE_KEY`가 올바른지 확인

### 데이터베이스 연결 실패

1. `DATABASE_URL`이 올바른지 확인
2. Supabase 프로젝트의 데이터베이스 비밀번호 확인
3. 연결 풀 설정 확인 (Supabase는 연결 풀 URL 제공)

### 인증 오류

1. `NEXTAUTH_SECRET`이 설정되었는지 확인
2. `NEXTAUTH_URL`이 배포된 도메인과 일치하는지 확인
3. Vercel 환경 변수가 Production, Preview, Development 모두에 설정되었는지 확인

## 추가 최적화

### 이미지 최적화 (향후)

현재 이미지는 URL로 입력받고 있지만, 향후 이미지도 Supabase Storage로 업로드하도록 변경 가능합니다.

### CDN 캐싱

Supabase Storage는 자동으로 CDN을 제공하므로 추가 설정이 필요 없습니다.

### 데이터베이스 연결 풀

Supabase는 연결 풀 URL을 제공합니다. 대량 트래픽 시 사용을 권장합니다:
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

## 비용 예상

| 단계 | 사용자 | Vercel | Supabase | 총액/월 |
|------|--------|--------|----------|---------|
| 테스트 | 20명 | $0 | $0 | $0 |
| 1차 확장 | 500명 | $20 | $25 | $45 |
| 2차 확장 | 3000명 | $20 | $25-50 | $45-70 |

*실제 사용량에 따라 변동될 수 있습니다.*
