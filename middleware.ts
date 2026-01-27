import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const normalizedPath = pathname.toLowerCase()

  /* =======================
     SESSION COOKIES
  ======================= */
  const adminSession = req.cookies.get("admin_session")
  const osaSession = req.cookies.get("osa_session")

  /* =======================
     ADMIN ROUTES
  ======================= */
  const isAdminPage =
    pathname.startsWith("/clients/admin") ||
    normalizedPath.startsWith("/clients/admin")

  const isAdminApi =
    pathname.startsWith("/api/admin") ||
    normalizedPath.startsWith("/api/admin")

  const isAdminLoginPage =
    pathname === "/clients/admin/login" ||
    normalizedPath === "/clients/admin/login"

  const isAdminLoginApi =
    pathname === "/api/admin/login" ||
    normalizedPath === "/api/admin/login"

  /* =======================
     OSA ROUTES (CAPITAL OSA)
  ======================= */
  const isOsaPage =
    pathname.startsWith("/clients/OSA") ||
    normalizedPath.startsWith("/clients/osa")

  const isOsaApi =
    pathname.startsWith("/api/osa") ||
    normalizedPath.startsWith("/api/osa")

  const isOsaLoginPage =
    pathname === "/clients/OSA/login" ||
    normalizedPath === "/clients/osa/login"

  const isOsaLoginApi =
    pathname === "/api/osa/login" ||
    normalizedPath === "/api/osa/login"

  /* =======================
     ✅ ALWAYS ALLOW LOGIN ROUTES
  ======================= */
  if (
    isAdminLoginPage ||
    isAdminLoginApi ||
    isOsaLoginPage ||
    isOsaLoginApi
  ) {
    return NextResponse.next()
  }

  /* =======================
     🚫 BLOCK UNAUTHENTICATED API ACCESS
  ======================= */
  if (isAdminApi && !adminSession) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  if (isOsaApi && !osaSession) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  /* =======================
     🚫 BLOCK CROSS-ROLE ACCESS
  ======================= */
  if (isOsaPage && adminSession && !osaSession) {
    return NextResponse.redirect(
      new URL("/clients/admin", req.url)
    )
  }

  if (isAdminPage && osaSession && !adminSession) {
    return NextResponse.redirect(
      new URL("/clients/OSA", req.url)
    )
  }

  /* =======================
     🔒 PROTECT PAGES
  ======================= */
  if (isAdminPage && !adminSession) {
    return NextResponse.redirect(
      new URL("/clients/admin/login", req.url)
    )
  }

  if (isOsaPage && !osaSession) {
    return NextResponse.redirect(
      new URL("/clients/OSA/login", req.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/clients/:path*",
    "/api/:path*",
  ],
}
