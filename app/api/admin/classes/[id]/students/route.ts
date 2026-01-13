import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// GET: 현재 배치된 학생 리스트
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const classId = params.id

    // 클래스 존재 확인
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { campus: true },
    })

    if (!cls) {
      return NextResponse.json(
        { error: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 현재 배치된 학생 조회 (endAt이 NULL인 경우)
    const assignedStudents = await prisma.studentClass.findMany({
      where: {
        classId,
        endAt: null,
      },
      include: {
        student: {
          include: {
            grade: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      class: cls,
      students: assignedStudents.map((sc) => ({
        id: sc.student.id,
        name: sc.student.name,
        username: sc.student.username,
        grade: sc.student.grade?.value || null,
        level: sc.student.level?.value || null,
        assignedAt: sc.startAt,
      })),
    })
  } catch (error) {
    console.error("Get class students error:", error)
    return NextResponse.json(
      { error: "학생 목록 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

// POST: 학생 배치
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const classId = params.id
    const { student_ids } = await request.json()

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: "학생 ID 배열이 필요합니다." },
        { status: 400 }
      )
    }

    // 클래스 존재 확인
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { campus: true },
    })

    if (!cls) {
      return NextResponse.json(
        { error: "클래스를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 학생들 조회 및 캠퍼스 일치 확인
    const students = await prisma.student.findMany({
      where: {
        id: { in: student_ids },
        campusId: cls.campusId, // 캠퍼스 일치 확인
      },
    })

    if (students.length !== student_ids.length) {
      return NextResponse.json(
        { error: "일부 학생을 찾을 수 없거나 캠퍼스가 일치하지 않습니다." },
        { status: 400 }
      )
    }

    // 트랜잭션으로 배치 처리
    await prisma.$transaction(async (tx) => {
      for (const studentId of student_ids) {
        // 기존 배정 확인 (endAt이 NULL인 경우)
        const existingAssignment = await tx.studentClass.findFirst({
          where: {
            studentId,
            endAt: null,
          },
        })

        // 기존 배정이 있으면 종료 처리
        if (existingAssignment) {
          await tx.studentClass.update({
            where: { id: existingAssignment.id },
            data: { endAt: new Date() },
          })
        }

        // 이미 이 클래스에 배정되어 있는지 확인 (endAt이 NULL인 경우)
        const existingInClass = await tx.studentClass.findFirst({
          where: {
            studentId,
            classId,
            endAt: null,
          },
        })

        // 없으면 새로 배정
        if (!existingInClass) {
          // 기존에 배정 이력이 있으면 업데이트, 없으면 생성
          const existingHistory = await tx.studentClass.findFirst({
            where: {
              studentId,
              classId,
            },
            orderBy: { createdAt: "desc" },
          })

          if (existingHistory) {
            // 기존 이력이 있으면 endAt을 NULL로 설정하여 재배정
            await tx.studentClass.update({
              where: { id: existingHistory.id },
              data: {
                endAt: null,
                startAt: new Date(),
              },
            })
          } else {
            // 새로 배정
            await tx.studentClass.create({
              data: {
                studentId,
                classId,
                startAt: new Date(),
              },
            })
          }
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Assign students error:", error)
    return NextResponse.json(
      { error: "학생 배치에 실패했습니다." },
      { status: 500 }
    )
  }
}
