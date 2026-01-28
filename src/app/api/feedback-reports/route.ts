import { NextResponse } from "next/server"
import { adminDB, adminAuth } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      type,
      senderRole,
      senderName,
      senderEmail,
      title,

      // feedback
      rating,
      category,
      experience,
      suggestions,

      // bug
      bugSeverity,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      deviceInfo,
    } = body

    if (!type || !senderRole) {
      return NextResponse.json({ error: "Invalid report type." }, { status: 400 })
    }

    if (!senderName || !senderEmail || !title) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // Optional: Verify user auth if you're using Firebase auth cookies / bearer token
    // (If you want strict auth, tell me and I'll add token verification here)

    const docData: any = {
      type,
      senderRole,
      senderName,
      senderEmail,
      title,
      status: "open",
      createdAt: new Date(),
    }

    if (type === "feedback") {
      if (!experience || experience.trim().length < 10) {
        return NextResponse.json({ error: "Feedback is too short." }, { status: 400 })
      }
      docData.rating = Number(rating ?? 5)
      docData.category = category ?? "overall"
      docData.experience = experience
      docData.suggestions = suggestions ?? ""
    }

    if (type === "bug") {
      if (!stepsToReproduce || stepsToReproduce.trim().length < 10) {
        return NextResponse.json({ error: "Steps to reproduce is required." }, { status: 400 })
      }
      docData.bugSeverity = bugSeverity ?? "medium"
      docData.stepsToReproduce = stepsToReproduce
      docData.expectedBehavior = expectedBehavior ?? ""
      docData.actualBehavior = actualBehavior ?? ""
      docData.deviceInfo = deviceInfo ?? ""
    }

    await adminDB.collection("feedback_reports").add(docData)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/feedback-reports error:", err)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
