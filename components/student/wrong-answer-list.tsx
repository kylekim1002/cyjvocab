"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"

interface WrongAnswer {
  id: string
  question: string
  answer: string
  correctAnswer: string
  createdAt: Date
  module: {
    title: string
  }
}

interface WrongAnswerListProps {
  wrongAnswers: WrongAnswer[]
}

export function WrongAnswerList({ wrongAnswers }: WrongAnswerListProps) {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">오답노트</h1>

      {wrongAnswers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            오답이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {wrongAnswers.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg">{item.module.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">문제</p>
                  <p>{item.question}</p>
                </div>
                <div>
                  <p className="font-medium text-destructive">내 답</p>
                  <p>{item.answer}</p>
                </div>
                <div>
                  <p className="font-medium text-green-600">정답</p>
                  <p>{item.correctAnswer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
