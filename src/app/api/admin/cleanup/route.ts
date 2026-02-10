import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/cleanup
 * Delete ID validation records outside the current validation period
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

    console.log("Starting cleanup process...")

    // Get validation period settings
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    const settingsDoc = await settingsRef.get()

    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: "Validation period not configured" },
        { status: 400 }
      )
    }

    const settings = settingsDoc.data()
    const startDate = settings?.startDate
    const endDate = settings?.endDate

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Validation period dates not set" },
        { status: 400 }
      )
    }

    const startTimestamp = new Date(startDate)
    const endTimestamp = new Date(endDate)

    console.log(`Cleaning records outside period: ${startDate} to ${endDate}`)

    // Query records outside the validation period
    // Assuming ID validations have a 'createdAt' or 'submittedAt' field
    const idValidationsRef = adminDB.collection("validation_requests2")
    
    // Get records before start date
    const beforeStartQuery = idValidationsRef
      .where("createdAt", "<", startTimestamp.toISOString())
    const beforeStartSnapshot = await beforeStartQuery.get()

    // Get records after end date
    const afterEndQuery = idValidationsRef
      .where("createdAt", ">", endTimestamp.toISOString())
    const afterEndSnapshot = await afterEndQuery.get()

    let deletedCount = 0
    const batch = adminDB.batch()

    // Delete records before start date
    beforeStartSnapshot.forEach((doc) => {
      batch.delete(doc.ref)
      deletedCount++
    })

    // Delete records after end date
    afterEndSnapshot.forEach((doc) => {
      batch.delete(doc.ref)
      deletedCount++
    })

    // Commit the batch delete
    if (deletedCount > 0) {
      await batch.commit()
      console.log(`Deleted ${deletedCount} records outside validation period`)
    } else {
      console.log("No records to delete")
    }

    // Log cleanup activity
    const cleanupLogRef = adminDB.collection("system_settings").doc("cleanupLog")
    const currentLog = await cleanupLogRef.get()
    const existingHistory = currentLog.exists ? currentLog.data()?.history || [] : []

    await cleanupLogRef.set({
      lastCleanup: new Date().toISOString(),
      lastCleanupBy: decodedToken.uid,
      lastDeletedCount: deletedCount,
      history: [
        ...existingHistory.slice(-9), // Keep last 10 entries
        {
          timestamp: new Date().toISOString(),
          deletedCount,
          performedBy: decodedToken.uid,
          periodStart: startDate,
          periodEnd: endDate,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} records outside the validation period`,
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}