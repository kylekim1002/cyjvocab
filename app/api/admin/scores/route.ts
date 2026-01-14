import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get("campus_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const filterType = searchParams.get("filter_type")
    const filterValue = searchParams.get("filter_value")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("page_size") || "100")

    // 캠퍼스 필수
    if (!campusId) {
      return NextResponse.json(
        { error: "캠퍼스를 선택해주세요." },
        { status: 400 }
      )
    }

    // 날짜 필수
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "조회 기간을 선택해주세요." },
        { status: 400 }
      )
    }

    // 날짜를 명시적으로 설정 (시작일 00:00:00, 종료일 23:59:59.999)
    const fromDate = new Date(dateFrom)
    fromDate.setHours(0, 0, 0, 0) // 시작일 00:00:00
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999) // 종료일 23:59:59.999

    // 31일 제한 검증
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 31) {
      return NextResponse.json(
        { error: "조회 기간은 최대 31일까지 가능합니다." },
        { status: 400 }
      )
    }

    // 기본 조건: campus_id + date range
    const assignmentWhere: any = {
      class: {
        campusId: campusId,
      },
      assignedDate: {
        gte: fromDate,
        lte: toDate,
      },
    }

    // 필터 조건 추가
    if (filterType && filterValue) {
      switch (filterType) {
        case "class_name":
          assignmentWhere.class = {
            ...assignmentWhere.class,
            name: {
              contains: filterValue,
            },
          }
          break
        case "teacher_name":
          assignmentWhere.class = {
            ...assignmentWhere.class,
            teacher: {
              name: {
                contains: filterValue,
              },
            },
          }
          break
      }
    }

    const where: any = {
      assignment: assignmentWhere,
    }

    // 학생 필터 조건 추가
    if (filterType && filterValue) {
      switch (filterType) {
        case "student_name":
          where.student = {
            name: {
              contains: filterValue,
            },
          }
          break
        case "grade":
          where.student = {
            gradeId: filterValue,
          }
          break
        case "level":
          where.student = {
            levelId: filterValue,
          }
          break
      }
    }

    // 진행률 데이터 조회
    const progressData = await prisma.studentAssignmentProgress.findMany({
      where,
      include: {
        student: {
          include: {
            campus: true,
            grade: true,
            level: true,
          },
        },
        assignment: {
          include: {
            class: {
              include: {
                teacher: true,
                campus: true,
              },
            },
          },
        },
        module: true,
      },
      orderBy: [
        { assignment: { assignedDate: "desc" } },
        { student: { name: "asc" } },
        { module: { title: "asc" } },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 테스트 최고점 조회 (각 progress에 대해)
    const scoresData = await Promise.all(
      progressData.map(async (progress) => {
        const bestScore = await prisma.studySession.findFirst({
          where: {
            studentId: progress.studentId,
            assignmentId: progress.assignmentId,
            moduleId: progress.moduleId,
            status: "COMPLETED",
            score: {
              not: null,
            },
          },
          orderBy: {
            score: "desc",
          },
          select: {
            score: true,
          },
        })

        return {
          ...progress,
          testBestScore: bestScore?.score || null,
        }
      })
    )

    // 전체 개수 조회
    const totalCount = await prisma.studentAssignmentProgress.count({ where })

    // 결과 포맷팅
    const results = scoresData.map((item) => ({
      date: item.assignment.assignedDate,
      campusName: item.assignment.class.campus.name,
      className: item.assignment.class.name,
      teacherName: item.assignment.class.teacher.name,
      studentName: item.student.name,
      grade: item.student.grade?.value || "-",
      level: item.student.level?.value || "-",
      moduleTitle: item.module.title,
      wordProgressPct: item.wordlistProgressPct || 0,
      memorizationProgressPct: item.memorizeProgressPct || 0,
      testBestScorePct: item.testBestScore || null,
    }))

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error("Scores query error:", error)
    return NextResponse.json(
      { error: "성적 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}
