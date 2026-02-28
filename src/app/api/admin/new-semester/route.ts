import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/new-semester
 *
 * Starts a new semester by:
 * 1. Checking for duplicate school year + semester combo (returns 409 if found)
 * 2. Resetting all student isValidated fields to false
 * 3. Clearing the current validation period and sticker claiming period
 * 4. Saving the new semester info to system_settings/currentSemester
 * 5. Appending to the semester history log
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Parse & validate body ────────────────────────────────────────────────
    const { schoolYear, semester } = await req.json()

    if (!schoolYear || !semester) {
      return NextResponse.json(
        { error: "schoolYear and semester are required" },
        { status: 400 }
      )
    }

    const schoolYearRegex = /^\d{4}-\d{4}$/
    if (!schoolYearRegex.test(schoolYear)) {
      return NextResponse.json(
        { error: "schoolYear must be in YYYY-YYYY format (e.g. 2024-2025)" },
        { status: 400 }
      )
    }

    const [startYr, endYr] = schoolYear.split("-").map(Number)
    if (endYr !== startYr + 1) {
      return NextResponse.json(
        { error: "School year must consist of consecutive years (e.g. 2024-2025)" },
        { status: 400 }
      )
    }

    if (!["1st", "2nd"].includes(semester)) {
      return NextResponse.json(
        { error: "semester must be '1st' or '2nd'" },
        { status: 400 }
      )
    }

    // ── Duplicate detection ──────────────────────────────────────────────────
    // Check the semester history log for this exact combo
    const semesterLogRef = adminDB
      .collection("system_settings")
      .doc("semesterLog")

    const currentLog = await semesterLogRef.get()
    const history: Array<{ schoolYear: string; semester: string }> =
      currentLog.exists ? currentLog.data()?.history ?? [] : []

    const isDuplicate = history.some(
      (entry) => entry.schoolYear === schoolYear && entry.semester === semester
    )

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `The ${semester} semester of school year ${schoolYear} has already been used. Please check the school year and semester.`,
        },
        { status: 409 }
      )
    }

    console.log(`Starting new semester: ${semester} semester, ${schoolYear}`)

    // ── Step 1: Snapshot previous periods for logging ────────────────────────
    const validationDoc = await adminDB
      .collection("system_settings")
      .doc("idValidation")
      .get()
    const previousValidationPeriod = validationDoc.exists
      ? validationDoc.data()
      : null

    const stickerDoc = await adminDB
      .collection("system_settings")
      .doc("stickerClaiming")
      .get()
    const previousStickerPeriod = stickerDoc.exists ? stickerDoc.data() : null

    // ── Step 2: Reset all student validation statuses ────────────────────────
    const studentsSnapshot = await adminDB.collection("student_profiles").get()

    let resetCount = 0
    const BATCH_LIMIT = 500
    let batch = adminDB.batch()
    let operationCount = 0

    for (const doc of studentsSnapshot.docs) {
      batch.update(doc.ref, {
        isValidated: false,
        validatedAt: null,
        validatedBy: null,
        validationResetAt: new Date().toISOString(),
        validationResetBy: "new_semester",
      })

      resetCount++
      operationCount++

      if (operationCount >= BATCH_LIMIT) {
        await batch.commit()
        console.log(`Committed batch of ${operationCount} student resets`)
        batch = adminDB.batch()
        operationCount = 0
      }
    }

    if (operationCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${operationCount} student resets`)
    }

    console.log(`Reset ${resetCount} student profiles`)

    // ── Step 3: Clear validation period ─────────────────────────────────────
    await adminDB
      .collection("system_settings")
      .doc("idValidation")
      .set(
        {
          startDate: "",
          endDate: "",
          clearedAt: new Date().toISOString(),
          clearedBy: decodedToken.uid,
          previousPeriod: previousValidationPeriod,
        },
        { merge: true }
      )

    // ── Step 4: Clear sticker claiming period ────────────────────────────────
    await adminDB
      .collection("system_settings")
      .doc("stickerClaiming")
      .set(
        {
          startDate: "",
          endDate: "",
          clearedAt: new Date().toISOString(),
          clearedBy: decodedToken.uid,
          previousPeriod: previousStickerPeriod,
        },
        { merge: true }
      )

    // ── Step 5: Save new current semester ────────────────────────────────────
    await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .set({
        schoolYear,
        semester,
        startedAt: new Date().toISOString(),
        startedBy: decodedToken.uid,
      })

    // ── Step 6: Append to semester history log ───────────────────────────────
    await semesterLogRef.set({
      lastSemesterReset: new Date().toISOString(),
      lastResetBy: decodedToken.uid,
      lastResetCount: resetCount,
      history: [
        // Keep last 20 entries
        ...history.slice(-19),
        {
          schoolYear,
          semester,
          timestamp: new Date().toISOString(),
          resetCount,
          performedBy: decodedToken.uid,
          previousValidationPeriod,
          previousStickerPeriod,
        },
      ],
    })

    console.log(`New semester started: ${semester} semester, ${schoolYear}`)

    return NextResponse.json({
      success: true,
      resetCount,
      schoolYear,
      semester,
      message: `Successfully started ${semester} semester of ${schoolYear}. ${resetCount} student profiles have been reset.`,
    })
  } catch (error) {
    console.error("Error starting new semester:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}