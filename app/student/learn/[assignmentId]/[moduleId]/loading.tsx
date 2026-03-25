import { StudentWaitScreen } from "@/components/student/student-wait-screen"

/** 학습 URL 진입 시 서버 렌더·데이터 로딩 */
export default function StudentLearnLoading() {
  return (
    <StudentWaitScreen
      variant="page"
      title="학습 준비 중 🌱"
      message="문제를 불러오고 있어요. 조금만 기다려 주세요."
    />
  )
}
