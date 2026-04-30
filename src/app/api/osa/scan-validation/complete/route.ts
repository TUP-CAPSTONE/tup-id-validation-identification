import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import {
  rateLimiters,
  checkRateLimit,
  createRateLimitHeaders
} from "@/lib/rate-limit"
import { buildValidationCompleteEmailHTML } from "@/lib/email-templates/validation-complete-email"

export async function POST(req: Request) {
  try {
    const { qrCodeId, studentId, requirementsComplete } = await req.json()

    if (!qrCodeId || !studentId || typeof requirementsComplete !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!requirementsComplete) {
      return NextResponse.json({
        success: true,
        validated: false,
        message: "Requirements incomplete. Student not validated.",
      })
    }

    // ── OSA auth ──────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const osaSession = cookieStore.get("osa_session")?.value

    if (!osaSession) {
      return NextResponse.json(
        { error: "OSA access required. Only OSA staff can scan QR codes." },
        { status: 403 }
      )
    }

    const decoded = await adminAuth.verifySessionCookie(osaSession, true)
    const osaUserId = decoded.uid

    const userDoc = await adminDB.collection("users").doc(osaUserId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()!
    const userRole = userData.role?.toUpperCase()

    if (userRole !== "OSA") {
      return NextResponse.json(
        { error: "OSA access required. Only OSA staff can scan QR codes." },
        { status: 403 }
      )
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(
      rateLimiters.completeValidation,
      `osa:${osaUserId}:complete`
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait.",
          retryAfter: rateLimitResult.reset - Date.now(),
        },
        {
          status: 429,
          headers: {
            ...createRateLimitHeaders(rateLimitResult),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const osaUser = await adminAuth.getUser(osaUserId)
    const osaName = osaUser.displayName || osaUser.email || "OSA Staff"
    console.log(`✅ QR Scanned by OSA: ${osaName}`)

    // ── QR code validation ────────────────────────────────────────────────────
    const qrCodeRef = adminDB.collection("validation_qr_codes").doc(qrCodeId)
    const qrCodeSnap = await qrCodeRef.get()

    if (!qrCodeSnap.exists) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 })
    }

    const qrCodeData = qrCodeSnap.data()!

    if (qrCodeData.isUsed) {
      return NextResponse.json({ error: "QR code has already been used" }, { status: 400 })
    }

    if (qrCodeData.studentId !== studentId) {
      return NextResponse.json({ error: "Student ID mismatch" }, { status: 400 })
    }

    // ── Fetch semester + student profile in parallel ───────────────────────────
    const [semesterSnap, studentProfileSnap] = await Promise.all([
      adminDB.collection("system_settings").doc("currentSemester").get(),
      adminDB.collection("student_profiles").doc(studentId).get(),
    ])

    const currentSemester = semesterSnap.exists ? semesterSnap.data() : null
    const studentProfile = studentProfileSnap.data()

    const studentEmail = studentProfile?.email
    const studentName = studentProfile?.fullName ?? "Student"
    const studentTupId = studentProfile?.studentNumber ?? studentId 
    const semester = currentSemester?.semester ?? ""
    const schoolYear = currentSemester?.schoolYear ?? ""

    // ── Batch write ───────────────────────────────────────────────────────────
    const now = new Date()
    const batch = adminDB.batch()

    const studentProfileRef = adminDB.collection("student_profiles").doc(studentId)
    batch.update(studentProfileRef, {
      isValidated: true,
      validatedAt: FieldValue.serverTimestamp(),
      validatedBy: osaName,
      validatedByRole: "osa",
    })

    batch.update(qrCodeRef, {
      isUsed: true,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: osaName,
      usedByRole: "osa",
    })

    batch.set(adminDB.collection("validation_logs").doc(), {
      studentId,
      qrCodeId,
      validatedBy: osaName,
      validatedByRole: "osa",
      validatedAt: now,
      method: "qr_scan",
    })

    const historyRef = adminDB
      .collection("student_profiles")
      .doc(studentId)
      .collection("validation_history")
      .doc()

    batch.set(historyRef, {
      semester,
      schoolYear,
      status: "validated",
      date: FieldValue.serverTimestamp(),
      validatedBy: osaName,
      remarks: null,
    })

    // ── Queue congratulatory email via Firebase trigger-email ─────────────────
    if (studentEmail) {
      const html = buildValidationCompleteEmailHTML({
        studentName,
        studentId: studentTupId,
        validatedBy: osaName,
        semester,
        schoolYear,
      })

      batch.set(adminDB.collection("mail").doc(), {
        to: studentEmail,
        message: {
          subject: "🎉 Your TUP Student ID is Now Validated!",
          html,
          // No QR attachment needed — validation is already done
        },
      })
    } else {
      console.warn(`⚠️ No email found for studentId: ${studentId} — skipping email`)
    }

    await batch.commit()

    return NextResponse.json(
      {
        success: true,
        validated: true,
        message: "Student successfully validated",
      },
      { headers: createRateLimitHeaders(rateLimitResult) }
    )
  } catch (error: any) {
    console.error("🔥 COMPLETE VALIDATION ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}