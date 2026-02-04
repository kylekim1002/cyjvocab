import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // SUPER_ADMIN만 복원 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "백업 파일을 선택해주세요." },
        { status: 400 }
      )
    }

    // 파일 읽기
    const fileContent = await file.text()
    const backupData = JSON.parse(fileContent)

    // 백업 데이터 검증
    if (!backupData.data || !backupData.version) {
      return NextResponse.json(
        { error: "유효하지 않은 백업 파일입니다." },
        { status: 400 }
      )
    }

    // 트랜잭션으로 모든 데이터 복원 (타임아웃 60초)
    await prisma.$transaction(
      async (tx) => {
        const { data } = backupData

        // 1. 기존 데이터 삭제 (외래키 제약 조건 고려하여 역순)
        // 참고: LoginAttempt는 로그 데이터이므로 백업/복원에서 제외
        await tx.studentLearningAttempt.deleteMany({})
        await tx.wrongAnswer.deleteMany({})
        await tx.scoreDaily.deleteMany({})
        await tx.scoreLog.deleteMany({})
        await tx.studentAssignmentProgress.deleteMany({})
        await tx.studySession.deleteMany({})
        await tx.classAssignmentModule.deleteMany({})
        await tx.classAssignment.deleteMany({})
        await tx.learningItem.deleteMany({})
        await tx.learningModule.deleteMany({})
        await tx.studentClass.deleteMany({})
        await tx.student.deleteMany({})
        await tx.class.deleteMany({})
        await tx.teacher.deleteMany({})
        // 관리자만 삭제 (학생 User는 Student 삭제 시 CASCADE로 삭제됨)
        await tx.user.deleteMany({
          where: {
            role: {
              in: ["SUPER_ADMIN", "MANAGER"],
            },
          },
        })
        await tx.campus.deleteMany({})
        await tx.code.deleteMany({})

      // 2. 데이터 복원 (외래키 관계 순서)
      if (data.codes && Array.isArray(data.codes)) {
        for (const code of data.codes) {
          await tx.code.create({
            data: {
              id: code.id,
              category: code.category,
              value: code.value,
              order: code.order,
              createdAt: new Date(code.createdAt),
              updatedAt: new Date(code.updatedAt),
            },
          })
        }
      }

      if (data.campuses && Array.isArray(data.campuses)) {
        for (const campus of data.campuses) {
          await tx.campus.create({
            data: {
              id: campus.id,
              name: campus.name,
              createdAt: new Date(campus.createdAt),
              updatedAt: new Date(campus.updatedAt),
            },
          })
        }
      }

      if (data.teachers && Array.isArray(data.teachers)) {
        for (const teacher of data.teachers) {
          await tx.teacher.create({
            data: {
              id: teacher.id,
              name: teacher.name,
              campusId: teacher.campusId,
              createdAt: new Date(teacher.createdAt),
              updatedAt: new Date(teacher.updatedAt),
            },
          })
        }
      }

      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          await tx.user.create({
            data: {
              id: user.id,
              username: user.username,
              password: user.password,
              name: user.name,
              role: user.role,
              campusId: user.campusId,
              isActive: user.isActive,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          })
        }
      }

      if (data.classes && Array.isArray(data.classes)) {
        for (const cls of data.classes) {
          await tx.class.create({
            data: {
              id: cls.id,
              name: cls.name,
              campusId: cls.campusId,
              levelId: cls.levelId,
              gradeId: cls.gradeId,
              teacherId: cls.teacherId,
              createdAt: new Date(cls.createdAt),
              updatedAt: new Date(cls.updatedAt),
              deletedAt: cls.deletedAt ? new Date(cls.deletedAt) : null,
            },
          })
        }
      }

      if (data.students && Array.isArray(data.students)) {
        for (const student of data.students) {
          await tx.student.create({
            data: {
              id: student.id,
              name: student.name,
              username: student.username,
              password: student.password,
              plainPassword: student.plainPassword,
              status: student.status,
              campusId: student.campusId,
              gradeId: student.gradeId,
              levelId: student.levelId,
              school: student.school,
              autoLoginToken: student.autoLoginToken,
              autoLoginTokenExpiresAt: student.autoLoginTokenExpiresAt
                ? new Date(student.autoLoginTokenExpiresAt)
                : null,
              createdAt: new Date(student.createdAt),
              updatedAt: new Date(student.updatedAt),
            },
          })
        }
      }

      if (data.studentClasses && Array.isArray(data.studentClasses)) {
        for (const sc of data.studentClasses) {
          await tx.studentClass.create({
            data: {
              id: sc.id,
              studentId: sc.studentId,
              classId: sc.classId,
              startAt: new Date(sc.startAt),
              endAt: sc.endAt ? new Date(sc.endAt) : null,
              createdAt: new Date(sc.createdAt),
            },
          })
        }
      }

      if (data.learningModules && Array.isArray(data.learningModules)) {
        for (const module of data.learningModules) {
          await tx.learningModule.create({
            data: {
              id: module.id,
              title: module.title,
              type: module.type,
              levelId: module.levelId,
              gradeId: module.gradeId,
              memo: module.memo,
              createdAt: new Date(module.createdAt),
              updatedAt: new Date(module.updatedAt),
            },
          })
        }
      }

      if (data.learningItems && Array.isArray(data.learningItems)) {
        for (const item of data.learningItems) {
          await tx.learningItem.create({
            data: {
              id: item.id,
              moduleId: item.moduleId,
              order: item.order,
              payloadJson: item.payloadJson,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            },
          })
        }
      }

      if (data.classAssignments && Array.isArray(data.classAssignments)) {
        for (const assignment of data.classAssignments) {
          await tx.classAssignment.create({
            data: {
              id: assignment.id,
              classId: assignment.classId,
              assignedDate: new Date(assignment.assignedDate),
              createdAt: new Date(assignment.createdAt),
              updatedAt: new Date(assignment.updatedAt),
            },
          })
        }
      }

      if (
        data.classAssignmentModules &&
        Array.isArray(data.classAssignmentModules)
      ) {
        for (const cam of data.classAssignmentModules) {
          await tx.classAssignmentModule.create({
            data: {
              id: cam.id,
              assignmentId: cam.assignmentId,
              moduleId: cam.moduleId,
              order: cam.order,
              createdAt: new Date(cam.createdAt),
            },
          })
        }
      }

      if (data.studySessions && Array.isArray(data.studySessions)) {
        for (const session of data.studySessions) {
          await tx.studySession.create({
            data: {
              id: session.id,
              studentId: session.studentId,
              assignmentId: session.assignmentId,
              moduleId: session.moduleId,
              status: session.status,
              payloadJson: session.payloadJson,
              score: session.score,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt),
              completedAt: session.completedAt
                ? new Date(session.completedAt)
                : null,
            },
          })
        }
      }

      if (
        data.studentAssignmentProgress &&
        Array.isArray(data.studentAssignmentProgress)
      ) {
        for (const progress of data.studentAssignmentProgress) {
          await tx.studentAssignmentProgress.create({
            data: {
              id: progress.id,
              studentId: progress.studentId,
              assignmentId: progress.assignmentId,
              moduleId: progress.moduleId,
              progressPct: progress.progressPct,
              completed: progress.completed,
              createdAt: new Date(progress.createdAt),
              updatedAt: new Date(progress.updatedAt),
              completedAt: progress.completedAt
                ? new Date(progress.completedAt)
                : null,
              wordlistMaxIndex: progress.wordlistMaxIndex,
              wordlistProgressPct: progress.wordlistProgressPct,
              memorizeMaxIndex: progress.memorizeMaxIndex,
              memorizeProgressPct: progress.memorizeProgressPct,
            },
          })
        }
      }

      if (data.scoreLogs && Array.isArray(data.scoreLogs)) {
        for (const log of data.scoreLogs) {
          await tx.scoreLog.create({
            data: {
              id: log.id,
              studentId: log.studentId,
              campusId: log.campusId,
              classId: log.classId,
              activityType: log.activityType,
              score: log.score,
              createdAt: new Date(log.createdAt),
            },
          })
        }
      }

      if (data.scoreDailies && Array.isArray(data.scoreDailies)) {
        for (const daily of data.scoreDailies) {
          await tx.scoreDaily.create({
            data: {
              id: daily.id,
              date: new Date(daily.date),
              studentId: daily.studentId,
              campusId: daily.campusId,
              classId: daily.classId,
              totalScore: daily.totalScore,
              totalCount: daily.totalCount,
              createdAt: new Date(daily.createdAt),
              updatedAt: new Date(daily.updatedAt),
            },
          })
        }
      }

      if (data.wrongAnswers && Array.isArray(data.wrongAnswers)) {
        for (const wrong of data.wrongAnswers) {
          await tx.wrongAnswer.create({
            data: {
              id: wrong.id,
              studentId: wrong.studentId,
              moduleId: wrong.moduleId,
              itemId: wrong.itemId,
              question: wrong.question,
              answer: wrong.answer,
              correctAnswer: wrong.correctAnswer,
              createdAt: new Date(wrong.createdAt),
            },
          })
        }
      }

      if (
        data.studentLearningAttempts &&
        Array.isArray(data.studentLearningAttempts)
      ) {
        for (const attempt of data.studentLearningAttempts) {
          await tx.studentLearningAttempt.create({
            data: {
              id: attempt.id,
              studentId: attempt.studentId,
              campusId: attempt.campusId,
              classId: attempt.classId,
              assignmentDate: new Date(attempt.assignmentDate),
              moduleId: attempt.moduleId,
              phase: attempt.phase,
              totalCount: attempt.totalCount,
              correctCount: attempt.correctCount,
              scorePct: attempt.scorePct,
              completedAt: new Date(attempt.completedAt),
              createdAt: new Date(attempt.createdAt),
              updatedAt: new Date(attempt.updatedAt),
            },
          })
        }
      },
      {
        timeout: 60000, // 60초 타임아웃
      }
    )

    return NextResponse.json({
      success: true,
      message: "백업이 성공적으로 복원되었습니다.",
    })
  } catch (error: any) {
    console.error("Backup import error:", error)
    return NextResponse.json(
      {
        error: "백업 복원에 실패했습니다.",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
