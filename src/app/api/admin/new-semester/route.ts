import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/new-semester
 * Start a new semester by:
 * 1. Resetting all student isValidated fields to false
 * 2. Clearing validatedAt and validatedBy fields
 * 3. Clearing the current validation period
 * 4. Creating a backup log
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

    console.log("Starting new semester process...")

    // Get current validation period for logging
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    const settingsDoc = await settingsRef.get()
    const previousPeriod = settingsDoc.exists ? settingsDoc.data() : null

    // Step 1: Reset all student validation statuses
    const studentsRef = adminDB.collection("student_profiles")
    const studentsSnapshot = await studentsRef.get()

    let resetCount = 0
    const batchSize = 500 // Firestore batch limit
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

      // Commit batch if we hit the limit
      if (operationCount >= batchSize) {
        await batch.commit()
        console.log(`Committed batch of ${operationCount} updates`)
        batch = adminDB.batch()
        operationCount = 0
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${operationCount} updates`)
    }

    console.log(`Reset ${resetCount} student profiles`)

    // Step 2: Clear validation period settings
    await settingsRef.set(
      {
        startDate: "",
        endDate: "",
        clearedAt: new Date().toISOString(),
        clearedBy: decodedToken.uid,
        previousPeriod: previousPeriod,
      },
      { merge: true }
    )

    // Step 3: Log the semester reset
    const semesterLogRef = adminDB.collection("system_settings").doc("semesterLog")
    const currentLog = await semesterLogRef.get()
    const existingHistory = currentLog.exists ? currentLog.data()?.history || [] : []

    await semesterLogRef.set({
      lastSemesterReset: new Date().toISOString(),
      lastResetBy: decodedToken.uid,
      lastResetCount: resetCount,
      history: [
        ...existingHistory.slice(-9), // Keep last 10 entries
        {
          timestamp: new Date().toISOString(),
          resetCount,
          performedBy: decodedToken.uid,
          previousPeriod: previousPeriod,
        },
      ],
    })

    console.log("New semester started successfully")

    return NextResponse.json({
      success: true,
      resetCount,
      message: `Successfully reset ${resetCount} student profiles for new semester`,
    })
  } catch (error) {
    console.error("Error starting new semester:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}