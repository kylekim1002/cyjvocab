# 🔍 GitHub 파일 확인 방법

## 중요: GitHub에 파일이 실제로 있는지 확인하세요!

Vercel이 UI 컴포넌트를 찾을 수 없다는 것은 **파일이 GitHub에 없을 가능성**이 높습니다.

## 확인 방법

### 1. GitHub 저장소에서 직접 확인

다음 URL로 이동하세요:
**https://github.com/kylekim1002/cyjvocab/tree/master/components/ui**

다음 파일들이 보여야 합니다:
- ✅ `button.tsx`
- ✅ `input.tsx`
- ✅ `label.tsx`
- ✅ `card.tsx`
- ✅ `use-toast.ts`
- ✅ `toast.tsx`
- ✅ `toaster.tsx`
- ✅ `checkbox.tsx`
- ✅ `dialog.tsx`
- ✅ `select.tsx`
- ✅ `switch.tsx`
- ✅ `table.tsx`
- ✅ `textarea.tsx`

### 2. 파일이 없다면

파일이 GitHub에 없다면 다시 추가하세요:

```bash
# 모든 UI 컴포넌트 파일 확인
git status components/ui/

# 파일 추가 (필요시)
git add components/ui/

# 커밋
git commit -m "UI 컴포넌트 파일 추가"

# GitHub에 푸시
git push origin master
```

### 3. 파일이 있다면

파일이 GitHub에 있는데도 Vercel에서 찾을 수 없다면:
- `next.config.js`의 webpack 설정이 추가되었습니다
- 이 변경사항을 푸시하고 재배포하세요

## 다음 단계

1. **GitHub에서 파일 확인** (위 URL)
2. **파일이 없다면**: 위 명령어로 추가 및 푸시
3. **파일이 있다면**: `next.config.js` 변경사항 푸시 후 재배포
