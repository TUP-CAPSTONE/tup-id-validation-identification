import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/new-semester
 *
 * Starts a new semester by:
 * 1. Checking for duplicate school year + semester combo (returns 409 if found)
 * 2. Reading each student's current isValidated field and writing a validation
 *    history entry for the semester that is NOW ENDING:
 *      - isValidated === true  → "validated"
 *      - isValidated === false → "not_validated"
 * 3. Resetting all student isValidated fields to false for the new semester
 * 4. Clearing the current validation period and sticker claiming period
 * 5. Saving the new semester info to system_settings/currentSemester
 * 6. Appending to the semester history log
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
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

    // ── Parse & validate body ─────────────────────────────────────────────────
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

    // ── Duplicate detection ───────────────────────────────────────────────────
    const semesterLogRef = adminDB.collection("system_settings").doc("semesterLog")
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

    // ── Step 1: Snapshot previous periods for logging ─────────────────────────
    const validationDoc = await adminDB
      .collection("system_settings")
      .doc("idValidation")
      .get()
    const previousValidationPeriod = validationDoc.exists ? validationDoc.data() : null

    const stickerDoc = await adminDB
      .collection("system_settings")
      .doc("stickerClaiming")
      .get()
    const previousStickerPeriod = stickerDoc.exists ? stickerDoc.data() : null

    // ── Read the semester that is NOW ENDING ──────────────────────────────────
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

    // ── Step 2: Process all students ──────────────────────────────────────────
    const studentsSnapshot = await adminDB.collection("student_profiles").get()

    const now = new Date()
    let resetCount = 0
    let validatedCount = 0
    let notValidatedCount = 0

    const BATCH_LIMIT = 400
    let batch = adminDB.batch()
    let opsInBatch = 0

    const flushIfNeeded = async () => {
      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit()
        console.log(`Committed batch of ${opsInBatch} operations`)
        batch = adminDB.batch()
        opsInBatch = 0
      }
    }

    for (const studentDoc of studentsSnapshot.docs) {
      const uid = studentDoc.id
      const studentData = studentDoc.data()

      // a) Write validation history entry based on current isValidated value
      //    Only write if there was actually a previous semester to record
      if (hasPreviousSemester) {
        const wasValidated = studentData.isValidated === true

        const historyRef = adminDB
          .collection("student_profiles")
          .doc(uid)
          .collection("validation_history")
          .doc()

        batch.set(historyRef, {
          semester: prevSemester,
          schoolYear: prevSchoolYear,
          status: wasValidated ? "validated" : "not_validated",
          date: now,
          validatedBy: wasValidated ? (studentData.lastValidatedBy ?? null) : null,
        })

        opsInBatch++
        wasValidated ? validatedCount++ : notValidatedCount++

        await flushIfNeeded()
      }

      // b) Reset isValidated to false for the incoming semester
      batch.update(studentDoc.ref, {
        isValidated: false,
        validatedAt: null,
        validatedBy: null,
        validationResetAt: now.toISOString(),
        validationResetBy: "new_semester",
      })

      opsInBatch++
      resetCount++

      await flushIfNeeded()
    }

    if (opsInBatch > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${opsInBatch} operations`)
    }

    console.log(`Reset ${resetCount} student profiles`)
    console.log(`History — validated: ${validatedCount}, not_validated: ${notValidatedCount}`)

    // ── Step 3: Clear validation period ──────────────────────────────────────
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

    // ── Step 4: Clear sticker claiming period ─────────────────────────────────
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

    // ── Step 5: Save new current semester ─────────────────────────────────────
    await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .set({
        schoolYear,
        semester,
        startedAt: now.toISOString(),
        startedBy: decodedToken.uid,
      })

    // ── Step 6: Append to semester history log ────────────────────────────────
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
          validatedCount,
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
      validatedCount,
      notValidatedCount,
      schoolYear,
      semester,
      message: `Successfully started ${semester} semester of ${schoolYear}. ${resetCount} student profiles reset. History written: ${validatedCount} validated, ${notValidatedCount} not validated for ${prevSemester ?? "—"} ${prevSchoolYear ?? "—"}.`,
    })
  } catch (error) {
    console.error("Error starting new semester:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}