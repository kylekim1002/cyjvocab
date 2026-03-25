import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

function setSecurityHeaders(res: NextResponse) {
  // 기본 보안 헤더
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "no-referrer")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  )

  // 브레이킹 리스크를 줄이기 위해 report-only로 먼저 도입
  // - Next/브라우저 내부 동작을 고려해 script/style에 최소한의 unsafe-inline을 포함
  // - 실제 enforcement 전에는 report-only 로그를 확인해야 합니다.
  res.headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "media-src 'self' data: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https:",
      "form-action 'self'",
    ].join("; ")
  )
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // /admin/login은 admin 레이아웃(인증 강제) 밖의 전용 페이지로 rewrite
    if (pathname.startsWith('/admin/login')) {
      if (token) {
        const role = token.role as string
        if (role === 'SUPER_ADMIN' || role === 'MANAGER') {
          return NextResponse.redirect(new URL('/admin', req.url))
        }
        return NextResponse.redirect(new URL('/student', req.url))
      }
      const res = NextResponse.rewrite(new URL('/admin-login', req.url))
      setSecurityHeaders(res)
      return res
    }

    // 로그인하지 않은 경우
    if (!token) {
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      } else if (pathname.startsWith('/student')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      const res = NextResponse.next()
      setSecurityHeaders(res)
      return res
    }

    const role = token.role as string

    // 관리자 페이지 접근 제어
    if (pathname.startsWith('/admin')) {
      if (role !== 'SUPER_ADMIN' && role !== 'MANAGER') {
        return NextResponse.redirect(new URL('/student', req.url))
      }
    }

    // 학생 페이지 접근 제어
    if (pathname.startsWith('/student')) {
      if (role !== 'STUDENT') {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
    }

    const res = NextResponse.next()
    setSecurityHeaders(res)
    return res
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // 공개 경로는 항상 허용
        if (
          pathname === '/login' ||
          pathname === '/admin-login' ||
          pathname.startsWith('/admin/login') ||
          pathname.startsWith('/s/auto/')
        ) {
          return true
        }

        // 보호된 경로는 토큰 필요
        if (pathname.startsWith('/admin') || pathname.startsWith('/student')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin-login',
    '/student',
    '/student/:path*',
    '/login',
    '/admin/login',
    '/s/auto/:path*',
  ],
}
