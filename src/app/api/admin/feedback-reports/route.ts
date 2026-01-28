import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

export async function GET() {
  try {
    const snapshot = await adminDB
      .collection("feedback_reports")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get()

    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ reports })
  } catch (err) {
    console.error("GET admin feedback reports error:", err)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
