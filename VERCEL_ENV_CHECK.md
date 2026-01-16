# 🔍 Vercel 환경 변수 확인 가이드

## 현재 Supabase Storage 설정 상태

스크린샷을 보면 Supabase Storage는 올바르게 설정되어 있습니다:
- ✅ `learning-audio` 버킷 존재
- ✅ PUBLIC 버킷으로 설정됨
- ✅ 10MB 파일 크기 제한
- ✅ audio/* MIME 타입 허용
- ✅ 정책 설정됨:
  - "Allow public read" (SELECT, public)
  - "Allow admin uploads" (INSERT, service_role)

## 문제: "signature verification failed"

이 오류는 **Vercel 환경 변수** 문제일 가능성이 높습니다.

## 해결 방법

### 1. Vercel 환경 변수 확인

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 확인:

#### 필수 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL = https://lmdbwarinjgvvwenfzgd.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [service_role 키]
```

**중요 확인 사항:**

1. **SUPABASE_SERVICE_ROLE_KEY 확인**
   - Supabase 대시보드 → Settings → API
   - **service_role** 키 (secret) 복사
   - **anon** 키가 아닌 **service_role** 키 사용
   - 키 앞뒤에 공백이나 줄바꿈이 없어야 함

2. **NEXT_PUBLIC_SUPABASE_URL 확인**
   - Supabase 대시보드 → Settings → API
   - Project URL 복사
   - `https://`로 시작하고 `.supabase.co`로 끝나야 함

### 2. 환경 변수 재설정 (권장)

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` 찾기
3. **Edit** 클릭
4. Supabase에서 새로 복사한 service_role 키로 교체
5. **주의사항:**
   - 키 전체를 복사 (앞뒤 공백 제거)
   - 줄바꿈이 포함되지 않도록 주의
   - `eyJ...`로 시작하는 긴 문자열
6. **Save** 클릭

### 3. 재배포

환경 변수 변경 후:

1. Vercel 대시보드 → Deployments
2. 최신 배포의 "..." → "Redeploy"
3. **"Use existing Build Cache" 체크 해제** ✅
4. "Redeploy" 클릭

### 4. 테스트

재배포 완료 후:

1. 학습 관리 > 학습 생성
2. 문항 추가 > 음원 파일 업로드
3. 업로드 성공 확인
4. Supabase Storage → `learning-audio` 버킷에서 파일 확인

## Supabase Service Role Key 확인 방법

1. Supabase 대시보드 접속
2. Settings → API 메뉴
3. **"service_role"** 섹션 찾기
4. **"secret"** 키 복사 (⚠️ 주의: 이 키는 공개되면 안 됨)
5. 키는 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 형식의 긴 문자열

## 문제 해결 체크리스트

- [ ] Vercel에 `NEXT_PUBLIC_SUPABASE_URL` 설정됨
- [ ] Vercel에 `SUPABASE_SERVICE_ROLE_KEY` 설정됨 (service_role 키)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`에 공백이나 줄바꿈 없음
- [ ] Supabase에 `learning-audio` 버킷 존재
- [ ] 버킷이 PUBLIC으로 설정됨
- [ ] Storage 정책이 올바르게 설정됨
- [ ] 환경 변수 변경 후 재배포 완료

## 추가 디버깅

Vercel 함수 로그 확인:

1. Vercel 대시보드 → 프로젝트 → Functions
2. `/api/admin/upload/audio` 함수 로그 확인
3. 에러 메시지 확인

## 참고

- Supabase Storage 문서: https://supabase.com/docs/guides/storage
- Service Role Key: Supabase 대시보드 → Settings → API → service_role (secret)
