import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { buildRejectionEmailHTML } from "@/lib/email-templates/validation-rejection-email"
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { requestId, rejectRemarks } = await req.json()

    if (!requestId || !rejectRemarks) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      )
    }

    console.log("📝 [ADMIN] Reject request:", { requestId, rejectRemarks })

    // 🔐 ADMIN-ONLY session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
      console.error("❌ No admin session found")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let adminUserId: string
    let adminName: string
    let adminRole: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      adminName = adminUser.displayName || adminUser.email || "Admin"
      
      // Verify admin role
      const adminDoc = await adminDB.collection("users").doc(adminUserId).get()
      if (!adminDoc.exists) {
        console.error("❌ Admin document not found:", adminUserId)
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }
      
      adminRole = adminDoc.data()?.role
      if (adminRole !== "admin") {
        console.error("❌ User is not an admin:", adminUserId, "Role:", adminRole)
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }
      
      console.log("✅ Admin authenticated:", adminName)
    } catch (authError: any) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // ⚡ Rate limiting
    const rateLimitResult = await checkRateLimit(
      rateLimiters.acceptValidation,
      `admin:reject:${adminUserId}`
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
      reviewedBy: adminName,
      reviewedByRole: "admin", // Track that admin rejected this
    })

    // 📋 Copy student info to rejected_validation collection
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
      rejectedBy: adminName,
      rejectedByRole: "admin", // Track rejection source
      
      // Reference to original request
      originalRequestId: requestId,
      requestTime: requestData.requestTime || null,
      
      // Metadata
      createdAt: now,
    })

    // 📊 Log admin action
    const actionLogRef = adminDB.collection("admin_action_logs").doc()
    batch.set(actionLogRef, {
      action: "reject_validation_request",
      performedBy: adminName,
      performedById: adminUserId,
      performedByRole: "admin",
      targetRequestId: requestId,
      targetStudentId: studentId,
      targetStudentName: studentName,
      targetStudentEmail: studentEmail,
      rejectRemarks,
      timestamp: FieldValue.serverTimestamp(),
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
        rejectedBy: adminName,
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
    }

    console.log("💾 Committing batch write...")
    await batch.commit()
    console.log("✅ [ADMIN] Rejection processed and logged")

    return NextResponse.json({ 
      success: true,
      rejectedDocId: rejectedRef.id
    }, {
      status: 200,
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: any) {
    console.error("🔥 [ADMIN] REJECT ERROR:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    )
  }
}