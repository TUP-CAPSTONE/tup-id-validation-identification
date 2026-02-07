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
import { buildValidationEmailHTML } from "@/lib/email-templates/validation-email"

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
    const { requestId, expirationDays = 7 } = await req.json()

    console.log("📝 Accept request:", { requestId, expirationDays })

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    // Validate expiration days (1-30 days)
    const validExpirationDays = Math.min(Math.max(expirationDays, 1), 30)

    // 🔐 OSA/Admin session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("osa_session")?.value

    if (!adminSession) {
      console.error("❌ No admin/OSA session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let adminUserId: string
    let adminName: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      adminName = adminUser.displayName || adminUser.email || "Admin"
      console.log("✅ Admin authenticated:", adminName)
    } catch (authError: any) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // ⚡ Rate limiting (optional - only if Upstash configured)
    let rateLimitResult: any = null
    if (rateLimiters && checkRateLimit) {
      try {
        rateLimitResult = await checkRateLimit(
          rateLimiters.acceptValidation,
          `osa:${adminUserId}`
        )

        if (!rateLimitResult.success) {
          return NextResponse.json(
            { 
              error: "Too many requests. Please wait before accepting more requests.",
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

    // Try multiple field names for student ID
    const studentId = requestData.studentId || requestData.studentNumber || requestData.tup_id || requestData.student_id
    const tupId = requestData.tupId || requestData.tup_id || requestData.studentNumber || studentId
    const studentName = requestData.studentName || requestData.name || "Student"
    const studentEmail = requestData.email
    const course = requestData.course || "N/A"
    const section = requestData.section || "N/A"

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

    // 🎫 Generate QR Code
    console.log("🎫 Generating QR code...")
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
    console.log("⏰ Expiration date:", expirationDate)

    const now = new Date()

    // 🚀 Batch writes
    const batch = adminDB.batch()

    // Store QR code data
    const qrCodeRef = adminDB.collection("validation_qr_codes").doc()
    batch.set(qrCodeRef, {
      studentId,
      qrToken,
      expiresAt: expirationDate,
      isUsed: false,
      createdAt: now,
      studentInfo: {
        name: studentName,
        course,
        section,
      },
    })

    // Update validation request
    batch.update(requestRef, {
      status: "accepted",
      acceptedAt: FieldValue.serverTimestamp(),
      rejectRemarks: null,
      reviewedBy: adminName,
      qrCodeId: qrCodeRef.id,
      expiresAt: expirationDate,
    })

    // 📩 Prepare email
    const validationRules = [
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
      studentId: tupId, // Use TUP ID for display
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
    // Extract base64 data from data URL
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "")
    
    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: "ID Validation Approved - Action Required",
        html: emailHTML,
        attachments: [
          {
            filename: "validation-qr-code.png",
            content: base64Data,
            encoding: "base64",
            cid: "qrcode@validation", // Content ID for inline display
          },
        ],
      },
    })

    console.log("💾 Committing batch write...")
    await batch.commit()
    console.log("✅ Batch write successful")

    const responseHeaders = rateLimitResult && createRateLimitHeaders 
      ? createRateLimitHeaders(rateLimitResult) 
      : {}

    return NextResponse.json({ 
      success: true,
      qrCodeId: qrCodeRef.id,
      expiresAt: expirationDate.toISOString()
    }, {
      headers: responseHeaders
    })

  } catch (error: any) {
    console.error("🔥 ACCEPT ERROR:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}