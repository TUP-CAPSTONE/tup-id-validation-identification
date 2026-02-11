import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { Timestamp } from "firebase-admin/firestore"

/**
 * POST /api/admin/cleanup
 * 
 * Deletes ID validation records outside the current validation period.
 */
export async function POST(req: NextRequest) {
  try {
    // ==============================
    // Verify Admin Authentication
    // ==============================
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

    // Check if user is admin
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

    console.log("========================================")
    console.log("Starting cleanup process...")
    console.log("========================================")

    // ==============================
    // Get Validation Period Settings
    // ==============================
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

    // ✅ Convert to Firestore Timestamps (FIXED)
    const startTimestamp = Timestamp.fromDate(new Date(startDate))
    const endTimestamp = Timestamp.fromDate(new Date(endDate))

    console.log(`Validation Period: ${startDate} to ${endDate}`)
    console.log(`Will DELETE records BEFORE: ${startTimestamp.toDate().toISOString()}`)
    console.log(`Will DELETE records AFTER: ${endTimestamp.toDate().toISOString()}`)
    console.log(`Will KEEP records BETWEEN these dates`)
    console.log("========================================")

    const idValidationsRef = adminDB.collection("validation_requests2")

    console.log("Querying validation_requests2 collection...")

    // Get total count
    const allRecordsSnapshot = await idValidationsRef.count().get()
    const totalRecords = allRecordsSnapshot.data().count
    console.log(`Total records in validation_requests2: ${totalRecords}`)

    // ==============================
    // Query BEFORE start date
    // ==============================
    console.log("Finding records created BEFORE start date...")
    const beforeStartQuery = idValidationsRef
      .where("requestTime", "<", startTimestamp)

    const beforeStartSnapshot = await beforeStartQuery.get()
    console.log(`Found ${beforeStartSnapshot.size} records BEFORE start date`)

    // ==============================
    // Query AFTER end date
    // ==============================
    console.log("Finding records created AFTER end date...")
    const afterEndQuery = idValidationsRef
      .where("requestTime", ">", endTimestamp)

    const afterEndSnapshot = await afterEndQuery.get()
    console.log(`Found ${afterEndSnapshot.size} records AFTER end date`)

    // ==============================
    // Batch Deletion
    // ==============================
    let deletedCount = 0
    const batchSize = 500
    let currentBatch = adminDB.batch()
    let operationCount = 0

    console.log("========================================")
    console.log("Starting deletion process...")

    // Delete BEFORE start
    console.log(`Deleting ${beforeStartSnapshot.size} records from BEFORE start date...`)
    for (const doc of beforeStartSnapshot.docs) {
      currentBatch.delete(doc.ref)
      deletedCount++
      operationCount++

      if (operationCount >= batchSize) {
        await currentBatch.commit()
        console.log(`Committed batch: ${operationCount} deletions`)
        currentBatch = adminDB.batch()
        operationCount = 0
      }
    }

    // Delete AFTER end
    console.log(`Deleting ${afterEndSnapshot.size} records from AFTER end date...`)
    for (const doc of afterEndSnapshot.docs) {
      currentBatch.delete(doc.ref)
      deletedCount++
      operationCount++

      if (operationCount >= batchSize) {
        await currentBatch.commit()
        console.log(`Committed batch: ${operationCount} deletions`)
        currentBatch = adminDB.batch()
        operationCount = 0
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await currentBatch.commit()
      console.log(`Committed final batch: ${operationCount} deletions`)
    }

    const recordsKept = totalRecords - deletedCount

    console.log("========================================")
    console.log("CLEANUP SUMMARY:")
    console.log(`Total records before: ${totalRecords}`)
    console.log(`Records deleted: ${deletedCount}`)
    console.log(`Records kept (within period): ${recordsKept}`)
    console.log("========================================")

    // ==============================
    // Log Cleanup Activity
    // ==============================
    const cleanupLogRef = adminDB.collection("system_settings").doc("cleanupLog")
    const currentLog = await cleanupLogRef.get()
    const existingHistory = currentLog.exists ? currentLog.data()?.history || [] : []

    await cleanupLogRef.set({
      lastCleanup: new Date().toISOString(),
      lastCleanupBy: decodedToken.uid,
      lastDeletedCount: deletedCount,
      recordsKept: recordsKept,
      totalRecordsBefore: totalRecords,
      history: [
        ...existingHistory.slice(-9),
        {
          timestamp: new Date().toISOString(),
          deletedCount,
          recordsKept,
          totalRecordsBefore: totalRecords,
          performedBy: decodedToken.uid,
          periodStart: startDate,
          periodEnd: endDate,
        },
      ],
    })

    console.log("Cleanup log updated in system_settings/cleanupLog")
    console.log("Cleanup process completed successfully!")

    return NextResponse.json({
      success: true,
      deletedCount,
      recordsKept,
      totalRecordsBefore: totalRecords,
      message: `Successfully deleted ${deletedCount} records outside the validation period. ${recordsKept} records kept within the period.`,
    })
  } catch (error) {
    console.error("========================================")
    console.error("ERROR during cleanup:", error)
    console.error("========================================")

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
