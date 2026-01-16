# 빌드 에러 해결 가이드

## 현재 상황

1. **로컬 빌드**: `authOptions` import 경로 문제 (수정 완료)
2. **Vercel 빌드**: UI 컴포넌트를 찾을 수 없음

## 해결 방법

### 1. GitHub에 푸시

변경사항을 GitHub에 푸시하세요:

```bash
git push origin master
```

### 2. Vercel 재배포

GitHub에 푸시하면 Vercel이 자동으로 재배포합니다.

또는 수동으로:
1. Vercel 대시보드 → 프로젝트 선택
2. "Deployments" 탭
3. "Redeploy" 클릭

### 3. UI 컴포넌트 문제 해결

만약 여전히 UI 컴포넌트를 찾을 수 없다면:

1. **GitHub에서 파일 확인**
   - `https://github.com/kylekim1002/cyjvocab/tree/master/components/ui`
   - 모든 파일이 있는지 확인

2. **빌드 캐시 삭제 (정확한 경로)**

   **방법 1: Caches 메뉴에서 삭제**
   1. Vercel 대시보드 접속
   2. 프로젝트 `cyjvocab` 선택
   3. 상단 메뉴에서 **"Settings"** 탭 클릭
   4. 왼쪽 사이드바에서 **"Caches"** 메뉴 클릭
   5. **"Purge Data Cache"** 버튼 클릭 (빌드 관련 캐시 포함)
   6. 필요시 **"Purge CDN Cache"** 버튼도 클릭 (배포된 콘텐츠 캐시)
   7. 확인 메시지에서 확인
   
   ⚠️ **참고**: 
   - **Data Cache**: 빌드 과정에서 사용되는 데이터와 컴포넌트 캐시 (빌드 문제 해결에 중요)
   - **CDN Cache**: 배포된 콘텐츠의 CDN 캐시 (선택사항)
   
   빌드 문제 해결을 위해서는 **Data Cache를 삭제**하는 것이 가장 중요합니다.

   **방법 2: 재배포 시 캐시 무시 (가장 확실한 방법)**
   1. Vercel 대시보드 → 프로젝트 `cyjvocab` 선택
   2. 상단 메뉴에서 **"Deployments"** 탭 클릭
   3. 최신 배포 항목(또는 실패한 배포)의 **"..."** (세로 점 3개) 메뉴 클릭
   4. **"Redeploy"** 선택
   5. 나타나는 다이얼로그에서 **"Use existing Build Cache"** 체크박스를 **해제** ✅
      - 이 옵션이 보이지 않으면, 다이얼로그를 확장하거나 "Advanced" 옵션 확인
   6. **"Redeploy"** 버튼 클릭
   
   ⚠️ **중요**: "Use existing Build Cache"를 체크 해제하면 빌드 캐시를 사용하지 않고 처음부터 다시 빌드합니다.

   **방법 3: General 페이지에서 찾기 (옵션에 따라 다름)**
   1. Settings → General
   2. 페이지 맨 아래로 스크롤
   3. "Danger Zone" 섹션 위쪽 확인
   4. "Clear Build Cache"가 있으면 사용

3. **TypeScript 경로 확인**
   - `tsconfig.json`의 `paths` 설정 확인
   - `"@/*": ["./*"]`가 올바른지 확인

## 수정된 파일

- `app/api/admin/classes/[id]/assignments/[assignmentId]/route.ts`
- `app/api/student/auto-login-token/route.ts`
- `app/api/student/sessions/[id]/save/route.ts`

## 다음 단계

1. GitHub에 푸시
2. Vercel 자동 재배포 대기
3. 배포 로그 확인
4. 문제가 계속되면 Vercel 지원팀에 문의
