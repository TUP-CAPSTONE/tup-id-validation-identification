import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/new-semester
 *
 * Starts a new semester by:
 * 1. Checking for duplicate school year + semester combo (returns 409 if found)
 * 2. Resetting all student isValidated fields to false
 *    → Also writes a "not_validated" history entry for any student who was NOT
 *      validated in the PREVIOUS semester (stored in system_settings/currentSemester)
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

    // ── Read previous semester before overwriting ────────────────────────────
    // This is used to write "not_validated" history for students who were
    // not validated during the semester that is now ending.
    const prevSemesterSnap = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get()

    const prevSemester: string | null = prevSemesterSnap.exists
      ? prevSemesterSnap.data()!.semester
      : null
    const prevSchoolYear: string | null = prevSemesterSnap.exists
      ? prevSemesterSnap.data()!.schoolYear
      : null

    const hasPreviousSemester = !!(prevSemester && prevSchoolYear)

    // ── Step 2: Reset all student validation statuses ────────────────────────
    // Also writes "not_validated" history for students who weren't validated
    // in the previous semester.
    const studentsSnapshot = await adminDB.collection("student_profiles").get()

    let resetCount = 0
    let notValidatedCount = 0
    const now = new Date()

    const BATCH_LIMIT = 400 // conservative to leave room for history doc writes
    let batch = adminDB.batch()
    let operationCount = 0

    const flushBatch = async () => {
      if (operationCount > 0) {
        await batch.commit()
        console.log(`Committed batch of ${operationCount} operations`)
        batch = adminDB.batch()
        operationCount = 0
      }
    }

    for (const doc of studentsSnapshot.docs) {
      const uid = doc.id

      // Reset the student profile
      batch.update(doc.ref, {
        isValidated: false,
        validatedAt: null,
        validatedBy: null,
        validationResetAt: now.toISOString(),
        validationResetBy: "new_semester",
      })
      operationCount++
      resetCount++

      // Check if this student was validated in the previous semester
      if (hasPreviousSemester) {
        // Flush batch before doing a read if we're near the limit
        if (operationCount >= BATCH_LIMIT) {
          await flushBatch()
        }

        const validatedHistorySnap = await adminDB
          .collection("student_profiles")
          .doc(uid)
          .collection("validation_history")
          .where("semester", "==", prevSemester)
          .where("schoolYear", "==", prevSchoolYear)
          .where("status", "==", "validated")
          .limit(1)
          .get()

        const wasValidated = !validatedHistorySnap.empty

        if (!wasValidated) {
          // Write a "not_validated" entry for the semester that just ended
          const historyRef = adminDB
            .collection("student_profiles")
            .doc(uid)
            .collection("validation_history")
            .doc()

          batch.set(historyRef, {
            semester: prevSemester,
            schoolYear: prevSchoolYear,
            status: "not_validated",
            // Date records when the new semester was started (closing date for prev)
            date: now,
            validatedBy: null,
          })

          operationCount++
          notValidatedCount++
        }
      }

      if (operationCount >= BATCH_LIMIT) {
        await flushBatch()
      }
    }

    // Flush any remaining student ops before proceeding
    await flushBatch()

    console.log(`Reset ${resetCount} student profiles`)
    console.log(
      `Wrote ${notValidatedCount} "not_validated" history entries for ${prevSemester} ${prevSchoolYear}`
    )

    // ── Step 3: Clear validation period ─────────────────────────────────────
    await adminDB
      .collection("system_settings")
      .doc("idValidation")
      .set(
        {
          startDate: "",
          endDate: "",
          clearedAt: now.toISOString(),
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
          clearedAt: now.toISOString(),
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
        startedAt: now.toISOString(),
        startedBy: decodedToken.uid,
      })

    // ── Step 6: Append to semester history log ───────────────────────────────
    await semesterLogRef.set({
      lastSemesterReset: now.toISOString(),
      lastResetBy: decodedToken.uid,
      lastResetCount: resetCount,
      history: [
        ...history.slice(-19),
        {
          schoolYear,
          semester,
          timestamp: now.toISOString(),
          resetCount,
          notValidatedCount,
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
      notValidatedCount,
      schoolYear,
      semester,
      message: `Successfully started ${semester} semester of ${schoolYear}. ${resetCount} student profiles reset. ${notValidatedCount} student(s) marked as not validated for ${prevSemester} ${prevSchoolYear}.`,
    })
  } catch (error) {
    console.error("Error starting new semester:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}