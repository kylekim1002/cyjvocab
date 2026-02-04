import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  // SUPER_ADMIN만 백업 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // 모든 테이블 데이터 조회 (외래키 관계 순서 고려)
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.username,
      data: {
        // 기본 설정 데이터 (먼저 복원)
        codes: await prisma.code.findMany({
          orderBy: [{ category: "asc" }, { order: "asc" }],
        }),
        campuses: await prisma.campus.findMany({
          orderBy: { name: "asc" },
        }),
        teachers: await prisma.teacher.findMany({
          orderBy: { name: "asc" },
        }),
        // 관리자 (SUPER_ADMIN, MANAGER만)
        users: await prisma.user.findMany({
          where: {
            role: {
              in: ["SUPER_ADMIN", "MANAGER"],
            },
          },
          orderBy: { createdAt: "asc" },
        }),
        // 클래스 및 학생
        classes: await prisma.class.findMany({
          orderBy: { createdAt: "asc" },
        }),
        students: await prisma.student.findMany({
          orderBy: { createdAt: "asc" },
        }),
        studentClasses: await prisma.studentClass.findMany({
          orderBy: { createdAt: "asc" },
        }),
        // 학습 콘텐츠
        learningModules: await prisma.learningModule.findMany({
          orderBy: { createdAt: "asc" },
        }),
        learningItems: await prisma.learningItem.findMany({
          orderBy: [{ moduleId: "asc" }, { order: "asc" }],
        }),
        // 배정 및 진행도
        classAssignments: await prisma.classAssignment.findMany({
          orderBy: { createdAt: "asc" },
        }),
        classAssignmentModules: await prisma.classAssignmentModule.findMany({
          orderBy: [{ assignmentId: "asc" }, { order: "asc" }],
        }),
        // 학습 데이터 (선택적 - 필요시 포함)
        studySessions: await prisma.studySession.findMany({
          orderBy: { createdAt: "asc" },
        }),
        studentAssignmentProgress: await prisma.studentAssignmentProgress.findMany({
          orderBy: { createdAt: "asc" },
        }),
        // 성적 데이터
        scoreLogs: await prisma.scoreLog.findMany({
          orderBy: { createdAt: "asc" },
        }),
        scoreDailies: await prisma.scoreDaily.findMany({
          orderBy: { date: "asc" },
        }),
        // 기타
        wrongAnswers: await prisma.wrongAnswer.findMany({
          orderBy: { createdAt: "asc" },
        }),
        studentLearningAttempts: await prisma.studentLearningAttempt.findMany({
          orderBy: { createdAt: "asc" },
        }),
      },
    }

    // JSON 문자열로 변환
    const jsonString = JSON.stringify(backupData, null, 2)

    // 파일명 생성 (날짜 포함)
    const filename = `backup-${new Date().toISOString().split("T")[0]}-${Date.now()}.json`

    // Response로 반환 (다운로드)
    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Backup export error:", error)
    return NextResponse.json(
      { error: "백업 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
