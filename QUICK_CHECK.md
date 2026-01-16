# 🔍 빠른 확인 가이드

## 현재 상태 확인

터미널 출력에서 다음을 확인하세요:

### ❌ 로컬 DB에 연결된 경우 (현재 상태)
```
Datasource "db": PostgreSQL database "word_learning_lms", schema "public" at "localhost:5432"
```
→ **이것은 로컬 데이터베이스입니다. Supabase에 연결하려면 `.env.local` 파일을 수정해야 합니다.**

### ✅ Supabase에 연결된 경우 (목표)
```
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxxxxxxxxxxxx.supabase.co:5432"
```
→ **이것이 정상입니다! Supabase에 연결된 상태입니다.**

---

## 해결 방법

### 1단계: Supabase 프로젝트 생성 여부 확인

**아직 Supabase 프로젝트를 만들지 않았다면:**
👉 `STEP_BY_STEP_DEPLOYMENT.md`의 **1단계**부터 시작하세요!

**이미 Supabase 프로젝트를 만들었다면:**
👉 아래 2단계로 진행하세요.

### 2단계: .env.local 파일 수정

1. 프로젝트 폴더에서 `.env.local` 파일 열기
2. `DATABASE_URL` 찾기
3. 다음 형식으로 변경:

```env
# ❌ 잘못된 형식 (로컬 DB)
DATABASE_URL="postgresql://user:password@localhost:5432/word_learning_lms"

# ✅ 올바른 형식 (Supabase)
DATABASE_URL="postgresql://postgres:비밀번호@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
```

**중요:**
- `비밀번호`: Supabase 프로젝트 생성 시 설정한 데이터베이스 비밀번호
- `xxxxxxxxxxxxx`: Supabase 프로젝트의 고유 ID (Project URL에서 확인)

### 3단계: 다시 실행

`.env.local` 파일을 저장한 후:

```bash
npm run db:push
```

### 4단계: 확인

터미널 출력에서 다음을 확인:

```
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.xxxxxxxxxxxxx.supabase.co:5432"
```

이 메시지가 보이면 **정상적으로 Supabase에 연결된 것입니다!** ✅

---

## Supabase 정보 찾는 방법

1. [supabase.com](https://supabase.com) 로그인
2. 프로젝트 선택
3. Settings (⚙️) → API 메뉴
4. **Project URL** 확인: `https://xxxxxxxxxxxxx.supabase.co`
5. **Database** 메뉴 → **Connection string** → **URI** 탭
6. 연결 문자열 복사 (비밀번호 부분에 실제 비밀번호 입력)

---

## 문제 해결

### 문제: "connection refused" 또는 "timeout" 에러
→ Supabase 프로젝트가 생성되지 않았거나, URL이 잘못되었습니다.
→ 1단계부터 다시 확인하세요.

### 문제: "password authentication failed" 에러
→ 데이터베이스 비밀번호가 잘못되었습니다.
→ Supabase 프로젝트 설정에서 비밀번호를 확인하세요.

### 문제: 여전히 "localhost:5432"가 보임
→ `.env.local` 파일이 저장되지 않았거나, 다른 `.env` 파일이 우선순위가 높습니다.
→ `.env.local` 파일을 다시 확인하고 저장하세요.
