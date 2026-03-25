import { StudentWaitScreen } from "@/components/student/student-wait-screen"

/** 학생 구간 탭·URL 전환 시 RSC 로딩 */
export default function StudentSegmentLoading() {
  return (
    <StudentWaitScreen
      variant="page"
      title="잠깐만 ✨"
      message="다음 화면을 불러오고 있어요. 터치는 한 번만!"
    />
  )
}
