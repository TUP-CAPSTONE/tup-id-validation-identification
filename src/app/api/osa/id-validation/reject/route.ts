import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const { requestId, rejectRemarks } = await req.json()

    if (!requestId || !rejectRemarks) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      )
    }

    await adminDB
      .collection("validation_requests2")
      .doc(requestId)
      .update({
        status: "rejected",
        rejectedAt: FieldValue.serverTimestamp(),
        rejectRemarks,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
