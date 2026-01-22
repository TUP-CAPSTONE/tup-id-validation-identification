import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 400 }
      )
    }

    /**
     * ✅ Verify Firebase ID token
     */
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    /**
     * ✅ Check admin role
     */
    let isAdmin = false

    // OPTION A: Custom claims
    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      // OPTION B: Firestore fallback
      const userSnap = await adminDB.collection("users").doc(uid).get()
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Not an admin" },
        { status: 403 }
      )
    }

    /**
     * ✅ CREATE SESSION COOKIE (THIS WAS MISSING)
     */
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn: 60 * 60 * 24 * 5 * 1000, // 5 days
    })

    ;(await cookies()).set("admin_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login verification failed:", error)

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}
