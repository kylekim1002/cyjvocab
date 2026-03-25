-- 학기 코드(SEMESTER)와 레벨 코드(LEVEL) 매핑 테이블
-- 매핑된 레벨만 학생 화면 "학습추가"에서 노출
-- 하위 호환: 매핑이 없는 학기는 전체 레벨 허용(앱 로직에서 처리)

CREATE TABLE IF NOT EXISTS "SemesterLevelMap" (
  "semesterCodeId" TEXT NOT NULL,
  "levelCodeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SemesterLevelMap_pkey" PRIMARY KEY ("semesterCodeId", "levelCodeId")
);

CREATE INDEX IF NOT EXISTS "SemesterLevelMap_semesterCodeId_idx"
  ON "SemesterLevelMap"("semesterCodeId");

CREATE INDEX IF NOT EXISTS "SemesterLevelMap_levelCodeId_idx"
  ON "SemesterLevelMap"("levelCodeId");
