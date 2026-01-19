# 정답 입력 방식 되돌리기 가이드

## 변경 사항

정답 입력 방식이 다음과 같이 변경되었습니다:

**이전 방식:**
- 보기 1, 보기 2, 보기 3, 보기 4 중 하나를 선택

**변경된 방식:**
- 보기 중 하나와 동일한 텍스트를 직접 입력
- 입력한 텍스트가 보기와 일치하는지 자동 검증

## 되돌리기 방법

### 방법 1: Git을 사용한 되돌리기 (권장)

```bash
# 1. 현재 커밋 확인
git log --oneline -5

# 2. 정답 입력 방식 변경 이전 커밋으로 되돌리기
git revert HEAD

# 또는 특정 커밋으로 되돌리기
git reset --hard <이전_커밋_해시>

# 3. 변경사항 푸시
git push origin master
```

### 방법 2: Vercel에서 이전 배포로 롤백

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. "Deployments" 탭으로 이동
4. 정답 입력 방식 변경 이전 배포 찾기
5. 해당 배포의 "..." 메뉴 클릭
6. "Promote to Production" 선택

### 방법 3: 수동으로 코드 되돌리기

다음 파일을 수정해야 합니다:
- `components/admin/learning-management.tsx`

**되돌리기 내용:**

1. `LearningItem` 인터페이스에서 `correct_answer` 필드 제거
2. 정답 입력 부분을 다시 Select로 변경:
   ```tsx
   <Select
     value={item.correct_index.toString()}
     onValueChange={(v) => handleUpdateItem(index, "correct_index", parseInt(v))}
   >
     <SelectTrigger>
       <SelectValue />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="0">보기 1</SelectItem>
       <SelectItem value="1">보기 2</SelectItem>
       <SelectItem value="2">보기 3</SelectItem>
       <SelectItem value="3">보기 4</SelectItem>
     </SelectContent>
   </Select>
   ```
3. 검증 로직에서 `correct_answer` 관련 부분 제거
4. 저장 시 `correct_answer`를 `correct_index`로 변환하는 로직 제거
5. 기존 데이터 로드 시 `correct_answer` 설정 로직 제거

## 변경 전 커밋 해시

정답 입력 방식 변경 이전의 마지막 커밋:
- 커밋 해시: `1c498d1` (최종테스트 점수 계산 로직 개선)

## 주의사항

- 되돌리기 전에 현재 작업 중인 내용을 백업하세요
- 되돌리기 후 Vercel이 자동으로 재배포됩니다
- 기존에 텍스트 입력 방식으로 생성된 학습 데이터는 그대로 유지됩니다
  - 다만, 수정 시에는 이전 방식(보기 선택)으로 표시됩니다
