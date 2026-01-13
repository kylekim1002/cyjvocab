import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { LearningType } from "@prisma/client"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const levelId = searchParams.get("levelId")

    const where: any = {}
    if (levelId) {
      where.levelId = levelId
    }

    const modules = await prisma.learningModule.findMany({
      where,
      include: {
        level: true,
        grade: true,
        items: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(modules)
  } catch (error) {
    console.error("Get learning modules error:", error)
    return NextResponse.json(
      { error: "학습 목록 조회에 실패했습니다." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, type, levelId, gradeId, memo, items } = await request.json()

    if (!title || !title.trim() || !type || !levelId) {
      return NextResponse.json(
        { error: "제목, 타입, 레벨은 필수입니다." },
        { status: 400 }
      )
    }

    if (type !== "TYPE_A" && type !== "TYPE_B") {
      return NextResponse.json(
        { error: "타입은 TYPE_A 또는 TYPE_B여야 합니다." },
        { status: 400 }
      )
    }

    // gradeId가 빈 문자열이면 null로 변환
    const finalGradeId = gradeId && gradeId !== "" ? gradeId : null

    // 문항 검증
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        // 공통 검증
        if (!item.word_text || !item.word_text.trim()) {
          return NextResponse.json(
            { error: `문항 ${i + 1}: word_text는 필수입니다.` },
            { status: 400 }
          )
        }

        if (!item.choice1 || !item.choice2 || !item.choice3 || !item.choice4) {
          return NextResponse.json(
            { error: `문항 ${i + 1}: 보기 4개는 모두 필수입니다.` },
            { status: 400 }
          )
        }

        if (item.correct_index === undefined || item.correct_index < 0 || item.correct_index > 3) {
          return NextResponse.json(
            { error: `문항 ${i + 1}: 정답은 0~3 사이의 값이어야 합니다.` },
            { status: 400 }
          )
        }

        // TYPE_B 검증: image_file과 image_url 둘 다 있으면 오류
        if (type === "TYPE_B") {
          if (item.image_file && item.image_url) {
            return NextResponse.json(
              { error: `문항 ${i + 1}: 이미지 파일과 URL을 동시에 입력할 수 없습니다.` },
              { status: 400 }
            )
          }
        } else {
          // TYPE_A는 이미지가 없어야 함
          if (item.image_file || item.image_url) {
            return NextResponse.json(
              { error: `문항 ${i + 1}: TYPE_A는 이미지를 사용할 수 없습니다.` },
              { status: 400 }
            )
          }
        }
      }
    }

    // 학습 모듈 생성 (문항 포함)
    // type을 LearningType enum으로 변환
    let learningType: LearningType
    if (type === "TYPE_A") {
      learningType = LearningType.TYPE_A
    } else if (type === "TYPE_B") {
      learningType = LearningType.TYPE_B
    } else {
      return NextResponse.json(
        { error: "타입은 TYPE_A 또는 TYPE_B여야 합니다." },
        { status: 400 }
      )
    }

    const module = await prisma.learningModule.create({
      data: {
        title: title.trim(),
        type: learningType,
        levelId,
        gradeId: finalGradeId,
        memo: memo?.trim() || null,
        items: items && Array.isArray(items) ? {
          create: items.map((item: any, index: number) => ({
            order: index + 1,
            payloadJson: {
              word_text: item.word_text.trim(),
              choice1: item.choice1.trim(),
              choice2: item.choice2.trim(),
              choice3: item.choice3.trim(),
              choice4: item.choice4.trim(),
              correct_index: item.correct_index,
              image_url: item.image_url?.trim() || null,
            },
          })),
        } : undefined,
      },
      include: {
        level: true,
        grade: true,
        items: {
          orderBy: { order: "asc" },
        },
      },
    })

    return NextResponse.json(module)
  } catch (error: any) {
    console.error("Create module error:", error)
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "레벨 또는 학년 코드를 찾을 수 없습니다." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "학습 생성에 실패했습니다." },
      { status: 500 }
    )
  }
}
