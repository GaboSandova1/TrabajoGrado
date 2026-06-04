import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Temporary bypass to avoid auth loop while debugging login state.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  const token = request.cookies.get('authToken')?.value || 
                (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null)

  const isLoginPage = request.nextUrl.pathname === '/login'
  const isEmployeePath = request.nextUrl.pathname.startsWith('/employee')
  const isManagerPath = request.nextUrl.pathname.startsWith('/manager')
  const isRootPath = request.nextUrl.pathname === '/'

  // If user is on login page and has token, redirect to home
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not on login page and doesn't have token, redirect to login
  if ((isEmployeePath || isManagerPath || isRootPath) && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
