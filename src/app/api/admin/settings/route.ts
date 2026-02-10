import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * GET /api/admin/settings
 * Fetch current validation period and backup info
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Check if user is admin (via custom claims or Firestore)
    let isAdmin = false
    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB.collection("users").doc(decodedToken.uid).get()
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch settings from Firestore
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    const settingsDoc = await settingsRef.get()

    let validationPeriod = {
      startDate: "",
      endDate: "",
      isActive: false,
    }

    if (settingsDoc.exists) {
      const data = settingsDoc.data()
      validationPeriod = {
        startDate: data?.startDate || "",
        endDate: data?.endDate || "",
        isActive: isWithinPeriod(data?.startDate, data?.endDate),
      }
    }

    // Get backup info
    const idValidationsRef = adminDB.collection("validation_requests2")
    const snapshot = await idValidationsRef.count().get()
    const totalRecords = snapshot.data().count

    // Get last backup timestamp
    const backupMetaRef = adminDB.collection("system_settings").doc("backupMetadata")
    const backupMetaDoc = await backupMetaRef.get()
    const lastBackup = backupMetaDoc.exists ? backupMetaDoc.data()?.lastBackup : null

    // Estimate size (rough calculation: ~2KB per record)
    const estimatedSizeKB = totalRecords * 2
    const backupSize = formatBytes(estimatedSizeKB * 1024)

    return NextResponse.json({
      validationPeriod,
      backupInfo: {
        lastBackup,
        totalRecords,
        backupSize,
      },
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings
 * Update validation period settings
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Check if user is admin (via custom claims or Firestore)
    let isAdmin = false
    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB.collection("users").doc(decodedToken.uid).get()
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { validationPeriod } = await req.json()

    if (!validationPeriod || !validationPeriod.startDate || !validationPeriod.endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(validationPeriod.startDate)
    const endDate = new Date(validationPeriod.endDate)

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Save to Firestore
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    await settingsRef.set(
      {
        startDate: validationPeriod.startDate,
        endDate: validationPeriod.endDate,
        updatedAt: new Date().toISOString(),
        updatedBy: decodedToken.uid,
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      message: "Validation period updated successfully",
    })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Helper function to check if current time is within the validation period
 */
function isWithinPeriod(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false

  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  return now >= start && now <= end
}

/**
 * Helper function to format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
}