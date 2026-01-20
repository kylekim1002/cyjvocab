# 📈 확장 가이드: 500명 동시 접속 대응

## 현재 상태 (무료 플랜)

### Vercel 무료 플랜 (Hobby)
- **함수 실행 시간**: 10초 제한
- **대역폭**: 100GB/월
- **동시 함수 실행**: 제한 있음
- **빌드 시간**: 제한 있음

### Supabase 무료 플랜 (Free)
- **데이터베이스 크기**: 500MB
- **동시 연결**: 최대 60개
- **API 요청**: 50,000/월
- **Storage**: 1GB

## ⚠️ 500명 동시 접속 시 문제점

### 1. Supabase 데이터베이스 연결 제한
- **무료 플랜**: 최대 60개 동시 연결
- **500명 동시 접속**: 연결 부족으로 에러 발생 가능

### 2. Vercel 함수 실행 시간
- **무료 플랜**: 10초 제한
- 복잡한 쿼리나 처리 시 타임아웃 가능

### 3. API 요청 제한
- **Supabase 무료**: 50,000 요청/월
- 500명이 매일 사용하면 부족할 수 있음

## 💰 권장 플랜 업그레이드

### Supabase 플랜 업그레이드 (필수)

**Pro 플랜 ($25/월)**
- ✅ **동시 연결**: 최대 200개 (Pooler 사용 시 더 많음)
- ✅ **데이터베이스 크기**: 8GB
- ✅ **API 요청**: 무제한
- ✅ **Storage**: 100GB
- ✅ **백업**: 7일 보관

**500명 동시 접속을 위해서는:**
- Connection Pooler 사용 필수
- Pooler 사용 시 동시 연결을 더 효율적으로 관리 가능

### Vercel 플랜 업그레이드 (권장)

**Pro 플랜 ($20/월)**
- ✅ **함수 실행 시간**: 60초
- ✅ **대역폭**: 1TB/월
- ✅ **동시 함수 실행**: 더 많은 동시 실행
- ✅ **빌드 시간**: 더 빠른 빌드
- ✅ **Analytics**: 포함

**Enterprise 플랜** (500명 이상 권장)
- ✅ 더 많은 리소스
- ✅ 전용 지원
- ✅ SLA 보장

## 🔧 추가 최적화 조치

### 1. 데이터베이스 연결 최적화

**Connection Pooler 사용 (필수)**
- Supabase Pro 플랜에서 Connection Pooler 활성화
- `DATABASE_URL`을 Pooler URL로 변경:
  ```
  postgresql://postgres.xxxxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

**Prisma Connection Pool 설정**
- `prisma/schema.prisma`에 connection_limit 추가:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    connection_limit = 10
  }
  ```

### 2. API 최적화

**캐싱 전략**
- 자주 조회되는 데이터는 캐싱
- Next.js의 `revalidate` 옵션 활용
- Vercel Edge Cache 활용

**데이터베이스 쿼리 최적화**
- 인덱스 확인 및 추가
- N+1 쿼리 문제 해결
- 불필요한 데이터 조회 최소화

### 3. 파일 업로드 최적화

**Supabase Storage 사용**
- 이미 Supabase Storage 사용 중 ✅
- CDN을 통한 빠른 파일 제공

### 4. 모니터링 설정

**Vercel Analytics**
- Pro 플랜에 포함
- 실시간 성능 모니터링

**Supabase Dashboard**
- 데이터베이스 성능 모니터링
- 연결 수 확인
- 쿼리 성능 분석

## 📊 예상 비용 (500명 동시 접속)

### 최소 구성
- **Supabase Pro**: $25/월
- **Vercel Pro**: $20/월
- **총 비용**: 약 $45/월

### 권장 구성
- **Supabase Pro**: $25/월
- **Vercel Enterprise**: 문의 필요 (약 $100+/월)
- **총 비용**: 약 $125+/월

## 🚀 단계별 업그레이드 계획

### 1단계: Supabase Pro로 업그레이드 (필수)
1. Supabase 대시보드 → Billing
2. Pro 플랜 선택
3. 결제 정보 입력
4. Connection Pooler 활성화
5. `DATABASE_URL`을 Pooler URL로 변경

### 2단계: Vercel Pro로 업그레이드 (권장)
1. Vercel 대시보드 → Settings → Billing
2. Pro 플랜 선택
3. 결제 정보 입력

### 3단계: 최적화 적용
1. Connection Pooler 설정
2. Prisma connection_limit 설정
3. 캐싱 전략 적용
4. 모니터링 설정

## ⚡ 즉시 적용 가능한 최적화

### 1. Connection Pooler 설정

**현재 DATABASE_URL:**
```
postgresql://postgres.lmdbwarinjgvvwenfzgd:cyj2604kyle0125@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

**Pooler URL로 변경:**
```
postgresql://postgres.lmdbwarinjgvvwenfzgd:cyj2604kyle0125@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 2. Prisma Connection Limit 설정

`prisma/schema.prisma`에 추가:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

## 📝 체크리스트

### Supabase
- [ ] Pro 플랜으로 업그레이드
- [ ] Connection Pooler 활성화
- [ ] DATABASE_URL을 Pooler URL로 변경
- [ ] 모니터링 설정

### Vercel
- [ ] Pro 플랜으로 업그레이드 (권장)
- [ ] Analytics 활성화
- [ ] 모니터링 설정

### 코드 최적화
- [ ] Prisma connection_limit 설정
- [ ] 캐싱 전략 적용
- [ ] 쿼리 최적화
- [ ] 인덱스 확인

## 🎯 결론

**500명 동시 접속을 위해서는:**

1. **Supabase Pro 플랜 필수** ($25/월)
   - Connection Pooler 사용으로 동시 연결 효율화

2. **Vercel Pro 플랜 권장** ($20/월)
   - 더 많은 리소스와 안정성

3. **최적화 조치 필수**
   - Connection Pooler 설정
   - Prisma connection_limit 설정
   - 쿼리 최적화

**총 예상 비용: 약 $45-125/월**

---

## 참고

- Supabase Connection Pooler: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- Vercel 플랜 비교: https://vercel.com/pricing
- Supabase 플랜 비교: https://supabase.com/pricing
