import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // 기존 LearningModule 데이터 삭제
  await prisma.learningItem.deleteMany({})
  await prisma.learningModule.deleteMany({})
  
  console.log("기존 학습 데이터 삭제 완료")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
