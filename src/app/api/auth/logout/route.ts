// api/auth/logout/route.ts
import { logLogout } from "@/lib/session-tracker"
import { adminDB, adminAuth } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()

    const adminSession = cookieStore.get("admin_session")?.value
    const osaSession = cookieStore.get("osa_session")?.value
    const gateSession = cookieStore.get("gate_session")?.value

    const sessionCookie = adminSession || osaSession || gateSession

    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
        const uid = decodedClaims.uid

        const userDoc = await adminDB.collection("users").doc(uid).get()
        const userData = userDoc.data()

        if (userData) {
          const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
          const userAgent = req.headers.get("user-agent")

          // Only system users
          const roleLower = userData.role?.toLowerCase()
          if (["admin", "osa", "gate"].includes(roleLower)) {
            await logLogout(
              uid,
              userData.email || decodedClaims.email || "unknown@email.com",
              userData.fullName || userData.email || "Unknown User",
              roleLower as "admin" | "osa" | "Gate",
              ip || undefined,
              userAgent || undefined
            )
          }
        }

        await adminAuth.revokeRefreshTokens(uid)
      } catch (error) {
        console.error("Error verifying session during logout:", error)
      }
    }

    // Delete session cookies
    cookieStore.delete("admin_session")
    cookieStore.delete("osa_session")
    cookieStore.delete("gate_session")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
