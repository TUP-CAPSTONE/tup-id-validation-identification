import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const { uid } = await req.json()

    if (!uid) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      )
    }

    // 1. Delete from Firebase Authentication
    await adminAuth.deleteUser(uid)

    // 2. Delete from Firestore
    await adminDB.collection("users").doc(uid).delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete OSA error:", error)
    return NextResponse.json(
      { error: "Failed to delete OSA account" },
      { status: 500 }
    )
  }
}
