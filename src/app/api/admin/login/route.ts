import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

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
     * ✅ OPTION A (RECOMMENDED): Custom claim check
     */
    if (decodedToken.role === "admin") {
      return NextResponse.json({ success: true })
    }

    /**
     * ✅ OPTION B (Fallback): Firestore role check
     */
    const userSnap = await adminDB.collection("users").doc(uid).get()

    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Not an admin" },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin login verification failed:", error)

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}
