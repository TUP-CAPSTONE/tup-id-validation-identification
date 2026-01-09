import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPage = pathname.startsWith("/clients/admin")
  const isAdminApi = pathname.startsWith("/api/admin")
  const isLoginPage = pathname === "/clients/admin/login"

  const isLoggedIn =
    req.cookies.get("firebase:authUser") ||
    req.cookies.get("__session")

  // 🚫 API: return 401, DO NOT redirect
  if (isAdminApi && !isLoggedIn) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  // ✅ Pages: redirect to login
  if (isAdminPage && !isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(
      new URL("/clients/admin/login", req.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/clients/admin/:path*",
    "/api/admin/:path*",
  ],
}
