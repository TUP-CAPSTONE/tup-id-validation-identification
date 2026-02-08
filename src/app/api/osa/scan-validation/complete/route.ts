import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { 
  rateLimiters, 
  checkRateLimit, 
  createRateLimitHeaders 
} from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { qrCodeId, studentId, requirementsComplete } = await req.json()

    if (!qrCodeId || !studentId || typeof requirementsComplete !== "boolean") {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    // If requirements not complete, just return success without updating
    if (!requirementsComplete) {
      return NextResponse.json({ 
        success: true,
        validated: false,
        message: "Requirements incomplete. Student not validated."
      })
    }

    // 🔐 OSA/Admin session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("osa_session")?.value

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifySessionCookie(adminSession, true)
    const adminUserId = decoded.uid

    // ⚡ Rate limiting - 20 completions per minute per OSA user
    const rateLimitResult = await checkRateLimit(
      rateLimiters.completeValidation,
      `osa:${adminUserId}:complete`
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait.",
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

    const adminUser = await adminAuth.getUser(adminUserId)
    const adminName = adminUser.displayName || adminUser.email || "OSA Staff"

    // Verify QR code exists and not used
    const qrCodeRef = adminDB.collection("validation_qr_codes").doc(qrCodeId)
    const qrCodeSnap = await qrCodeRef.get()

    if (!qrCodeSnap.exists) {
      return NextResponse.json(
        { error: "QR code not found" },
        { status: 404 }
      )
    }

    const qrCodeData = qrCodeSnap.data()!

    if (qrCodeData.isUsed) {
      return NextResponse.json(
        { error: "QR code has already been used" },
        { status: 400 }
      )
    }

    if (qrCodeData.studentId !== studentId) {
      return NextResponse.json(
        { error: "Student ID mismatch" },
        { status: 400 }
      )
    }

    const now = new Date()

    // 🚀 Batch update
    const batch = adminDB.batch()

    // Update student profile - set isValidated to true
    const studentProfileRef = adminDB.collection("student_profiles").doc(studentId)
    batch.update(studentProfileRef, {
      isValidated: true,
      validatedAt: FieldValue.serverTimestamp(),
      validatedBy: adminName,
    })

    // Mark QR code as used
    batch.update(qrCodeRef, {
      isUsed: true,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: adminName,
    })

    // Create validation log (optional but recommended for audit trail)
    batch.set(adminDB.collection("validation_logs").doc(), {
      studentId,
      qrCodeId,
      validatedBy: adminName,
      validatedAt: now,
      method: "qr_scan",
    })

    await batch.commit()

    return NextResponse.json({ 
      success: true,
      validated: true,
      message: "Student successfully validated"
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: any) {
    console.error("🔥 COMPLETE VALIDATION ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}