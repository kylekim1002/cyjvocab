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
5. **Connection string** 섹션에서 **"ORMs"** 탭 클릭
6. **Tool** 드롭다운에서 **"Prisma"** 선택
7. `.env.local` 탭에서 연결 문자열 확인:
   - **Direct connection** (마이그레이션용): 포트 `5432`
   - **Connection pooling** (일반 사용): 포트 `6543`, `pgbouncer=true`
8. **Direct connection** 문자열을 복사하고 비밀번호를 입력:

```
DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxx:[비밀번호]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

**⚠️ 중요**: 
- 마이그레이션(`prisma db push`)에는 **Direct connection** (포트 5432) 사용
- 일반 애플리케이션 실행에는 **Connection pooling** (포트 6543) 사용 가능
- IPv4 네트워크에서는 Pooler를 사용해야 할 수 있습니다

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

**⚠️ 중요**: `.env.local` 파일의 `DATABASE_URL`이 Supabase 데이터베이스 URL로 설정되어 있는지 확인하세요!
- 올바른 형식: `postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres`
- ❌ 잘못된 형식: `postgresql://postgres:비밀번호@localhost:5432/...` (로컬 DB)

터미널에서 프로젝트 폴더로 이동한 후:

```bash
# 1. Prisma 클라이언트 생성
npm run db:generate

# 2. 데이터베이스에 스키마 적용
npm run db:push
```

**성공 메시지 확인:**

정상적으로 실행되면 다음과 같은 메시지가 나타납니다:

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxxxxxxxxxxxx.supabase.co:5432"
```

그 다음 다음 중 하나의 메시지가 나타납니다:

**케이스 1: 스키마가 새로 적용되는 경우**
```
✔ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in XXms
Your database is now in sync with your Prisma schema.
```

**케이스 2: 이미 동기화되어 있는 경우**
```
The database is already in sync with the Prisma schema.
✓ Generated Prisma Client (v5.22.0) to ./node_modules/@prisma/client in XXms
```

**⚠️ 주의사항:**
- 만약 `localhost:5432`가 보이면 로컬 데이터베이스에 연결된 것입니다
- `.env.local` 파일의 `DATABASE_URL`을 Supabase URL로 다시 확인하세요
- Supabase URL은 `db.xxxxxxxxxxxxx.supabase.co:5432` 형식입니다

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

터미널에서 프로젝트 폴더로 이동한 후 다음 단계를 순서대로 진행하세요.

#### 5-2-1. Git 초기화 확인

먼저 Git이 이미 초기화되어 있는지 확인합니다:

```bash
git status
```

**결과 확인:**
- ✅ **"On branch master"** 또는 **"On branch main"** 메시지가 보이면 → 이미 초기화됨, 다음 단계로 진행
- ❌ **"fatal: not a git repository"** 에러가 나면 → 아래 명령어로 초기화 필요:

```bash
git init
```

초기화 후 다음 메시지가 나타납니다:
```
Initialized empty Git repository in /경로/단어시험/.git/
```

#### 5-2-2. 원격 저장소 추가

GitHub에서 생성한 저장소의 URL을 확인합니다.

**GitHub 저장소 URL 찾는 방법:**
1. GitHub에서 방금 만든 저장소 페이지로 이동
2. 초록색 **"Code"** 버튼 클릭
3. **"HTTPS"** 탭에서 URL 복사
   - 예: `https://github.com/사용자명/word-learning-lms.git`

**원격 저장소 추가:**

```bash
git remote add origin https://github.com/사용자명/word-learning-lms.git
```

**⚠️ 주의사항:**
- `사용자명`을 실제 GitHub 사용자명으로 변경하세요
- `word-learning-lms`를 실제 저장소 이름으로 변경하세요
- 이미 원격 저장소가 설정되어 있다면 에러가 발생합니다:
  ```
  error: remote origin already exists.
  ```
  이 경우 다음 명령어로 기존 원격 저장소를 확인하거나 변경:
  ```bash
  # 기존 원격 저장소 확인
  git remote -v
  
  # 기존 원격 저장소 제거 후 다시 추가
  git remote remove origin
  git remote add origin https://github.com/사용자명/word-learning-lms.git
  ```

