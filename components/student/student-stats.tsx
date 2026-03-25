"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatDateCompact,
  formatDateTimeCompact,
} from "@/lib/utils"
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
    <div className="container mx-auto max-w-4xl p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold">점수</h1>

      {/* 총점 · 평균 · 학습횟수 — 항상 한 줄 (3열) */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-2 py-4 sm:px-4 text-center min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">총 점수</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums mt-1">{totalScore}</p>
            </div>
            <div className="px-2 py-4 sm:px-4 text-center min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">평균 점수</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums mt-1">{averageScore}</p>
            </div>
            <div className="px-2 py-4 sm:px-4 text-center min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">학습 횟수</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums mt-1">{totalCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">최근 30일 학습 기록</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              학습 기록이 없습니다.
            </p>
          ) : (
            <>
              {/* 모바일: 카드 리스트 — 날짜 한 줄·긴 학습명 줄바꿈 허용 */}
              <ul className="space-y-3 md:hidden">
                {sessionData.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg border bg-card p-3 text-sm shadow-sm"
                  >
                    <p className="font-medium text-base leading-snug break-words">
                      {session.moduleTitle}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="whitespace-nowrap">
                          제출 <span className="text-foreground tabular-nums">{formatDateCompact(session.assignedDate)}</span>
                        </span>
                        <span className="text-border hidden sm:inline">·</span>
                        <span className="whitespace-nowrap">
                          응시 <span className="text-foreground tabular-nums">{formatDateTimeCompact(session.completedAt)}</span>
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs border-t pt-2 tabular-nums">
                      <span>
                        문항 <strong className="text-foreground">{session.totalItems}</strong>
                      </span>
                      <span>
                        정답 <strong className="text-foreground">{session.correctCount}</strong>
                      </span>
                      <span>
                        점수 <strong className="text-foreground">{session.score}점</strong>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 태블릿 이상: 표 + 짧은 날짜 + nowrap */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap min-w-[7rem]">제출일</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[9rem]">응시일</TableHead>
                      <TableHead className="min-w-[8rem]">학습명</TableHead>
                      <TableHead className="text-right whitespace-nowrap">문항수</TableHead>
                      <TableHead className="text-right whitespace-nowrap">정답수</TableHead>
                      <TableHead className="text-right whitespace-nowrap">점수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionData.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="whitespace-nowrap align-top text-sm tabular-nums">
                          {formatDateCompact(session.assignedDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap align-top text-sm tabular-nums">
                          {formatDateTimeCompact(session.completedAt)}
                        </TableCell>
                        <TableCell className="align-top text-sm max-w-[240px] lg:max-w-md break-words">
                          {session.moduleTitle}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums">{session.totalItems}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">{session.correctCount}</TableCell>
                        <TableCell className="text-right align-top font-medium tabular-nums">{session.score}점</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
