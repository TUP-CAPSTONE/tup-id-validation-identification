import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPage = pathname.startsWith("/clients/admin")
  const isAdminApi = pathname.startsWith("/api/admin")

  const isAdminLoginPage = pathname === "/clients/admin/login"
  const isAdminLoginApi = pathname === "/api/admin/login"

  const adminSession = req.cookies.get("admin_session")

  /**
   * ✅ ALWAYS allow admin login routes
   */
  if (isAdminLoginPage || isAdminLoginApi) {
    return NextResponse.next()
  }

  /**
   * 🚫 Block admin APIs if not logged in
   * (NO redirects for APIs)
   */
  if (isAdminApi && !adminSession) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  /**
   * 🔒 Protect admin pages
   */
  if (isAdminPage && !adminSession) {
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
