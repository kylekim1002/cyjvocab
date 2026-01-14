# 단어 학습 LMS

반응형 웹 기반 단어/학습 LMS 시스템입니다.

## 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma
- **Auth**: NextAuth.js (Credentials)
- **Excel**: xlsx

## 주요 기능

### 역할 및 권한
- **SUPER_ADMIN**: 모든 기능 + 데이터 정리 + 일괄 학년 변경
- **MANAGER**: 운영 전반 (코드 수정 제외)
- **STUDENT**: 학습만 가능

### 관리자 기능
- 코드값 관리 (학년/레벨)
- 캠퍼스/선생님 관리
- 클래스 관리
- 학생 관리 (단건/엑셀/일괄)
- 학습 콘텐츠 관리
- 클래스별 학습 배정
- 성적 조회 및 엑셀 다운로드
- 데이터 기간 삭제 (SUPER_ADMIN 전용)

### 학생 기능
- 학습 홈 (날짜별 배정 학습)
- 학습 진행 (플래시카드/퀴즈)
- 오답노트
- 통계
- 설정

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NODE_ENV="development"
```

### 3. 데이터베이스 설정

Supabase에서 PostgreSQL 데이터베이스를 생성하고 연결 문자열을 `DATABASE_URL`에 설정하세요.

### 4. Prisma 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스에 스키마 적용
npm run db:push

# 시드 데이터 생성 (선택사항)
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 기본 계정

시드 데이터 실행 시 다음 계정이 생성됩니다:

- **아이디**: cyjkyle
- **비밀번호**: kyle1002!@
- **역할**: SUPER_ADMIN

## 배포 (Vercel)

### 1. Vercel에 프로젝트 연결

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 환경 변수 설정:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`

### 2. 빌드 설정

Vercel이 자동으로 Next.js 프로젝트를 감지합니다. 빌드 명령어는 자동으로 설정됩니다.

### 3. 배포

프로젝트를 푸시하면 자동으로 배포됩니다.

## 프로젝트 구조

```
├── app/                    # Next.js App Router 페이지
│   ├── admin/             # 관리자 페이지
│   ├── student/           # 학생 페이지
│   ├── api/               # API 라우트
│   └── login/             # 로그인 페이지
├── components/            # React 컴포넌트
│   ├── admin/            # 관리자 컴포넌트
│   ├── student/          # 학생 컴포넌트
│   └── ui/               # shadcn/ui 컴포넌트
├── lib/                  # 유틸리티 및 설정
│   ├── auth.ts           # 인증 로직
│   ├── prisma.ts         # Prisma 클라이언트
│   └── utils.ts          # 유틸리티 함수
├── prisma/               # Prisma 설정
│   ├── schema.prisma     # 데이터베이스 스키마
│   └── seed.ts           # 시드 데이터
└── types/                # TypeScript 타입 정의
```

## 주요 API 엔드포인트

### 학생 API
- `GET /api/student/assignments` - 배정된 학습 조회
- `GET /api/student/assignments/[id]/modules/[moduleId]/start` - 학습 시작
- `POST /api/student/sessions/[id]/save` - 학습 저장
- `POST /api/student/assignments/[id]/modules/[moduleId]/complete` - 학습 완료

### 관리자 API
- `GET /api/admin/codes` - 코드값 조회
- `POST /api/admin/codes` - 코드값 생성
- `GET /api/admin/campus` - 캠퍼스 조회
- `POST /api/admin/students/import-xlsx` - 학생 엑셀 업로드
- `POST /api/admin/students/bulk-delete` - 학생 일괄 삭제
- `POST /api/admin/data-cleanup/execute` - 데이터 정리 (SUPER_ADMIN)

## 보안 기능

- 로그인 실패 레이트 리밋 (10회 실패 시 3분 정지)
- 자동로그인 링크 revoke/재발급
- 역할 기반 접근 제어
- 학생 상태 및 클래스 배정 검증

## 성능 최적화

- 캠퍼스별 조회 최적화
- 점수 로그 append-only 패턴
- 일별 점수 집계 (score_daily)
- 필요한 인덱스 생성
- 페이지네이션 지원

## 라이선스

MIT
