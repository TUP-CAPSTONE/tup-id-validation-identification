import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      )
    }

    /**
     * 1️⃣ Verify Firebase ID token
     */
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    /**
     * 2️⃣ Get user document from Firestore
     */
    const userRef = adminDB.collection("users").doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 403 }
      )
    }

    const userData = userSnap.data()

    /**
     * 3️⃣ Check OSA role
     */
    if (userData?.role !== "OSA") {
      return NextResponse.json(
        { error: "Not authorized as OSA" },
        { status: 403 }
      )
    }

    /**
     * 4️⃣ Create session cookie
     */
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    })

    ;(await cookies()).set("osa_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("OSA login error:", error)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}
