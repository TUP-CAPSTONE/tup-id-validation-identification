import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * Helper: Parse datetime-local string safely as LOCAL time
 * then convert to proper Date object
 */
function parseLocalDateTime(dateTimeString: string): Date {
  const [datePart, timePart] = dateTimeString.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)

  // This constructs date in server local time correctly
  return new Date(year, month - 1, day, hour, minute)
}

/**
 * Helper: Check if current time is within period
 */
function isWithinPeriod(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return false

  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  return (
    now.getTime() >= start.getTime() &&
    now.getTime() <= end.getTime()
  )
}

/**
 * Helper: Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 +
    " " +
    sizes[i]
  )
}

/**
 * GET /api/admin/settings
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

    // Admin check
    let isAdmin = false

    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB
        .collection("users")
        .doc(decodedToken.uid)
        .get()

      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch validation period
    const settingsRef = adminDB
      .collection("system_settings")
      .doc("idValidation")

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

    // Backup info
    const idValidationsRef = adminDB.collection("validation_requests2")
    const snapshot = await idValidationsRef.count().get()
    const totalRecords = snapshot.data().count

    const backupMetaRef = adminDB
      .collection("system_settings")
      .doc("backupMetadata")

    const backupMetaDoc = await backupMetaRef.get()

    const lastBackup = backupMetaDoc.exists
      ? backupMetaDoc.data()?.lastBackup
      : null

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
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

    // Admin check
    let isAdmin = false

    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB
        .collection("users")
        .doc(decodedToken.uid)
        .get()

      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { validationPeriod } = await req.json()

    if (
      !validationPeriod ||
      !validationPeriod.startDate ||
      !validationPeriod.endDate
    ) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      )
    }

    // 🔥 Convert datetime-local correctly
    const startLocal = parseLocalDateTime(validationPeriod.startDate)
    const endLocal = parseLocalDateTime(validationPeriod.endDate)

    if (endLocal.getTime() < startLocal.getTime()) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      )
    }

    // Convert to UTC ISO before saving
    const startISO = startLocal.toISOString()
    const endISO = endLocal.toISOString()

    const settingsRef = adminDB
      .collection("system_settings")
      .doc("idValidation")

    await settingsRef.set(
      {
        startDate: startISO,
        endDate: endISO,
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
