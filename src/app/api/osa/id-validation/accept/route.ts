import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import {
  generateQRToken,
  createQRData,
  generateQRCodeImage,
  calculateExpirationDate,
} from "@/lib/qr-utils"
import { buildValidationEmailHTML } from "@/lib/email-templates/validation-accept-email"
import { assignClaimSchedule } from "@/lib/schedule-utils"

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
    const { requestId } = await req.json()

    const QR_EXPIRATION_DAYS = 2

    console.log("📝 Accept request:", { requestId })

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    // 🔐 OSA/Admin session check
    const cookieStore = await cookies()
    const adminSession =
      cookieStore.get("admin_session")?.value ||
      cookieStore.get("osa_session")?.value

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let adminUserId: string
    let adminName: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      adminName = adminUser.displayName || adminUser.email || "Admin"
      console.log("✅ OSA authenticated:", adminName)
    } catch (authError: any) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // ⚡ Rate limiting (optional)
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
              retryAfter: rateLimitResult.reset - Date.now(),
            },
            {
              status: 429,
              headers: {
                ...createRateLimitHeaders(rateLimitResult),
                "Retry-After": Math.ceil(
                  (rateLimitResult.reset - Date.now()) / 1000
                ).toString(),
              },
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
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const requestData = requestSnap.data()!

    if (requestData.status !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }

    const studentId =
      requestData.studentId ||
      requestData.studentNumber ||
      requestData.tup_id ||
      requestData.student_id
    const tupId =
      requestData.tupId ||
      requestData.tup_id ||
      requestData.studentNumber ||
      studentId
    const studentName = requestData.studentName || requestData.name || "Student"
    const studentEmail = requestData.email
    const course = requestData.course || "N/A"
    const section = requestData.section || "N/A"

    if (!studentId) {
      return NextResponse.json({ error: "Student ID not found in request" }, { status: 400 })
    }

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email not found in request" }, { status: 400 })
    }

    // 📅 Assign sticker claiming schedule (FCFS)
    const scheduleResult = await assignClaimSchedule()

    if (!scheduleResult.success) {
      // Return the specific error reason so the dialog can show the right message
      return NextResponse.json(
        { error: "no_claim_slots", detail: scheduleResult.error },
        { status: 409 }
      )
    }

    const claimSchedule = scheduleResult.schedule
    console.log("📅 Assigned claim schedule:", claimSchedule.slotKey)

    // 🎫 Generate QR Code (2-day expiration)
    const qrToken = generateQRToken()
    const qrData = createQRData(studentId, qrToken)

    let qrCodeDataURL: string
    try {
      qrCodeDataURL = await generateQRCodeImage(qrData)
    } catch (qrError: any) {
      return NextResponse.json(
        { error: "Failed to generate QR code: " + qrError.message },
        { status: 500 }
      )
    }

    const expirationDate = calculateExpirationDate(QR_EXPIRATION_DAYS)
    const now = new Date()

    // 🚀 Batch writes
    const batch = adminDB.batch()

    const qrCodeRef = adminDB.collection("validation_qr_codes").doc()
    batch.set(qrCodeRef, {
      studentId,
      qrToken,
      expiresAt: expirationDate,
      isUsed: false,
      createdAt: now,
      studentInfo: { tupId, name: studentName, course, section },
      claimSchedule: {
        slotKey: claimSchedule.slotKey,
        date: claimSchedule.date,
        dateLabel: claimSchedule.dateLabel,
        timeSlotLabel: claimSchedule.timeSlot.label,
      },
    })

    batch.update(requestRef, {
      status: "accepted",
      acceptedAt: FieldValue.serverTimestamp(),
      rejectRemarks: null,
      reviewedBy: adminName,
      qrCodeId: qrCodeRef.id,
      expiresAt: expirationDate,
      claimSchedule: {
        slotKey: claimSchedule.slotKey,
        date: claimSchedule.date,
        dateLabel: claimSchedule.dateLabel,
        timeSlotLabel: claimSchedule.timeSlot.label,
      },
    })

    const studentProfileRef = adminDB.collection("student_profiles").doc(studentId)
    batch.update(studentProfileRef, {
      isValidated: true,
      lastValidatedAt: now,
      lastValidatedBy: adminName,
    })

    const validationRules = [
      "Save or print this email containing your QR code",
      `<b>Report to the Office of Student Affairs (OSA) on your assigned schedule:</b><br/>📅 <b>${claimSchedule.dateLabel}</b><br/>⏰ <b>${claimSchedule.timeSlot.label}</b>`,
      "Present your original Student ID and Certificate of Registration (COR)",
      "Show this QR code to the OSA staff for scanning to claim your ID sticker",
      `⚠️ This QR code expires on <b>${expirationDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</b>. Claim your sticker within your assigned schedule.`,
    ]

    const emailHTML = buildValidationEmailHTML({
      studentName,
      studentId: tupId,
      expirationDate: expirationDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      validationRules,
      claimSchedule: {
        dateLabel: claimSchedule.dateLabel,
        timeSlotLabel: claimSchedule.timeSlot.label,
      },
    })

    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "")

    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: "ID Validation Approved – Your Sticker Claiming Schedule",
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

    await batch.commit()
    console.log("✅ Batch write successful")

    const responseHeaders =
      rateLimitResult && createRateLimitHeaders
        ? createRateLimitHeaders(rateLimitResult)
        : {}

    return NextResponse.json(
      {
        success: true,
        qrCodeId: qrCodeRef.id,
        expiresAt: expirationDate.toISOString(),
        claimSchedule: {
          dateLabel: claimSchedule.dateLabel,
          timeSlotLabel: claimSchedule.timeSlot.label,
          slotKey: claimSchedule.slotKey,
        },
      },
      { headers: responseHeaders }
    )
  } catch (error: any) {
    console.error("🔥 ACCEPT ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}