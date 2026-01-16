import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequestWithAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // 로그인하지 않은 경우
    if (!token) {
      if (pathname.startsWith('/admin') || pathname.startsWith('/student')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return NextResponse.next()
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

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // 공개 경로는 항상 허용
        if (pathname === '/login' || pathname.startsWith('/s/auto/')) {
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
    '/student/:path*',
    '/login',
    '/s/auto/:path*',
  ],
}
