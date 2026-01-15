# 🚀 단계별 온라인 배포 가이드 (초보자용)

이 가이드는 완전 초보자도 따라할 수 있도록 하나씩 단계를 나눠서 설명합니다.
**각 단계를 완료한 후 다음 단계로 넘어가세요!**

---

## 📋 준비물 체크리스트

배포를 시작하기 전에 다음이 준비되어 있어야 합니다:

- [ ] GitHub 계정 (없으면 [github.com](https://github.com)에서 가입)
- [ ] 이메일 주소 (Supabase, Vercel 가입용)
- [ ] 프로젝트 코드가 로컬에 있음

---

## 1단계: Supabase 계정 생성 및 프로젝트 만들기

### 1-1. Supabase 가입

1. 웹 브라우저에서 [https://supabase.com](https://supabase.com) 접속
2. 우측 상단 **"Start your project"** 또는 **"Sign in"** 클릭
3. GitHub 계정으로 로그인 (또는 이메일로 가입)
4. 가입 완료 후 대시보드로 이동

### 1-2. 새 프로젝트 생성

1. Supabase 대시보드에서 **"New Project"** 버튼 클릭
2. 프로젝트 정보 입력:
   - **Name**: `word-learning-lms` (원하는 이름)
   - **Database Password**: **중요!** 비밀번호를 안전한 곳에 저장하세요!
     - 예: `MySecurePassword123!@#`
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국에서 가장 가까움)
   - **Pricing Plan**: `Free` 선택
3. **"Create new project"** 버튼 클릭
4. 프로젝트 생성 완료까지 **2-3분** 대기 (자동으로 데이터베이스가 생성됨)

### 1-3. 프로젝트 정보 확인

프로젝트가 생성되면 다음 정보를 확인하세요:

1. 왼쪽 메뉴에서 **Settings** (⚙️ 아이콘) 클릭
2. **API** 메뉴 클릭
3. 다음 정보를 복사해서 메모장에 저장하세요:

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
(이것이 NEXT_PUBLIC_SUPABASE_URL 값입니다)

service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(이것이 SUPABASE_SERVICE_ROLE_KEY 값입니다)
⚠️ 이 키는 절대 공개하지 마세요!
```

4. **Database** 메뉴 클릭
5. **Connection string** 섹션에서 **"URI"** 탭 클릭
6. 연결 문자열을 복사 (비밀번호 부분은 `[YOUR-PASSWORD]`로 표시됨)
7. 실제 비밀번호를 입력한 전체 연결 문자열을 메모장에 저장:

```
DATABASE_URL=postgresql://postgres:[여기에-1-2단계에서-설정한-비밀번호]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**✅ 1단계 완료 체크:**
- [ ] Supabase 프로젝트 생성 완료
- [ ] Project URL 복사 완료
- [ ] service_role key 복사 완료
- [ ] DATABASE_URL 복사 완료 (비밀번호 포함)

---

## 2단계: Supabase Storage 버킷 생성

### 2-1. Storage 메뉴 접속

1. Supabase 대시보드 왼쪽 메뉴에서 **"Storage"** 클릭
2. **"New bucket"** 버튼 클릭

### 2-2. 버킷 생성

1. **Bucket name**: `learning-audio` 입력 (정확히 이 이름으로!)
2. **Public bucket**: ✅ **체크** (학생들이 음원을 들을 수 있도록)
3. **File size limit**: `10` 입력 (MB 단위)
4. **Allowed MIME types**: `audio/*` 입력
5. **"Create bucket"** 버튼 클릭

### 2-3. Storage 정책 설정 (SQL 사용)

1. 왼쪽 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭
3. 프로젝트의 `scripts/setup-supabase-storage.sql` 파일을 열어서 내용을 복사
4. SQL Editor에 붙여넣기
5. **"Run"** 버튼 클릭 (또는 `Ctrl+Enter` / `Cmd+Enter`)
6. 성공 메시지 확인: `Storage bucket and policies created successfully!`

**✅ 2단계 완료 체크:**
- [ ] Storage 버킷 `learning-audio` 생성 완료
- [ ] SQL 정책 설정 완료

---

## 3단계: 로컬 환경 변수 설정

### 3-1. .env.local 파일 생성

1. 프로젝트 폴더로 이동 (터미널 또는 파일 탐색기)
2. 프로젝트 루트 폴더에 `.env.local` 파일 생성
   - 파일이 보이지 않으면 숨김 파일 표시 설정
   - 또는 터미널에서: `touch .env.local`

### 3-2. 환경 변수 입력

`.env.local` 파일을 열고 다음 내용을 입력하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 데이터베이스 (1단계에서 복사한 DATABASE_URL)
DATABASE_URL=postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# NextAuth 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=여기에랜덤문자열생성

# Node Environment
NODE_ENV=development
```

**중요**: 
- `NEXT_PUBLIC_SUPABASE_URL`: 1단계에서 복사한 Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: 1단계에서 복사한 service_role key
- `DATABASE_URL`: 1단계에서 복사한 연결 문자열 (비밀번호 포함)
- `NEXTAUTH_SECRET`: 터미널에서 다음 명령어로 생성:
  ```bash
  openssl rand -base64 32
  ```
  생성된 문자열을 복사해서 붙여넣기

### 3-3. 파일 저장

`.env.local` 파일을 저장하세요.

**✅ 3단계 완료 체크:**
- [ ] .env.local 파일 생성 완료
- [ ] 모든 환경 변수 입력 완료
- [ ] NEXTAUTH_SECRET 생성 완료

---

## 4단계: 로컬에서 Supabase 연결 테스트

### 4-1. 데이터베이스 마이그레이션

터미널에서 프로젝트 폴더로 이동한 후:

```bash
# 1. Prisma 클라이언트 생성
npm run db:generate

# 2. 데이터베이스에 스키마 적용
npm run db:push
```

성공 메시지 확인:
- `✔ Generated Prisma Client`
- `Your database is now in sync with your Prisma schema.`

### 4-2. 시드 데이터 실행 (선택사항)

기본 관리자 계정을 생성하려면:

```bash
npm run db:seed
```

성공 메시지 확인:
- `시드 데이터 생성 완료!`

### 4-3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

**✅ 4단계 완료 체크:**
- [ ] 데이터베이스 마이그레이션 성공
- [ ] 개발 서버 실행 성공
- [ ] 브라우저에서 사이트 접속 가능

---

## 5단계: GitHub 저장소 준비

### 5-1. GitHub 저장소 생성

1. [github.com](https://github.com)에 로그인
2. 우측 상단 **"+"** 버튼 클릭 → **"New repository"** 선택
3. 저장소 정보 입력:
   - **Repository name**: `word-learning-lms` (원하는 이름)
   - **Description**: (선택사항)
   - **Public** 또는 **Private** 선택
   - **"Create repository"** 클릭

### 5-2. 코드 푸시

터미널에서 프로젝트 폴더로 이동:

```bash
# 1. Git 초기화 (이미 되어 있다면 스킵)
git init

# 2. 원격 저장소 추가 (GitHub에서 제공하는 URL 사용)
git remote add origin https://github.com/사용자명/word-learning-lms.git

# 3. 모든 파일 추가
git add .

# 4. 커밋
git commit -m "Initial commit: 배포 준비 완료"

# 5. GitHub에 푸시
git push -u origin main
# 또는 master 브랜치를 사용한다면:
# git push -u origin master
```

**✅ 5단계 완료 체크:**
- [ ] GitHub 저장소 생성 완료
- [ ] 코드 푸시 완료
- [ ] GitHub에서 파일 확인 가능

---

## 6단계: Vercel 계정 생성 및 프로젝트 연결

### 6-1. Vercel 가입

1. [vercel.com](https://vercel.com) 접속
2. **"Sign Up"** 클릭
3. **"Continue with GitHub"** 클릭 (GitHub 계정으로 로그인)
4. 권한 승인

### 6-2. 새 프로젝트 생성

1. Vercel 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 방금 만든 저장소 선택
3. **"Import"** 클릭

### 6-3. 프로젝트 설정

1. **Project Name**: 자동으로 채워짐 (변경 가능)
2. **Framework Preset**: `Next.js` (자동 감지됨)
3. **Root Directory**: `./` (기본값)
4. **Build Command**: `prisma generate && next build` (자동 설정됨)
5. **Output Directory**: `.next` (기본값)
6. **Install Command**: `npm install` (기본값)

**✅ 6단계 완료 체크:**
- [ ] Vercel 계정 생성 완료
- [ ] GitHub 저장소 연결 완료
- [ ] 프로젝트 설정 확인 완료

---

## 7단계: Vercel 환경 변수 설정

### 7-1. 환경 변수 추가

프로젝트 설정 화면에서:

1. **"Environment Variables"** 섹션으로 스크롤
2. 다음 변수들을 하나씩 추가:

**변수 1: NEXT_PUBLIC_SUPABASE_URL**
- Key: `NEXT_PUBLIC_SUPABASE_URL`
- Value: `https://xxxxxxxxxxxxx.supabase.co` (1단계에서 복사한 값)
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 체크
- **"Save"** 클릭

**변수 2: SUPABASE_SERVICE_ROLE_KEY**
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (1단계에서 복사한 값)
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 체크
- **"Save"** 클릭

**변수 3: DATABASE_URL**
- Key: `DATABASE_URL`
- Value: `postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres` (1단계에서 복사한 값)
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 체크
- **"Save"** 클릭

**변수 4: NEXTAUTH_URL**
- Key: `NEXTAUTH_URL`
- Value: `https://your-project-name.vercel.app` (배포 후 자동 생성된 URL, 일단 임시로 입력)
- Environment: ✅ Production만 체크
- **"Save"** 클릭

**변수 5: NEXTAUTH_SECRET**
- Key: `NEXTAUTH_SECRET`
- Value: (3단계에서 생성한 값)
- Environment: ✅ Production, ✅ Preview, ✅ Development 모두 체크
- **"Save"** 클릭

**변수 6: NODE_ENV**
- Key: `NODE_ENV`
- Value: `production`
- Environment: ✅ Production만 체크
- **"Save"** 클릭

### 7-2. 환경 변수 확인

모든 변수가 추가되었는지 확인:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] DATABASE_URL
- [ ] NEXTAUTH_URL
- [ ] NEXTAUTH_SECRET
- [ ] NODE_ENV

**✅ 7단계 완료 체크:**
- [ ] 모든 환경 변수 추가 완료
- [ ] 각 변수의 Environment 설정 확인 완료

---

## 8단계: 첫 배포 실행

### 8-1. 배포 시작

1. Vercel 프로젝트 설정 화면에서 **"Deploy"** 버튼 클릭
2. 배포 진행 상황 확인 (약 2-5분 소요)

### 8-2. 배포 완료 확인

1. 배포가 완료되면 **"Visit"** 버튼이 나타남
2. 클릭하여 배포된 사이트 확인
3. 배포된 URL 확인 (예: `https://word-learning-lms.vercel.app`)

### 8-3. NEXTAUTH_URL 업데이트

1. Vercel 프로젝트 설정으로 돌아가기
2. **"Environment Variables"** 섹션
3. `NEXTAUTH_URL` 변수 찾기
4. **"Edit"** 클릭
5. Value를 실제 배포된 URL로 변경 (예: `https://word-learning-lms.vercel.app`)
6. **"Save"** 클릭
7. **"Redeploy"** 클릭하여 다시 배포

**✅ 8단계 완료 체크:**
- [ ] 배포 성공
- [ ] 배포된 사이트 접속 가능
- [ ] NEXTAUTH_URL 업데이트 완료

---

## 9단계: 데이터베이스 마이그레이션 (프로덕션)

### 9-1. 프로덕션 데이터베이스에 스키마 적용

로컬 터미널에서:

```bash
# DATABASE_URL을 프로덕션 Supabase URL로 설정하고 마이그레이션
DATABASE_URL="postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres" npm run db:push
```

또는 `.env.local`의 `DATABASE_URL`을 프로덕션 URL로 임시 변경 후:

```bash
npm run db:push
```

### 9-2. 시드 데이터 실행 (선택사항)

```bash
DATABASE_URL="postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres" npm run db:seed
```

**✅ 9단계 완료 체크:**
- [ ] 프로덕션 데이터베이스 마이그레이션 완료
- [ ] 시드 데이터 실행 완료 (선택)

---

## 10단계: 최종 테스트

### 10-1. 사이트 접속 테스트

1. 배포된 URL 접속 (예: `https://word-learning-lms.vercel.app`)
2. 로그인 페이지 확인
3. 기본 관리자 계정으로 로그인:
   - 아이디: `cyjkyle`
   - 비밀번호: `kyle1002!@`

### 10-2. 기능 테스트

1. **관리자 기능 테스트:**
   - [ ] 학습 관리 > 학습 생성
   - [ ] 문항 추가 시 음원 파일 업로드 테스트
   - [ ] 학생 관리 기능 확인

2. **학생 기능 테스트:**
   - [ ] 학생 계정으로 로그인
   - [ ] 학습 목록 확인
   - [ ] 학습 시작 및 진행
   - [ ] 음원 재생 테스트

### 10-3. 파일 업로드 테스트

1. 관리자로 로그인
2. 학습 관리 > 학습 생성
3. 문항 추가 > 음원 파일 업로드
4. 업로드 성공 확인
5. 학생 화면에서 음원 재생 확인

**✅ 10단계 완료 체크:**
- [ ] 사이트 접속 성공
- [ ] 로그인 성공
- [ ] 주요 기능 작동 확인
- [ ] 파일 업로드/재생 확인

---

## 🎉 배포 완료!

축하합니다! 이제 온라인에서 사이트가 작동합니다!

### 다음 단계 (선택사항)

1. **커스텀 도메인 연결** (Vercel 프로젝트 설정 > Domains)
2. **모니터링 설정** (Vercel Analytics)
3. **백업 설정** (Supabase 자동 백업 확인)

### 문제 해결

문제가 발생하면:
1. Vercel 로그 확인: 프로젝트 > Deployments > 최신 배포 > Logs
2. Supabase 로그 확인: 프로젝트 > Logs
3. 환경 변수 재확인
4. `DEPLOYMENT.md`의 "문제 해결" 섹션 참고

---

## 📞 도움이 필요하신가요?

각 단계에서 막히는 부분이 있으면:
1. 해당 단계의 체크리스트 다시 확인
2. 에러 메시지 정확히 확인
3. `DEPLOYMENT.md` 참고

**행운을 빕니다! 🚀**
