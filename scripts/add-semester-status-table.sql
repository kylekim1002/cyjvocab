-- 학기 코드 ON/OFF 상태 저장 테이블
-- OFF이면 학생 화면의 학기 선택 목록에서 숨김

CREATE TABLE IF NOT EXISTS "SemesterCodeStatus" (
  "semesterCodeId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SemesterCodeStatus_pkey" PRIMARY KEY ("semesterCodeId")
);
