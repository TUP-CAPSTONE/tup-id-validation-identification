// api/auth/login/admin/route.ts
import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { logLogin } from "@/lib/session-tracker"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: "Missing auth token" }, { status: 400 })

    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Check admin role
    let isAdmin = decodedToken.role === "admin"
    if (!isAdmin) {
      const userSnap = await adminDB.collection("users").doc(uid).get()
      if (userSnap.exists && userSnap.data()?.role === "admin") isAdmin = true
    }

    if (!isAdmin) return NextResponse.json({ error: "Not an admin" }, { status: 403 })

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn })

    const cookieStore = await cookies()
    cookieStore.set("admin_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    })

    // Log login
    const userDoc = await adminDB.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
    const userAgent = req.headers.get("user-agent")

    if (userData) {
      await logLogin(
        uid,
        userData.email || decodedToken.email || "unknown@email.com",
        userData.fullName || userData.email || "Admin User",
        "admin",
        ip || undefined,
        userAgent || undefined
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login failed:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
