import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, name } = body

    if (!uid || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    /**
     * ✅ Update Firebase Auth (display name)
     */
    await adminAuth.updateUser(uid, {
      displayName: name,
    })

    /**
     * ✅ Update Firestore user document
     */
    await adminDB.collection("users").doc(uid).update({
      name,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Edit OSA error:", error)

    return NextResponse.json(
      { error: "Failed to update OSA account" },
      { status: 500 }
    )
  }
}
