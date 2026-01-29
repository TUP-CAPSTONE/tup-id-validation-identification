import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

export async function PATCH(req: Request) {
  try {
    const body = await req.json()

    const {
      id,
      resolutionNotes,

      // ✅ ADDED
      resolvedByName,
      resolvedByUid,
      resolvedByEmail,
    } = body

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Missing report id." },
        { status: 400 }
      )
    }

    if (!resolutionNotes || resolutionNotes.trim().length < 5) {
      return NextResponse.json(
        { error: "Resolution notes are required." },
        { status: 400 }
      )
    }

    if (!resolvedByUid) {
      return NextResponse.json(
        { error: "Admin information missing." },
        { status: 400 }
      )
    }

    const ref = adminDB
      .collection("feedback_reports")
      .doc(id)

    const snap = await ref.get()

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      )
    }

    await ref.update({
      status: "resolved",
      resolvedAt: new Date(),
      resolutionNotes: resolutionNotes.trim(),

      // ✅ ADDED
      resolvedByName,
      resolvedByUid,
      resolvedByEmail,

      updatedAt: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(
      "PATCH resolve bug report error:",
      err
    )
    return NextResponse.json(
      { error: "Server error." },
      { status: 500 }
    )
  }
}
