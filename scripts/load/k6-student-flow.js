import http from "k6/http"
import { check, sleep } from "k6"
import { SharedArray } from "k6/data"

const BASE_URL = __ENV.BASE_URL || "https://cyjvocab.vercel.app"
const ASSIGNMENT_ID = __ENV.ASSIGNMENT_ID || ""
const MODULE_ID = __ENV.MODULE_ID || ""

/**
 * STUDENT_CREDENTIALS 형식:
 * "학생명1:숫자4자리,학생명2:숫자4자리"
 */
const users = new SharedArray("student credentials", () => {
  const raw = (__ENV.STUDENT_CREDENTIALS || "").trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const idx = token.lastIndexOf(":")
      if (idx <= 0) return null
      return {
        name: token.slice(0, idx).trim(),
        username: token.slice(idx + 1).trim(),
      }
    })
    .filter((x) => x && x.name && x.username)
})

if (users.length === 0) {
  throw new Error(
    "STUDENT_CREDENTIALS가 비어있습니다. 예: STUDENT_CREDENTIALS='홍길동:1234,김학생:5678'"
  )
}

export const options = {
  scenarios: {
    student_login_and_progress: {
      executor: "ramping-vus",
      startVUs: 20,
      stages: [
        { duration: "1m", target: 100 },
        { duration: "1m", target: 200 },
        { duration: "1m", target: 400 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
  },
}

function pickUser() {
  const vuOffset = (__VU - 1) % users.length
  return users[vuOffset]
}

function getCsrfToken() {
  const res = http.get(`${BASE_URL}/api/auth/csrf`, {
    tags: { endpoint: "auth_csrf" },
  })
  check(res, {
    "csrf status 200": (r) => r.status === 200,
  })
  const token = res.json("csrfToken")
  if (!token) {
    throw new Error("csrfToken 획득 실패")
  }
  return token
}

function signInStudent(user, csrfToken) {
  const payload =
    `csrfToken=${encodeURIComponent(csrfToken)}` +
    `&name=${encodeURIComponent(user.name)}` +
    `&username=${encodeURIComponent(user.username)}` +
    `&password=` +
    `&loginType=student` +
    `&callbackUrl=${encodeURIComponent(`${BASE_URL}/student`)}` +
    `&json=true`

  const res = http.post(`${BASE_URL}/api/auth/callback/credentials`, payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    redirects: 0,
    tags: { endpoint: "auth_callback_credentials" },
  })

  check(res, {
    "login callback status 200/302": (r) => r.status === 200 || r.status === 302,
  })
}

function verifySession() {
  const res = http.get(`${BASE_URL}/api/auth/session`, {
    tags: { endpoint: "auth_session" },
  })

  check(res, {
    "session status 200": (r) => r.status === 200,
    "session has user": (r) => !!r.json("user"),
  })
}

function updateProgress() {
  if (!ASSIGNMENT_ID || !MODULE_ID) return

  const mode = Math.random() < 0.5 ? "WORDLIST" : "MEMORIZE"
  const currentIndex = Math.floor(Math.random() * 20)
  const totalCount = 20

  const res = http.post(
    `${BASE_URL}/api/student/progress/update`,
    JSON.stringify({
      assignmentId: ASSIGNMENT_ID,
      moduleId: MODULE_ID,
      mode,
      currentIndex,
      totalCount,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "student_progress_update" },
    }
  )

  check(res, {
    "progress status 200": (r) => r.status === 200,
  })
}

export default function () {
  const user = pickUser()
  const csrfToken = getCsrfToken()

  signInStudent(user, csrfToken)
  verifySession()

  // 학생 홈 접근
  const studentRes = http.get(`${BASE_URL}/student`, {
    tags: { endpoint: "student_home" },
  })
  check(studentRes, {
    "student page status 200/302": (r) => r.status === 200 || r.status === 302,
  })

  // 진행률 API는 ASSIGNMENT_ID/MODULE_ID 제공 시에만 실행
  updateProgress()

  sleep(0.5)
}