**성공 확인:**
```bash
git remote -v
```

다음과 같은 출력이 나타나면 성공:
```
origin  https://github.com/사용자명/word-learning-lms.git (fetch)
origin  https://github.com/사용자명/word-learning-lms.git (push)
```

#### 5-2-3. 모든 파일 추가

변경된 파일들을 Git에 추가합니다:

```bash
git add .
```

**이 명령어의 의미:**
- `.` (점)은 현재 폴더의 모든 파일을 의미합니다
- `git add .`는 모든 변경사항을 스테이징 영역에 추가합니다

**결과 확인:**
```bash
git status
```

다음과 같은 메시지가 보이면 성공:
```
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   파일명1
        modified:   파일명2
        ...
```

**⚠️ 주의사항:**
- `.env`, `.env.local` 같은 환경 변수 파일은 **절대 푸시하지 마세요!**
- `.gitignore` 파일에 이미 설정되어 있어야 합니다
- 만약 환경 변수 파일이 추가되려고 하면 `.gitignore`를 확인하세요

#### 5-2-4. 커밋 생성

변경사항을 커밋으로 저장합니다:

```bash
git commit -m "Initial commit: 배포 준비 완료"
```

**이 명령어의 의미:**
- `commit`: 변경사항을 저장소에 기록
- `-m "메시지"`: 커밋 메시지를 지정

**결과 확인:**
다음과 같은 메시지가 나타나면 성공:
```
[master (또는 main) xxxxxxx] Initial commit: 배포 준비 완료
 X files changed, XXX insertions(+)
```

**다른 커밋 메시지 예시:**
```bash
git commit -m "프로젝트 초기 설정 및 Supabase 연동 완료"
```

#### 5-2-5. GitHub에 푸시

로컬 저장소의 코드를 GitHub에 업로드합니다:

**먼저 현재 브랜치 확인:**
```bash
git branch
```

**main 브랜치인 경우:**
```bash
git push -u origin main
```

**master 브랜치인 경우:**
```bash
git push -u origin master
```

**이 명령어의 의미:**
- `push`: 로컬 변경사항을 원격 저장소에 업로드
- `-u origin main`: `origin` 원격 저장소의 `main` 브랜치에 푸시하고, 앞으로 이 브랜치를 기본으로 설정

**처음 푸시하는 경우:**
GitHub 로그인을 요청할 수 있습니다:
1. 브라우저가 자동으로 열리거나
2. 터미널에 로그인 안내가 나타납니다
3. GitHub 계정으로 로그인하고 권한을 승인하세요

**성공 확인:**
다음과 같은 메시지가 나타나면 성공:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XXX KB | XXX KB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/사용자명/word-learning-lms.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**에러 발생 시:**

**에러 1: "Authentication failed"**
→ GitHub 로그인이 필요합니다. 브라우저에서 로그인하거나 Personal Access Token을 사용하세요.

**에러 2: "Permission denied"**
→ 저장소에 대한 권한이 없습니다. 저장소 소유자 확인 또는 권한 요청이 필요합니다.

**에러 3: "Updates were rejected"**
→ 원격 저장소에 이미 코드가 있는 경우:
```bash
# 원격 저장소의 변경사항을 먼저 가져오기
git pull origin main --allow-unrelated-histories

# 충돌 해결 후 다시 푸시
git push -u origin main
```

#### 5-2-6. GitHub에서 확인

1. 브라우저에서 GitHub 저장소 페이지로 이동
2. 파일 목록이 보이면 성공!
3. 모든 파일이 업로드되었는지 확인하세요

**✅ 확인 사항:**
- [ ] `package.json` 파일이 보임
- [ ] `prisma` 폴더가 보임
- [ ] `app` 폴더가 보임
- [ ] `.env` 또는 `.env.local` 파일은 **보이지 않아야 함** (보안상 중요!)

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
