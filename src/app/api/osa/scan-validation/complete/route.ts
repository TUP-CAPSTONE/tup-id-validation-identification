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

    // 🔐 OSA-ONLY ACCESS: Only OSA accounts can scan QR codes
    const cookieStore = await cookies()
    
    // ONLY check OSA session - ignore admin session completely
    const osaSession = cookieStore.get("osa_session")?.value

    if (!osaSession) {
      return NextResponse.json({ 
        error: "OSA access required. Only OSA staff can scan QR codes." 
      }, { status: 403 })
    }

    const decoded = await adminAuth.verifySessionCookie(osaSession, true)
    const osaUserId = decoded.uid

    // Verify the user is actually OSA (not admin using wrong session)
    const userDoc = await adminDB.collection("users").doc(osaUserId).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 })
    }

    const userData = userDoc.data()!
    const userRole = userData.role?.toUpperCase()

    // ENFORCE OSA ROLE - even if they somehow have an OSA session
    if (userRole !== "OSA") {
      return NextResponse.json({ 
        error: "OSA access required. Only OSA staff can scan QR codes." 
      }, { status: 403 })
    }

    // ⚡ Rate limiting - 20 completions per minute per OSA user
    const rateLimitResult = await checkRateLimit(
      rateLimiters.completeValidation,
      `osa:${osaUserId}:complete`
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

    const osaUser = await adminAuth.getUser(osaUserId)
    const osaName = osaUser.displayName || osaUser.email || "OSA Staff"

    console.log(`✅ QR Scanned by OSA: ${osaName}`)

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
      validatedBy: osaName,
      validatedByRole: "osa", // Always OSA for QR scanning
    })

    // Mark QR code as used
    batch.update(qrCodeRef, {
      isUsed: true,
      usedAt: FieldValue.serverTimestamp(),
      usedBy: osaName,
      usedByRole: "osa", // Always OSA for QR scanning
    })

    // Create validation log (optional but recommended for audit trail)
    batch.set(adminDB.collection("validation_logs").doc(), {
      studentId,
      qrCodeId,
      validatedBy: osaName,
      validatedByRole: "osa", // Always OSA for QR scanning
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