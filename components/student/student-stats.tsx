"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDateTime } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SessionData {
  id: string
  assignedDate: Date
  completedAt: Date
  totalItems: number
  correctCount: number
  score: number
  moduleTitle: string
}

interface StudentStatsProps {
  sessionData: SessionData[]
  totalScore: number
  totalCount: number
  averageScore: number
}

export function StudentStats({
  sessionData,
  totalScore,
  totalCount,
  averageScore,
}: StudentStatsProps) {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">통계</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">총 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">학습 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 30일 학습 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              학습 기록이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제출일</TableHead>
                    <TableHead>응시일</TableHead>
                    <TableHead>학습명</TableHead>
                    <TableHead className="text-right">문항수</TableHead>
                    <TableHead className="text-right">정답수</TableHead>
                    <TableHead className="text-right">점수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionData.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{formatDate(session.assignedDate)}</TableCell>
                      <TableCell>{formatDateTime(session.completedAt)}</TableCell>
                      <TableCell>{session.moduleTitle}</TableCell>
                      <TableCell className="text-right">{session.totalItems}</TableCell>
                      <TableCell className="text-right">{session.correctCount}</TableCell>
                      <TableCell className="text-right font-medium">{session.score}점</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
