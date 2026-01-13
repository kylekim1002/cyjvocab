-- 단어 학습 LMS 데이터베이스 스키마
-- Supabase SQL Editor에서 이 스크립트를 실행하세요

-- 1. ENUM 타입 생성
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'STUDENT');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "LearningType" AS ENUM ('FLASHCARD', 'QUIZ');
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TYPE "CodeCategory" AS ENUM ('GRADE', 'LEVEL');

-- 2. 기본 테이블 생성 (의존성 없는 테이블부터)

-- Campus 테이블
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Campus_name_key" ON "Campus"("name");

-- Code 테이블
CREATE TABLE "Code" (
    "id" TEXT NOT NULL,
    "category" "CodeCategory" NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Code_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Code_category_value_key" ON "Code"("category", "value");
CREATE INDEX "Code_category_order_idx" ON "Code"("category", "order");

-- User 테이블
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "campusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_campusId_idx" ON "User"("campusId");

ALTER TABLE "User" ADD CONSTRAINT "User_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Teacher 테이블
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Teacher_campusId_name_key" ON "Teacher"("campusId", "name");
CREATE INDEX "Teacher_campusId_idx" ON "Teacher"("campusId");

ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Student 테이블
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "campusId" TEXT NOT NULL,
    "gradeId" TEXT,
    "school" TEXT,
    "autoLoginToken" TEXT,
    "autoLoginTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_username_key" ON "Student"("username");
CREATE UNIQUE INDEX "Student_autoLoginToken_key" ON "Student"("autoLoginToken");
CREATE INDEX "Student_campusId_idx" ON "Student"("campusId");
CREATE INDEX "Student_status_idx" ON "Student"("status");
CREATE INDEX "Student_username_idx" ON "Student"("username");
CREATE INDEX "Student_autoLoginToken_idx" ON "Student"("autoLoginToken");

ALTER TABLE "Student" ADD CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Code"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Class 테이블
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Class_campusId_idx" ON "Class"("campusId");
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX "Class_deletedAt_idx" ON "Class"("deletedAt");

ALTER TABLE "Class" ADD CONSTRAINT "Class_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StudentClass 테이블
CREATE TABLE "StudentClass" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentClass_studentId_classId_key" ON "StudentClass"("studentId", "classId");
CREATE INDEX "StudentClass_studentId_idx" ON "StudentClass"("studentId");
CREATE INDEX "StudentClass_classId_idx" ON "StudentClass"("classId");

ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentClass" ADD CONSTRAINT "StudentClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LearningModule 테이블
CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LearningType" NOT NULL,
    "levelId" TEXT NOT NULL,
    "gradeId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningModule_levelId_idx" ON "LearningModule"("levelId");
CREATE INDEX "LearningModule_gradeId_idx" ON "LearningModule"("gradeId");

ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Code"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningModule" ADD CONSTRAINT "LearningModule_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LearningItem 테이블
CREATE TABLE "LearningItem" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearningItem_moduleId_order_idx" ON "LearningItem"("moduleId", "order");

ALTER TABLE "LearningItem" ADD CONSTRAINT "LearningItem_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClassAssignment 테이블
CREATE TABLE "ClassAssignment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassAssignment_classId_assignedDate_key" ON "ClassAssignment"("classId", "assignedDate");
CREATE INDEX "ClassAssignment_classId_assignedDate_idx" ON "ClassAssignment"("classId", "assignedDate");

ALTER TABLE "ClassAssignment" ADD CONSTRAINT "ClassAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClassAssignmentModule 테이블
CREATE TABLE "ClassAssignmentModule" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAssignmentModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassAssignmentModule_assignmentId_moduleId_key" ON "ClassAssignmentModule"("assignmentId", "moduleId");
CREATE INDEX "ClassAssignmentModule_assignmentId_idx" ON "ClassAssignmentModule"("assignmentId");
CREATE INDEX "ClassAssignmentModule_moduleId_idx" ON "ClassAssignmentModule"("moduleId");

ALTER TABLE "ClassAssignmentModule" ADD CONSTRAINT "ClassAssignmentModule_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassAssignmentModule" ADD CONSTRAINT "ClassAssignmentModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StudySession 테이블
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "payloadJson" JSONB,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudySession_studentId_assignmentId_moduleId_status_idx" ON "StudySession"("studentId", "assignmentId", "moduleId", "status");
CREATE INDEX "StudySession_studentId_status_idx" ON "StudySession"("studentId", "status");

ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- StudentAssignmentProgress 테이블
CREATE TABLE "StudentAssignmentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudentAssignmentProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAssignmentProgress_studentId_assignmentId_moduleId_key" ON "StudentAssignmentProgress"("studentId", "assignmentId", "moduleId");
CREATE INDEX "StudentAssignmentProgress_studentId_assignmentId_idx" ON "StudentAssignmentProgress"("studentId", "assignmentId");
CREATE INDEX "StudentAssignmentProgress_studentId_completed_idx" ON "StudentAssignmentProgress"("studentId", "completed");

ALTER TABLE "StudentAssignmentProgress" ADD CONSTRAINT "StudentAssignmentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAssignmentProgress" ADD CONSTRAINT "StudentAssignmentProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAssignmentProgress" ADD CONSTRAINT "StudentAssignmentProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ScoreLog 테이블
CREATE TABLE "ScoreLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "classId" TEXT,
    "activityType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoreLog_campusId_createdAt_idx" ON "ScoreLog"("campusId", "createdAt");
CREATE INDEX "ScoreLog_classId_createdAt_idx" ON "ScoreLog"("classId", "createdAt");
CREATE INDEX "ScoreLog_studentId_createdAt_idx" ON "ScoreLog"("studentId", "createdAt");
CREATE INDEX "ScoreLog_createdAt_idx" ON "ScoreLog"("createdAt");

ALTER TABLE "ScoreLog" ADD CONSTRAINT "ScoreLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreLog" ADD CONSTRAINT "ScoreLog_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreLog" ADD CONSTRAINT "ScoreLog_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ScoreDaily 테이블
CREATE TABLE "ScoreDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "classId" TEXT,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreDaily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScoreDaily_date_campusId_classId_studentId_key" ON "ScoreDaily"("date", "campusId", "classId", "studentId");
CREATE INDEX "ScoreDaily_date_campusId_idx" ON "ScoreDaily"("date", "campusId");
CREATE INDEX "ScoreDaily_date_classId_idx" ON "ScoreDaily"("date", "classId");
CREATE INDEX "ScoreDaily_date_studentId_idx" ON "ScoreDaily"("date", "studentId");
CREATE INDEX "ScoreDaily_campusId_date_idx" ON "ScoreDaily"("campusId", "date");

ALTER TABLE "ScoreDaily" ADD CONSTRAINT "ScoreDaily_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreDaily" ADD CONSTRAINT "ScoreDaily_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreDaily" ADD CONSTRAINT "ScoreDaily_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WrongAnswer 테이블
CREATE TABLE "WrongAnswer" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "itemId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WrongAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WrongAnswer_studentId_idx" ON "WrongAnswer"("studentId");
CREATE INDEX "WrongAnswer_moduleId_idx" ON "WrongAnswer"("moduleId");

ALTER TABLE "WrongAnswer" ADD CONSTRAINT "WrongAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WrongAnswer" ADD CONSTRAINT "WrongAnswer_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoginAttempt 테이블
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginAttempt_username_createdAt_idx" ON "LoginAttempt"("username", "createdAt");
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 완료 메시지
SELECT 'Database schema created successfully!' AS message;
