import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    await adminDB
      .collection("validation_requests2")
      .doc(requestId)
      .update({
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
        rejectRemarks: null,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
