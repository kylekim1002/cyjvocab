import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

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

    // 전체 데이터 조회 (페이지네이션 없음)
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
    })

    // 테스트 최고점 조회
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

    // 엑셀 데이터 포맷팅
    const excelData = scoresData.map((item) => ({
      날짜: item.assignment.assignedDate.toLocaleDateString("ko-KR"),
      캠퍼스명: item.assignment.class.campus.name,
      반명: item.assignment.class.name,
      선생님명: item.assignment.class.teacher.name,
      학생명: item.student.name,
      학년: item.student.grade?.value || "-",
      레벨: item.student.level?.value || "-",
      학습명: item.module.title,
      "단어목록 진행률(%)": item.wordlistProgressPct || 0,
      "암기학습 진행률(%)": item.memorizeProgressPct || 0,
      "테스트 최고점(점)": item.testBestScore || "-",
    }))

    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(wb, ws, "성적조회")

    // 파일명 생성
    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      select: { name: true },
    })
    const campusName = campus?.name || "unknown"
    const fromStr = dateFrom.replace(/-/g, "")
    const toStr = dateTo.replace(/-/g, "")
    const fileName = `scores_${campusName}_${fromStr}_${toStr}.xlsx`

    // 버퍼로 변환
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    // 응답 헤더 설정
    const headers = new Headers()
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`)

    return new NextResponse(buffer, { headers })
  } catch (error: any) {
    console.error("Scores export error:", error)
    return NextResponse.json(
      { error: "엑셀 다운로드에 실패했습니다." },
      { status: 500 }
    )
  }
}
