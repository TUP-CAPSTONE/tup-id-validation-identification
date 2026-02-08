import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"
import { parseQRData, isQRExpired } from "@/lib/qr-utils"
import { 
  rateLimiters, 
  checkRateLimit, 
  createRateLimitHeaders 
} from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const { qrString } = await req.json()

    if (!qrString) {
      return NextResponse.json({ error: "Missing QR data" }, { status: 400 })
    }

    // ⚡ Rate limiting by IP - 30 verifications per minute
    const forwarded = req.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : "unknown"
    
    const rateLimitResult = await checkRateLimit(
      rateLimiters.verifyQR,
      `verify:${ip}`
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many verification attempts. Please wait.",
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

    // Parse QR data
    const qrData = parseQRData(qrString)
    
    if (!qrData) {
      return NextResponse.json(
        { error: "Invalid QR code format" },
        { status: 400 }
      )
    }

    const { token, studentId } = qrData

    // Find QR code in database
    const qrCodesSnapshot = await adminDB
      .collection("validation_qr_codes")
      .where("qrToken", "==", token)
      .where("studentId", "==", studentId)
      .limit(1)
      .get()

    if (qrCodesSnapshot.empty) {
      return NextResponse.json(
        { error: "QR code not found or invalid" },
        { status: 404 }
      )
    }

    const qrCodeDoc = qrCodesSnapshot.docs[0]
    const qrCodeData = qrCodeDoc.data()

    // Check if already used
    if (qrCodeData.isUsed) {
      return NextResponse.json(
        { error: "This QR code has already been used" },
        { status: 400 }
      )
    }

    // Check expiration
    const expiresAt = qrCodeData.expiresAt.toDate()
    if (isQRExpired(expiresAt)) {
      return NextResponse.json(
        { 
          error: "QR code has expired",
          expiredAt: expiresAt.toISOString()
        },
        { status: 400 }
      )
    }

    // Fetch student profile with photo
    const studentProfileRef = adminDB.collection("student_profiles").doc(studentId)
    const studentProfileSnap = await studentProfileRef.get()

    if (!studentProfileSnap.exists) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      )
    }

    const studentProfile = studentProfileSnap.data()!

    // Return student information
    return NextResponse.json({
      success: true,
      qrCodeId: qrCodeDoc.id,
      student: {
        id: studentId,
        tupId: qrCodeData.studentInfo.tupId || studentId, // Include TUP ID
        name: qrCodeData.studentInfo.name,
        course: qrCodeData.studentInfo.course,
        section: qrCodeData.studentInfo.section,
        email: studentProfile.email,
        phone: studentProfile.phone || "N/A",
        profilePicture: studentProfile.profilePicture || null,
        isValidated: studentProfile.isValidated || false,
      },
      expiresAt: expiresAt.toISOString(),
    }, {
      headers: createRateLimitHeaders(rateLimitResult)
    })

  } catch (error: any) {
    console.error("🔥 VERIFY QR ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}