import { NextResponse } from "next/server"
import { adminDB, adminAuth } from "@/lib/firebaseAdmin"

function isNumberedSteps(text: string) {
  const trimmed = (text || "").trim()
  if (!trimmed) return false

  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  let numberedCount = 0
  for (const line of lines) {
    if (/^\d+[\.\)]\s+/.test(line)) numberedCount++
  }

  return numberedCount >= 2
}

export async function POST(req: Request) {
  try {
    // ✅ verify token
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: missing token." },
        { status: 401 }
      )
    }

    const decoded = await adminAuth.verifyIdToken(token)

    const body = await req.json()

    const {
      type,
      senderRole,
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

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Missing title." }, { status: 400 })
    }

    // ✅ always use verified user info
    const senderEmail = decoded.email || ""
    const senderName =
      decoded.name ||
      decoded.email?.split("@")[0]?.replace(/\./g, " ") ||
      "User"

    if (!senderEmail) {
      return NextResponse.json(
        { error: "No email found for this account." },
        { status: 400 }
      )
    }

    const docData: any = {
      type,
      senderRole,
      senderName,
      senderEmail,
      uid: decoded.uid,

      title,
      status: "open",
      createdAt: new Date(),
    }

    if (type === "feedback") {
      if (!experience || experience.trim().length < 10) {
        return NextResponse.json(
          { error: "Feedback is too short." },
          { status: 400 }
        )
      }

      docData.rating = Number(rating ?? 5)
      docData.category = category ?? "overall"
      docData.experience = experience
      docData.suggestions = suggestions ?? ""
    }

    if (type === "bug") {
      if (!stepsToReproduce || stepsToReproduce.trim().length < 10) {
        return NextResponse.json(
          { error: "Steps to reproduce is required." },
          { status: 400 }
        )
      }

      // ✅ enforce numbering for bug steps
      if (!isNumberedSteps(stepsToReproduce)) {
        return NextResponse.json(
          {
            error:
              "Steps to reproduce must be numbered (example: 1. step 2. step).",
          },
          { status: 400 }
        )
      }

      if (!expectedBehavior || expectedBehavior.trim().length < 5) {
        return NextResponse.json(
          { error: "Expected behavior is required." },
          { status: 400 }
        )
      }

      if (!actualBehavior || actualBehavior.trim().length < 5) {
        return NextResponse.json(
          { error: "Actual behavior is required." },
          { status: 400 }
        )
      }

      docData.bugSeverity = bugSeverity ?? "medium"
      docData.stepsToReproduce = stepsToReproduce
      docData.expectedBehavior = expectedBehavior
      docData.actualBehavior = actualBehavior
      docData.deviceInfo = deviceInfo ?? ""
    }

    await adminDB.collection("feedback_reports").add(docData)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("POST /api/send-feedback-reports error:", err)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
