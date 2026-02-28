import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * Helper: Parse datetime-local string as PHT (UTC+8) and return a proper UTC Date.
 */
function parseLocalDateTimeAsPHT(dateTimeString: string): Date {
  const [datePart, timePart] = dateTimeString.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)

  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute) - PHT_OFFSET_MS

  return new Date(utcMs)
}

/**
 * Helper: Convert stored UTC ISO string back to PHT datetime-local string.
 */
function toLocalPHTString(isoString?: string): string {
  if (!isoString) return ""

  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000
  const utcMs = new Date(isoString).getTime()
  const phtDate = new Date(utcMs + PHT_OFFSET_MS)

  return phtDate.toISOString().slice(0, 16)
}

/**
 * Helper: Check if current time is within period
 */
function isWithinPeriod(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return false

  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime()
}

/**
 * Helper: Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Helper: Verify admin from session cookie. Returns decodedToken or throws.
 */
async function verifyAdmin(sessionCookie: string | undefined) {
  if (!sessionCookie) return null

  const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

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

  return isAdmin ? decodedToken : null
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

    const decodedToken = await verifyAdmin(sessionCookie)
    if (!decodedToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Validation Period ──────────────────────────────────────────────────
    const validationDoc = await adminDB
      .collection("system_settings")
      .doc("idValidation")
      .get()

    let validationPeriod = { startDate: "", endDate: "", isActive: false }

    if (validationDoc.exists) {
      const data = validationDoc.data()
      validationPeriod = {
        startDate: toLocalPHTString(data?.startDate),
        endDate: toLocalPHTString(data?.endDate),
        isActive: isWithinPeriod(data?.startDate, data?.endDate),
      }
    }

    // ── Sticker Claiming Period ────────────────────────────────────────────
    const stickerDoc = await adminDB
      .collection("system_settings")
      .doc("stickerClaiming")
      .get()

    let stickerClaimingPeriod = { startDate: "", endDate: "", isActive: false }

    if (stickerDoc.exists) {
      const data = stickerDoc.data()
      stickerClaimingPeriod = {
        startDate: toLocalPHTString(data?.startDate),
        endDate: toLocalPHTString(data?.endDate),
        isActive: isWithinPeriod(data?.startDate, data?.endDate),
      }
    }

    // ── Current Semester ───────────────────────────────────────────────────
    const semesterDoc = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get()

    const currentSemester = semesterDoc.exists
      ? {
          schoolYear: semesterDoc.data()?.schoolYear ?? "",
          semester: semesterDoc.data()?.semester ?? "",
        }
      : null

    // ── Backup Info ────────────────────────────────────────────────────────
    const snapshot = await adminDB
      .collection("validation_requests2")
      .count()
      .get()
    const totalRecords = snapshot.data().count

    const backupMetaDoc = await adminDB
      .collection("system_settings")
      .doc("backupMetadata")
      .get()

    const lastBackup = backupMetaDoc.exists
      ? backupMetaDoc.data()?.lastBackup
      : null

    const backupSize = formatBytes(totalRecords * 2 * 1024)

    return NextResponse.json({
      validationPeriod,
      stickerClaimingPeriod,
      currentSemester,
      backupInfo: { lastBackup, totalRecords, backupSize },
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/settings
 *
 * Accepts either { validationPeriod } or { stickerClaimingPeriod } in the body
 * so both can share this endpoint without touching each other's data.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await verifyAdmin(sessionCookie)
    if (!decodedToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    // ── Handle Validation Period ───────────────────────────────────────────
    if (body.validationPeriod) {
      const { validationPeriod } = body

      if (!validationPeriod.startDate || !validationPeriod.endDate) {
        return NextResponse.json(
          { error: "Start date and end date are required" },
          { status: 400 }
        )
      }

      const startUTC = parseLocalDateTimeAsPHT(validationPeriod.startDate)
      const endUTC = parseLocalDateTimeAsPHT(validationPeriod.endDate)

      if (endUTC.getTime() < startUTC.getTime()) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        )
      }

      await adminDB
        .collection("system_settings")
        .doc("idValidation")
        .set(
          {
            startDate: startUTC.toISOString(),
            endDate: endUTC.toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid,
          },
          { merge: true }
        )

      return NextResponse.json({
        success: true,
        message: "Validation period updated successfully",
      })
    }

    // ── Handle Sticker Claiming Period ─────────────────────────────────────
    if (body.stickerClaimingPeriod) {
      const { stickerClaimingPeriod } = body

      if (!stickerClaimingPeriod.startDate || !stickerClaimingPeriod.endDate) {
        return NextResponse.json(
          { error: "Start date and end date are required" },
          { status: 400 }
        )
      }

      const stickerStartUTC = parseLocalDateTimeAsPHT(stickerClaimingPeriod.startDate)
      const stickerEndUTC = parseLocalDateTimeAsPHT(stickerClaimingPeriod.endDate)

      if (stickerEndUTC.getTime() <= stickerStartUTC.getTime()) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        )
      }

      // Cross-validate against the current validation period
      const validationDoc = await adminDB
        .collection("system_settings")
        .doc("idValidation")
        .get()

      if (validationDoc.exists) {
        const vData = validationDoc.data()

        if (vData?.startDate) {
          const validationStart = new Date(vData.startDate)
          if (stickerStartUTC.getTime() < validationStart.getTime()) {
            return NextResponse.json(
              {
                error:
                  "Sticker claiming start date cannot be before the ID validation start date",
              },
              { status: 400 }
            )
          }
        }

        if (vData?.endDate) {
          const validationEnd = new Date(vData.endDate)
          if (stickerEndUTC.getTime() < validationEnd.getTime()) {
            return NextResponse.json(
              {
                error:
                  "Sticker claiming end date cannot be before the ID validation end date",
              },
              { status: 400 }
            )
          }
        }
      }

      await adminDB
        .collection("system_settings")
        .doc("stickerClaiming")
        .set(
          {
            startDate: stickerStartUTC.toISOString(),
            endDate: stickerEndUTC.toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: decodedToken.uid,
          },
          { merge: true }
        )

      return NextResponse.json({
        success: true,
        message: "Sticker claiming period updated successfully",
      })
    }

    return NextResponse.json(
      { error: "No valid data provided" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}