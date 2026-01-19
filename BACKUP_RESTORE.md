# 백업 및 복구 가이드

## 백업 태그

### 최종테스트 점수 계산 수정 전 백업
- **태그명**: `backup-before-finaltest-fix`
- **생성일**: 최종테스트 점수 계산 로직 개선 전
- **설명**: 최종테스트 점수 계산이 계속 잘못되어 수정하기 전 상태

## 복구 방법

### 방법 1: Git 태그를 사용한 복구

```bash
# 1. 현재 상태 확인
git log --oneline -5

# 2. 백업 태그로 되돌리기
git checkout backup-before-finaltest-fix

# 3. 새 브랜치 생성 (안전하게 복구)
git checkout -b restore-backup

# 4. 원격 저장소에 푸시
git push origin restore-backup

# 5. Vercel에서 restore-backup 브랜치로 배포
```

### 방법 2: 특정 커밋으로 되돌리기

```bash
# 1. 백업 태그의 커밋 해시 확인
git show backup-before-finaltest-fix

# 2. 해당 커밋으로 되돌리기
git reset --hard backup-before-finaltest-fix

# 3. 강제 푸시 (주의: 기존 커밋이 삭제됨)
git push origin master --force
```

### 방법 3: Vercel에서 이전 배포로 롤백

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. "Deployments" 탭으로 이동
4. `backup-before-finaltest-fix` 태그 또는 해당 시점의 배포 찾기
5. 해당 배포의 "..." 메뉴 클릭
6. "Promote to Production" 선택

## 현재 수정 사항

### 최종테스트 점수 계산
- **공식**: (맞은 문항 수 / 총 문항 수) × 100
- **예시**:
  - 10문항 중 9문항 정답 → 90점
  - 10문항 중 5문항 정답 → 50점
  - 20문항 중 17문항 정답 → 85점

### 최종테스트 동작
1. 전체 문항 중 20개 랜덤 선택 (20개 미만이면 전체)
2. 선택된 문항 순서 랜덤 섞기
3. 각 문항의 보기 순서 랜덤 섞기
4. 정답 인덱스 업데이트
5. 정답 매칭하여 점수 계산

## 문제 발생 시

1. **Vercel 로그 확인**: 에러 메시지 확인
2. **브라우저 콘솔 확인**: 클라이언트 에러 확인
3. **서버 로그 확인**: 점수 계산 과정 로그 확인
4. **백업으로 복구**: 위의 복구 방법 사용

## 주의사항

- 백업으로 복구하면 최근 수정 사항이 모두 사라집니다
- 복구 전에 현재 작업 내용을 백업하세요
- 프로덕션 환경에서 복구 시 사용자에게 미리 공지하세요
