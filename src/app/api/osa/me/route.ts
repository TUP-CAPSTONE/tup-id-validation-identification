import { cookies } from "next/headers"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = (await cookies()).get("osa_session")?.value
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifySessionCookie(session, true)
    const userSnap = await adminDB.collection("users").doc(decoded.uid).get()

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(userSnap.data())
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
