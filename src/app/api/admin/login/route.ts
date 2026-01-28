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
    console.log("Admin login - Decoded UID:", uid)

    /**
     * ✅ Check admin role
     */
    let isAdmin = false

    // OPTION A: Custom claims
    console.log("Admin login - Custom claims:", decodedToken.role)
    if (decodedToken.role === "admin") {
      isAdmin = true
      console.log("Admin found via custom claims")
    } else {
      // OPTION B: Firestore fallback
      const userSnap = await adminDB.collection("users").doc(uid).get()
      console.log("Admin login - Firestore user exists:", userSnap.exists)
      console.log("Admin login - Firestore user data:", userSnap.data())
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
        console.log("Admin found via Firestore")
      }
    }

    console.log("Admin login - isAdmin:", isAdmin)

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Not an admin" },
        { status: 403 }
      )
    }

    /**
     CREATE SESSION COOKIE 
     */
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    })

    const cookieStore = await cookies()
    cookieStore.set("admin_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000), // Convert to seconds
    })
    
    console.log("Admin session cookie set successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login verification failed:", error)

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}
