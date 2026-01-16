import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('시드 데이터 생성 시작...')

  // 코드값 생성
  const grades = [
    { category: 'GRADE' as const, value: '1학년', order: 1 },
    { category: 'GRADE' as const, value: '2학년', order: 2 },
    { category: 'GRADE' as const, value: '3학년', order: 3 },
    { category: 'GRADE' as const, value: '4학년', order: 4 },
    { category: 'GRADE' as const, value: '5학년', order: 5 },
    { category: 'GRADE' as const, value: '6학년', order: 6 },
  ]

  const levels = [
    { category: 'LEVEL' as const, value: 'Level 1', order: 1 },
    { category: 'LEVEL' as const, value: 'Level 2', order: 2 },
    { category: 'LEVEL' as const, value: 'Level 3', order: 3 },
    { category: 'LEVEL' as const, value: 'Level 4', order: 4 },
    { category: 'LEVEL' as const, value: 'Level 5', order: 5 },
  ]

  for (const grade of grades) {
    await prisma.code.upsert({
      where: { category_value: { category: grade.category, value: grade.value } },
      update: {},
      create: grade,
    })
  }

  for (const level of levels) {
    await prisma.code.upsert({
      where: { category_value: { category: level.category, value: level.value } },
      update: {},
      create: level,
    })
  }

  console.log('코드값 생성 완료')

  // 관리자 계정 생성
  const hashedPassword = await bcrypt.hash('kyle1002!@', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'cyjkyle' },
    update: {},
    create: {
      username: 'cyjkyle',
      password: hashedPassword,
      name: '관리자',
      role: 'SUPER_ADMIN' as const,
    },
  })

  console.log('관리자 계정 생성 완료:', adminUser.username)

  // 샘플 학습 콘텐츠 생성
  const level1Code = await prisma.code.findFirst({
    where: { category: 'LEVEL', value: 'Level 1' },
  })

  const grade1Code = await prisma.code.findFirst({
    where: { category: 'GRADE', value: '1학년' },
  })

  if (level1Code && grade1Code) {
    // 플래시카드 학습
    const flashcardModule = await prisma.learningModule.create({
      data: {
        title: '기초 단어 1',
        type: 'TYPE_A' as const,
        levelId: level1Code.id,
        gradeId: grade1Code.id,
        memo: '기초 단어 학습',
        items: {
          create: [
            {
              order: 1,
              payloadJson: {
                word: 'apple',
                meaning: '사과',
                example: 'I like apples.',
              },
            },
            {
              order: 2,
              payloadJson: {
                word: 'book',
                meaning: '책',
                example: 'This is a book.',
              },
            },
            {
              order: 3,
              payloadJson: {
                word: 'cat',
                meaning: '고양이',
                example: 'The cat is sleeping.',
              },
            },
          ],
        },
      },
    })

    // 퀴즈 학습
    const quizModule = await prisma.learningModule.create({
      data: {
        title: '기초 퀴즈 1',
        type: 'TYPE_B' as const,
        levelId: level1Code.id,
        gradeId: grade1Code.id,
        memo: '기초 퀴즈',
        items: {
          create: [
            {
              order: 1,
              payloadJson: {
                question: '사과는 영어로?',
                options: ['apple', 'banana', 'orange', 'grape'],
                correctAnswer: 0,
              },
            },
            {
              order: 2,
              payloadJson: {
                question: '책은 영어로?',
                options: ['book', 'pen', 'desk', 'chair'],
                correctAnswer: 0,
              },
            },
          ],
        },
      },
    })

    console.log('샘플 학습 콘텐츠 생성 완료')
  }

  console.log('시드 데이터 생성 완료!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
