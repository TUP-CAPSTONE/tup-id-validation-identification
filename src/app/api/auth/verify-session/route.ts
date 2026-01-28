import { NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No session cookie" },
        { status: 401 }
      )
    }

    /**
     * Verify the session cookie
     */
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    return NextResponse.json({ valid: true, uid: decodedClaims.uid })
  } catch (error) {
    console.error("Session verification failed:", error)
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    )
  }
}
