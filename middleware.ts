import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/clients/admin")
  const isLoginPage = req.nextUrl.pathname === "/clients/admin/login"

  // Firebase client auth cookie
  const isLoggedIn =
    req.cookies.get("firebase:authUser") ||
    req.cookies.get("__session")

  if (isAdminRoute && !isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(
      new URL("/clients/admin/login", req.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/clients/admin/:path*"],
}
