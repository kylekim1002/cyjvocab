# 🔧 Supabase Storage 업로드 오류 해결 가이드

## 문제: "signature verification failed" 오류

음원 파일 업로드 시 발생하는 오류입니다. 이는 Supabase Storage 설정 문제입니다.

## 해결 방법

### 1. Vercel 환경 변수 확인

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 다음 변수 확인:

```
NEXT_PUBLIC_SUPABASE_URL = https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY = [YOUR-SERVICE-ROLE-KEY]
```

**중요**: 
- `SUPABASE_SERVICE_ROLE_KEY`는 **service_role** 키여야 합니다 (anon 키 아님)
- Supabase 대시보드 → Settings → API → service_role key 복사

### 2. Supabase Storage 버킷 확인

1. Supabase 대시보드 → Storage
2. `learning-audio` 버킷이 있는지 확인
3. 없으면 생성:
   - 버킷 이름: `learning-audio`
   - Public: ✅ (체크)
   - File size limit: 10MB

### 3. Storage 버킷 정책 확인

Supabase 대시보드 → Storage → `learning-audio` → Policies에서:

**업로드 정책 (INSERT):**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'learning-audio');
```

**또는 서비스 롤 키 사용 시 (권장):**
- 정책 없이도 service_role 키로 업로드 가능
- 하지만 Public 읽기 정책은 필요:

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'learning-audio');
```

### 4. 환경 변수 재설정

Vercel에서 환경 변수를 다시 설정:

1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` 삭제 후 다시 추가
3. **주의**: 공백이나 줄바꿈이 포함되지 않도록 주의
4. 저장 후 재배포

### 5. 재배포

환경 변수 변경 후:
1. Vercel 대시보드 → Deployments
2. 최신 배포의 "..." → "Redeploy"
3. "Use existing Build Cache" 체크 해제
4. "Redeploy" 클릭

## 확인 방법

1. Supabase 대시보드 → Storage → `learning-audio` 확인
2. 학습 관리에서 음원 파일 업로드 테스트
3. 업로드 성공 시 Storage에 파일이 표시되는지 확인

## 추가 확인 사항

### Supabase 프로젝트 상태
- Supabase 프로젝트가 **Active** 상태인지 확인
- 프로젝트가 일시 중지되었거나 삭제되지 않았는지 확인

### Service Role Key 확인
- Supabase 대시보드 → Settings → API
- **service_role** 키 (secret) 복사
- **anon** 키가 아닌 **service_role** 키 사용

### Storage 버킷 이름 확인
- 코드에서 사용하는 버킷 이름: `learning-audio`
- Supabase에 실제로 존재하는 버킷 이름과 일치하는지 확인

## 에러 메시지별 해결 방법

### "signature verification failed"
→ `SUPABASE_SERVICE_ROLE_KEY`가 잘못되었거나 공백이 포함됨

### "Bucket not found"
→ `learning-audio` 버킷이 생성되지 않음

### "new row violates row-level security"
→ Storage 버킷 정책이 잘못 설정됨

## 참고

- Supabase Storage 문서: https://supabase.com/docs/guides/storage
- Storage 정책 설정: https://supabase.com/docs/guides/storage/policies
