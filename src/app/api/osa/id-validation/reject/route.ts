import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { buildRejectionEmailHTML } from "@/lib/email-templates/validation-rejection-email"

let rateLimiters: any = null
let checkRateLimit: any = null
let createRateLimitHeaders: any = null

try {
  const rateLimitModule = require("@/lib/rate-limit")
  rateLimiters = rateLimitModule.rateLimiters
  checkRateLimit = rateLimitModule.checkRateLimit
  createRateLimitHeaders = rateLimitModule.createRateLimitHeaders
} catch (error) {
  console.warn("⚠️ Rate limiting not available (Upstash not configured)")
}

export async function POST(req: Request) {
  try {
    const { requestId, rejectRemarks } = await req.json()

    if (!requestId || !rejectRemarks) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      )
    }

    console.log("📝 Reject request:", { requestId, rejectRemarks })

    // 🔐 OSA/Admin session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("osa_session")?.value

    if (!adminSession) {
      console.error("❌ No admin/OSA session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let adminUserId: string
    let reviewerName: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      reviewerName = adminUser.displayName || adminUser.email || "OSA Staff"
      console.log("✅ Reviewer authenticated:", reviewerName)
    } catch (authError: any) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // 📄 Fetch validation request
    const requestRef = adminDB.collection("validation_requests2").doc(requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      console.error("❌ Request not found:", requestId)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const requestData = requestSnap.data()!
    console.log("📄 Request data:", requestData)

    if (requestData.status !== "pending") {
      console.error("❌ Request already processed:", requestData.status)
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      )
    }

    const studentId = requestData.studentId || requestData.studentNumber || requestData.tup_id || requestData.student_id
    const tupId = requestData.tupId || requestData.tup_id || requestData.studentNumber || studentId
    const studentName = requestData.studentName || requestData.name || "Student"
    const studentEmail = requestData.email

    if (!studentEmail) {
      console.error("❌ Student email not found in request data")
      return NextResponse.json(
        { error: "Student email not found in request" },
        { status: 400 }
      )
    }

    console.log("👤 Student ID:", studentId, "TUP ID:", tupId)

    // 📖 Fetch current semester for history entry
    const semesterSnap = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get()
    const currentSemester = semesterSnap.exists ? semesterSnap.data() : null

    const now = new Date()

    // 🚀 Batch writes
    const batch = adminDB.batch()

    // Update validation request status
    batch.update(requestRef, {
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      rejectRemarks,
      reviewedBy: reviewerName,
    })

    // 📋 Copy student info to rejected_validation collection (without images)
    const rejectedRef = adminDB.collection("rejected_validation").doc()
    batch.set(rejectedRef, {
      studentId: studentId || null,
      tupId: tupId || null,
      studentName: studentName || null,
      email: studentEmail || null,
      phoneNumber: requestData.phoneNumber || requestData.phone || null,
      course: requestData.course || null,
      section: requestData.section || null,
      yearLevel: requestData.yearLevel || requestData.year || null,
      rejectRemarks,
      rejectedAt: now,
      rejectedBy: reviewerName,
      originalRequestId: requestId,
      requestTime: requestData.requestTime || null,
      createdAt: now,
    })

    // ✅ Write validation history — request rejected
    const historyRef = adminDB
      .collection("student_profiles")
      .doc(studentId)
      .collection("validation_history")
      .doc()

    batch.set(historyRef, {
      semester: currentSemester?.semester ?? "",
      schoolYear: currentSemester?.schoolYear ?? "",
      status: "rejected",
      date: FieldValue.serverTimestamp(),
      reviewedBy: reviewerName,
      remarks: rejectRemarks,
    })

    // 📧 Trigger rejection email
    if (studentEmail) {
      const rejectedAtFormatted = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      const emailHTML = buildRejectionEmailHTML({
        studentName,
        studentId: tupId,
        rejectRemarks,
        rejectedBy: reviewerName,
        rejectedAt: rejectedAtFormatted,
      })

      const mailRef = adminDB.collection("mail").doc()
      batch.set(mailRef, {
        to: studentEmail,
        message: {
          subject: "TUP SIIVS - ID Validation Request Update",
          html: emailHTML,
        },
      })

      console.log("✅ Rejection email queued for:", studentEmail)
    } else {
      console.warn("⚠️ No email found for student, skipping email send")
    }

    console.log("💾 Committing batch write...")
    await batch.commit()
    console.log("✅ Rejection processed, history written, email queued")

    return NextResponse.json({
      success: true,
      rejectedDocId: rejectedRef.id,
    }, {
      status: 200,
    })

  } catch (error: any) {
    console.error("🔥 REJECT ERROR:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    )
  }
} 