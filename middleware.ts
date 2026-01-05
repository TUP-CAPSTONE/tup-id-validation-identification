import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require admin authentication
const publicRoutes = [
  '/clients/admin/login',
  '/clients/students/login',
  '/clients/students/register',
  '/clients/students/forgot',
  '/clients/OSA/login',
  '/clients/gatekiosk/login',
]

// Admin routes that require authentication
const adminRoutes = [
  '/clients/admin',
  '/clients/admin/manage-registrations',
  '/clients/admin/manage-id-validation',
  '/clients/admin/manage-osa-accounts',
  '/clients/admin/manage-gate-accounts',
  '/clients/admin/monitor-logs',
  '/clients/admin/manage-feedbacks',
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Check if the route is an admin route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isAdminRoute) {
    // Get the auth token from cookies
    const authToken = request.cookies.get('__session')?.value

    // If no auth token, redirect to login
    if (!authToken) {
      return NextResponse.redirect(new URL('/clients/admin/login', request.url))
    }

    // Note: Full admin validation (checking Firestore) should be done on the client side
    // because middleware runs on the server and doesn't have direct access to Firebase client SDK.
    // The authentication state is managed by Firebase Auth on the client.
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
