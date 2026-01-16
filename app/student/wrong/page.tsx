import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { prisma } from "@/lib/prisma"
import { WrongAnswerList } from "@/components/student/wrong-answer-list"

export default async function WrongAnswerPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.studentId) {
    return null
  }

  const wrongAnswers = await prisma.wrongAnswer.findMany({
    where: {
      studentId: session.user.studentId,
    },
    include: {
      module: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return <WrongAnswerList wrongAnswers={wrongAnswers} />
}
