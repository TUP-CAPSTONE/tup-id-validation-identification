import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { 
  generateQRToken, 
  createQRData, 
  generateQRCodeImage,
  calculateExpirationDate 
} from "@/lib/qr-utils"
import { buildValidationEmailHTML } from "@/lib/email-templates/validation-accept-email"
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { requestId, expirationDays = 7 } = await req.json()

    console.log("📝 Resend QR request:", { requestId, expirationDays })

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    // Validate expiration days (1-30 days)
    const validExpirationDays = Math.min(Math.max(expirationDays, 1), 30)

    // 🔐 Admin-only session check (OSA cannot resend)
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
      console.error("❌ No admin session found")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let adminUserId: string
    let adminName: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      adminName = adminUser.displayName || adminUser.email || "Admin"
      
      // Verify admin role in Firestore
      const adminDoc = await adminDB.collection("users").doc(adminUserId).get()
      if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
        console.error("❌ User is not an admin:", adminUserId)
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }
      
      console.log("✅ Admin authenticated:", adminName)
    } catch (authError: any) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // ⚡ Rate limiting - 20 resends per hour per admin
    const rateLimitResult = await checkRateLimit(
      rateLimiters.acceptValidation, // Reusing existing limiter
      `admin:resend:${adminUserId}`
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait before resending more QR codes.",
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

    if (requestData.status !== "accepted") {
      console.error("❌ Request must be in 'accepted' status:", requestData.status)
      return NextResponse.json(
        { error: "Only accepted requests can have QR codes resent" },
        { status: 400 }
      )
    }

    // Get student information
    const studentId = requestData.studentId || requestData.studentNumber || requestData.tup_id || requestData.student_id
    const tupId = requestData.tupId || requestData.tup_id || requestData.studentNumber || studentId
    const studentName = requestData.studentName || requestData.name || "Student"
    
    // Try to get email from request data, or fetch from students collection
    let studentEmail = requestData.email
    let course = requestData.course || "N/A"
    let section = requestData.section || "N/A"
    
    // If email not in request, try to fetch from students collection
    if (!studentEmail) {
      try {
        const studentDoc = await adminDB.collection("students").doc(studentId).get()
        if (studentDoc.exists) {
          const studentData = studentDoc.data()!
          studentEmail = studentData.email || studentData.emailAddress
          if (!course || course === "N/A") {
            course = studentData.course || "N/A"
          }
          if (!section || section === "N/A") {
            section = studentData.section || "N/A"
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch student data:", err)
      }
    }

    if (!studentId) {
      console.error("❌ Student ID not found in request data:", Object.keys(requestData))
      return NextResponse.json(
        { error: "Student ID not found in request" },
        { status: 400 }
      )
    }

    if (!studentEmail) {
      console.error("❌ Student email not found in request data")
      return NextResponse.json(
        { error: "Student email not found in request" },
        { status: 400 }
      )
    }

    console.log("👤 Student ID:", studentId, "TUP ID:", tupId)
    console.log("📚 Course:", course, "Section:", section)

    // 🎫 Generate NEW QR Code
    console.log("🎫 Generating new QR code...")
    const qrToken = generateQRToken()
    const qrData = createQRData(studentId, qrToken)
    
    let qrCodeDataURL: string
    try {
      qrCodeDataURL = await generateQRCodeImage(qrData)
      console.log("✅ QR code generated successfully")
    } catch (qrError: any) {
      console.error("❌ QR generation failed:", qrError)
      return NextResponse.json(
        { error: "Failed to generate QR code: " + qrError.message },
        { status: 500 }
      )
    }

    const expirationDate = calculateExpirationDate(validExpirationDays)
    console.log("⏰ New expiration date:", expirationDate)

    const now = new Date()

    // 🚀 Batch writes
    const batch = adminDB.batch()

    // Invalidate old QR code if it exists
    if (requestData.qrCodeId) {
      const oldQRRef = adminDB.collection("validation_qr_codes").doc(requestData.qrCodeId)
      batch.update(oldQRRef, {
        isUsed: true,
        invalidatedAt: now,
        invalidatedBy: adminName,
        invalidationReason: "QR code resent by admin"
      })
      console.log("🔄 Invalidating old QR code:", requestData.qrCodeId)
    }

    // Create new QR code document
    const newQRCodeRef = adminDB.collection("validation_qr_codes").doc()
    batch.set(newQRCodeRef, {
      studentId,
      qrToken,
      expiresAt: expirationDate,
      isUsed: false,
      createdAt: now,
      studentInfo: {
        tupId: tupId,
        name: studentName,
        course,
        section,
      },
      resendInfo: {
        isResend: true,
        resentBy: adminName,
        resentAt: now,
        previousQRCodeId: requestData.qrCodeId || null,
      }
    })

    // Update validation request with new QR code info
    batch.update(requestRef, {
      qrCodeId: newQRCodeRef.id,
      expiresAt: expirationDate,
      lastQRResent: {
        resentBy: adminName,
        resentAt: FieldValue.serverTimestamp(),
        expirationDays: validExpirationDays,
      }
    })

    // Log the resend action
    const logRef = adminDB.collection("admin_action_logs").doc()
    batch.set(logRef, {
      action: "resend_validation_qr",
      adminId: adminUserId,
      adminName: adminName,
      targetRequestId: requestId,
      targetStudentId: studentId,
      targetStudentEmail: studentEmail,
      newQRCodeId: newQRCodeRef.id,
      oldQRCodeId: requestData.qrCodeId || null,
      expirationDays: validExpirationDays,
      expirationDate: expirationDate,
      timestamp: FieldValue.serverTimestamp(),
    })

    // 📩 Prepare resend email
    const validationRules = [
      "<b style='color:#ef4444;'>⚠️ This is a NEW QR code replacing your previous one</b>",
      "Save or print this email containing your QR code",
      "Visit the Office of Student Affairs (OSA) during office hours",
      "Present your original Student ID and Certificate of Registration (COR)",
      "Show this QR code to the OSA staff for scanning",
      `Complete the validation process before <b>${expirationDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</b>`,
    ]

    const emailHTML = buildValidationEmailHTML({
      studentName,
      studentId: tupId,
      expirationDate: expirationDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      validationRules,
    })

    // Queue email via Firebase Trigger Email extension
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "")
    
    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: "🔄 NEW Validation QR Code - Previous Code Expired",
        html: emailHTML,
        attachments: [
          {
            filename: "validation-qr-code.png",
            content: base64Data,
            encoding: "base64",
            cid: "qrcode@validation",
          },
        ],
      },
    })

    console.log("💾 Committing batch write...")
    await batch.commit()
    console.log("✅ Batch write successful - QR code resent")

    return NextResponse.json({ 
      success: true,
      message: "QR code successfully resent",
      qrCodeId: newQRCodeRef.id,
      expiresAt: expirationDate.toISOString(),
      studentEmail,
      studentName,
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: any) {
    console.error("🔥 RESEND QR ERROR:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch accepted validation requests
export async function GET(req: Request) {
  try {
    // 🔐 Admin-only session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let adminUserId: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      
      // Verify admin role
      const adminDoc = await adminDB.collection("users").doc(adminUserId).get()
      if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 })
      }
    } catch (authError) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "accepted"
    const limit = parseInt(searchParams.get("limit") || "50")

    // Fetch accepted validation requests
    let query = adminDB.collection("validation_requests2")
      .where("status", "==", status)
      .orderBy("requestTime", "desc")
      .limit(limit)

    const snapshot = await query.get()
    
    const requests = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        studentId: data.studentId,
        tupId: data.tupId,
        studentName: data.studentName,
        email: data.email || "N/A", // Email might not exist
        course: data.course || "N/A", // Course might not exist
        section: data.section || "N/A",
        status: data.status,
        acceptedAt: data.acceptedAt?.toDate().toISOString() || data.requestTime?.toDate().toISOString(),
        expiresAt: data.expiresAt?.toDate().toISOString(),
        qrCodeId: data.qrCodeId,
        reviewedBy: data.reviewedBy,
        lastQRResent: data.lastQRResent ? {
          resentBy: data.lastQRResent.resentBy,
          resentAt: data.lastQRResent.resentAt?.toDate().toISOString(),
          expirationDays: data.lastQRResent.expirationDays,
        } : null,
      }
    })

    return NextResponse.json({ 
      success: true,
      requests,
      count: requests.length,
    })

  } catch (error: any) {
    console.error("🔥 GET ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}