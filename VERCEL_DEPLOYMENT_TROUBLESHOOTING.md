# 🔧 Vercel 배포 문제 해결 가이드

## 배포 실패 시 확인사항

### 1. 환경 변수 확인 (가장 흔한 원인)

**에러 메시지 예시:**
- `Environment variable not found: DATABASE_URL`
- `Environment variable not found: NEXTAUTH_SECRET`

**해결 방법:**
1. Vercel 프로젝트 설정 → **"Environment Variables"** 섹션으로 이동
2. 다음 변수들이 모두 추가되어 있는지 확인:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `DATABASE_URL`
   - ✅ `NEXTAUTH_URL`
   - ✅ `NEXTAUTH_SECRET`
   - ✅ `NODE_ENV`

3. 각 변수의 **Environment** 설정 확인:
   - Production: ✅ 체크
   - Preview: ✅ 체크 (선택사항)
   - Development: ✅ 체크 (선택사항)

4. 환경 변수 추가 후 **"Redeploy"** 클릭

### 2. Build Command 확인

**에러 메시지 예시:**
- `Prisma Client not generated`
- `Cannot find module '@prisma/client'`

**해결 방법:**
1. Vercel 프로젝트 설정 → **"Settings"** → **"General"**
2. **"Build Command"** 확인:
   ```
   prisma generate && next build
   ```
3. 정확히 위와 같이 입력되어 있는지 확인
4. 수정 후 **"Save"** 클릭
5. **"Redeploy"** 클릭

### 3. DATABASE_URL 형식 확인

**에러 메시지 예시:**
- `Can't reach database server`
- `Connection refused`

**해결 방법:**
1. Supabase 대시보드에서 정확한 연결 문자열 확인
2. Prisma 사용 시 **Direct Connection** (포트 5432) 사용:
   ```
   postgresql://postgres.xxxxx:비밀번호@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
   ```
3. 환경 변수에 정확히 입력되었는지 확인
4. 비밀번호에 특수문자가 있으면 URL 인코딩 필요

### 4. NEXTAUTH_URL 확인

**에러 메시지 예시:**
- `Invalid NEXTAUTH_URL`
- `Redirect URI mismatch`

**해결 방법:**
1. 배포 후 실제 URL 확인 (예: `https://cyjvocab.vercel.app`)
2. Vercel 환경 변수에서 `NEXTAUTH_URL` 업데이트
3. 정확한 URL 형식 확인:
   ```
   https://your-project-name.vercel.app
   ```
   - `http://`가 아닌 `https://` 사용
   - 끝에 `/` 없이 입력

### 5. 패키지 의존성 문제

**에러 메시지 예시:**
- `Module not found`
- `Cannot find package`

**해결 방법:**
1. 로컬에서 `npm install` 실행하여 문제 없는지 확인
2. `package.json`의 모든 의존성이 올바른지 확인
3. Vercel에서 **"Redeploy"** 클릭

### 6. Prisma 관련 문제

**에러 메시지 예시:**
- `Prisma schema validation error`
- `Migration failed`

**해결 방법:**
1. 로컬에서 먼저 테스트:
   ```bash
   npm run db:generate
   npm run build
   ```
2. 문제가 없으면 Vercel의 Build Command 확인
3. `vercel.json` 파일 확인:
   ```json
   {
     "buildCommand": "prisma generate && next build"
   }
   ```

## 배포 성공 확인

배포가 성공하면:
- ✅ 상태가 **"Ready"**로 표시됨
- ✅ 배포된 URL이 표시됨
- ✅ "Visit" 버튼 클릭 시 사이트가 열림

## 일반적인 배포 순서

1. ✅ GitHub에 코드 푸시 완료
2. ✅ Vercel에 프로젝트 연결 완료
3. ✅ **환경 변수 설정 완료** (중요!)
4. ✅ Build Command 확인 완료
5. ✅ Deploy 또는 Redeploy 클릭
6. ✅ 배포 성공 확인

**⚠️ 중요**: 환경 변수를 설정하기 전에 배포하면 실패합니다. 반드시 7단계를 먼저 완료하세요!

## 추가 도움말

문제가 계속되면:
1. Vercel 대시보드 → **"Deployments"** → 최신 배포 클릭
2. **"Build Logs"** 탭에서 전체 에러 메시지 확인
3. 에러 메시지를 복사하여 검색하거나 지원팀에 문의
