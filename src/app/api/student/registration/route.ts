import { NextRequest, NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"
import { getStorage } from "firebase-admin/storage"
import { FieldValue } from "firebase-admin/firestore"
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit"

// Storage bucket for enrollment images
const STORAGE_BUCKET = "tup-id-verification.firebasestorage.app"

// Helper to convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "")
  return Buffer.from(base64Data, "base64")
}

// Helper to extract mime type from base64
function extractMimeType(base64: string): string {
  const match = base64.match(/^data:(image\/\w+);base64,/)
  return match ? match[1] : "image/jpeg"
}

// Upload base64 image to Firebase Storage
async function uploadBase64Image(
  base64: string,
  studentId: string,
  imageName: string
): Promise<string> {
  const storage = getStorage()
  const bucket = storage.bucket(STORAGE_BUCKET)

  const buffer = base64ToBuffer(base64)
  const mimeType = extractMimeType(base64)
  const extension = mimeType === "image/png" ? "png" : "jpg"
  const filePath = `enrollment_images/${studentId}/${studentId}_${imageName}.${extension}`

  const fileRef = bucket.file(filePath)
  await fileRef.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: Date.now().toString(),
      },
    },
    resumable: false,
  })

  await fileRef.makePublic()

  return `https://storage.googleapis.com/${STORAGE_BUCKET}/${filePath}`
}

// Delete old files for a student (cleanup before re-upload)
async function deleteOldFilesForStudent(studentId: string): Promise<void> {
  try {
    const storage = getStorage()
    const bucket = storage.bucket(STORAGE_BUCKET)
    const [files] = await bucket.getFiles({ prefix: `enrollment_images/${studentId}/` })

    if (files.length > 0) {
      await Promise.all(files.map((file) => file.delete()))
      console.log(`🗑️ Deleted ${files.length} old files for student ${studentId}`)
    }
  } catch (error) {
    console.warn("⚠️ Could not delete old files:", error)
  }
}

// Rate limiter for registration submissions
const registrationRateLimiter = rateLimiters.studentRegistration

export async function POST(req: NextRequest) {
  try {
    console.log("📝 [REGISTRATION] New registration request received")

    // Get IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : "unknown"

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      registrationRateLimiter,
      `registration:${ip}`
    )

    if (!rateLimitResult.success) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
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

    const body = await req.json()

    const {
      name,
      tup_id,
      bday,
      student_email,
      student_phone_num,
      guardian_email,
      guardian_phone_number,
      facePhotos, // Object with neutral, smile, left, right, up, down
      authProvider,
      uid,
    } = body

    // Validate required fields
    if (
      !name ||
      !tup_id ||
      !bday ||
      !student_email ||
      !student_phone_num ||
      !guardian_email ||
      !guardian_phone_number
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      )
    }

    // Validate face photos
    if (
      !facePhotos ||
      !facePhotos.neutral ||
      !facePhotos.smile ||
      !facePhotos.left ||
      !facePhotos.right ||
      !facePhotos.up ||
      !facePhotos.down
    ) {
      return NextResponse.json(
        { success: false, error: "All 6 face photos are required" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      )
    }

    console.log(`📋 Registration details:`, {
      name,
      tup_id,
      student_email,
    })

    // Check if TUP ID already exists in registration_requests
    const existingQuery = await adminDB
      .collection("registration_requests")
      .where("tup_id", "==", tup_id)
      .limit(1)
      .get()

    if (!existingQuery.empty) {
      const existingData = existingQuery.docs[0].data()
      if (existingData.status === "approved" || existingData.status === "accepted") {
        return NextResponse.json(
          {
            success: false,
            error: "This TUP ID is already registered and approved.",
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        )
      }
      // Allow re-submission if pending or rejected
      console.log(`ℹ️ Existing registration found for ${tup_id} with status: ${existingData.status}`)
    }

    // Check if email already exists
    const emailQuery = await adminDB
      .collection("registration_requests")
      .where("student_email", "==", student_email)
      .limit(1)
      .get()

    if (!emailQuery.empty) {
      const emailData = emailQuery.docs[0].data()
      if (emailData.tup_id !== tup_id && (emailData.status === "approved" || emailData.status === "accepted")) {
        return NextResponse.json(
          {
            success: false,
            error: "This email is already associated with another registration.",
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        )
      }
    }

    // Delete old files before uploading new ones
    await deleteOldFilesForStudent(tup_id)

    console.log(`🚀 Starting face photo uploads for student ${tup_id}...`)

    // Upload all face photos
    const uploadPromises = [
      uploadBase64Image(facePhotos.neutral, tup_id, "face_neutral"),
      uploadBase64Image(facePhotos.smile, tup_id, "face_smile"),
      uploadBase64Image(facePhotos.left, tup_id, "face_left"),
      uploadBase64Image(facePhotos.right, tup_id, "face_right"),
      uploadBase64Image(facePhotos.up, tup_id, "face_up"),
      uploadBase64Image(facePhotos.down, tup_id, "face_down"),
    ]

    const [
      neutralUrl,
      smileUrl,
      leftUrl,
      rightUrl,
      upUrl,
      downUrl,
    ] = await Promise.all(uploadPromises)

    console.log("✅ All face photos uploaded successfully!")

    // Prepare registration data
    const registrationData: Record<string, any> = {
      name,
      tup_id,
      bday,
      student_email,
      student_phone_num,
      guardian_email,
      guardian_phone_number,
      facePhotos: {
        neutral: neutralUrl,
        smile: smileUrl,
        left: leftUrl,
        right: rightUrl,
        up: upUrl,
        down: downUrl,
      },
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    // Add Google auth info if provided
    if (authProvider === "google" && uid) {
      registrationData.uid = uid
      registrationData.authProvider = "google"
    }

    // Save to Firestore using TUP ID as document ID
    const docRef = adminDB.collection("registration_requests").doc(tup_id)
    await docRef.set(registrationData, { merge: true })

    console.log(`✅ Registration saved for ${tup_id}`)

    return NextResponse.json(
      {
        success: true,
        message: "Registration submitted successfully! You will be notified once your account is approved.",
        data: { tup_id },
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    )
  } catch (error: any) {
    console.error("❌ Registration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Registration failed. Please try again.",
      },
      { status: 500 }
    )
  }
}
