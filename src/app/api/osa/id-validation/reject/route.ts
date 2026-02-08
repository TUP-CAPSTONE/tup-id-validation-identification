import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { buildRejectionEmailHTML } from "@/lib/email-templates/validation-rejection-email"

// Optional: Import rate limiting only if Upstash is configured
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

    // ⚡ Rate limiting (optional - only if Upstash configured)
    let rateLimitResult: any = null
    if (rateLimiters && checkRateLimit) {
      try {
        rateLimitResult = await checkRateLimit(
          rateLimiters.rejectValidation,
          `osa:${adminUserId}`
        )

        if (!rateLimitResult.success) {
          return NextResponse.json(
            { 
              error: "Too many requests. Please wait before rejecting more requests.",
              retryAfter: rateLimitResult.reset - Date.now()
            },
            { 
              status: 429,
              headers: {
                ...createRateLimitHeaders(rateLimitResult),
                'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
              }
            }
          )
        }
      } catch (rateLimitError) {
        console.warn("⚠️ Rate limit check failed (continuing anyway):", rateLimitError)
      }
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

    // Try multiple field names for student ID and TUP ID
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
    // Auto-generate document ID for multiple rejection history
    const rejectedRef = adminDB.collection("rejected_validation").doc()
    
    batch.set(rejectedRef, {
      // Student Information (no images)
      studentId: studentId || null,
      tupId: tupId || null,
      studentName: studentName || null,
      email: studentEmail || null,
      phoneNumber: requestData.phoneNumber || requestData.phone || null,
      course: requestData.course || null,
      section: requestData.section || null,
      yearLevel: requestData.yearLevel || requestData.year || null,
      
      // Rejection Details
      rejectRemarks,
      rejectedAt: now,
      rejectedBy: reviewerName,
      
      // Reference to original request
      originalRequestId: requestId,
      requestTime: requestData.requestTime || null,
      
      // Metadata
      createdAt: now,
    })

    // 📧 Trigger rejection email via Firebase Extension
    if (studentEmail) {
      // Format rejection date
      const rejectedAtFormatted = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      // Build email HTML - use TUP ID for display
      const emailHTML = buildRejectionEmailHTML({
        studentName,
        studentId: tupId, // Use TUP ID for display in email
        rejectRemarks,
        rejectedBy: reviewerName,
        rejectedAt: rejectedAtFormatted,
      })

      // Add email to Firebase mail collection (will be picked up by extension)
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
    console.log("✅ Rejection processed, saved to rejected_validation, and email queued")

    const responseHeaders = rateLimitResult && createRateLimitHeaders 
      ? createRateLimitHeaders(rateLimitResult) 
      : {}

    return NextResponse.json({ 
      success: true,
      rejectedDocId: rejectedRef.id
    }, {
      headers: responseHeaders
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