import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const { requestId, remarks } = await req.json()

    if (!requestId || !remarks) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const requestRef = adminDB.collection("registration_requests2").doc(requestId)
    const snap = await requestRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    await requestRef.update({
      status: "rejected",
      remarks,
      processedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Reject registration error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}