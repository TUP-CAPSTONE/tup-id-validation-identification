import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/backup
 * Create and download a backup of all ID validation data
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

    console.log("Starting backup process...")

    // Fetch all ID validation records
    const idValidationsRef = adminDB.collection("validation_requests2")
    const snapshot = await idValidationsRef.get()

    const backupData = {
      metadata: {
        backupDate: new Date().toISOString(),
        totalRecords: snapshot.size,
        backupVersion: "1.0",
        createdBy: decodedToken.uid,
      },
      records: [] as any[],
    }

    // Collect all documents
    snapshot.forEach((doc) => {
      backupData.records.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    console.log(`Backup created with ${backupData.records.length} records`)

    // Update backup metadata in Firestore
    const backupMetaRef = adminDB.collection("system_settings").doc("backupMetadata")
    await backupMetaRef.set(
      {
        lastBackup: new Date().toISOString(),
        lastBackupBy: decodedToken.uid,
        lastBackupRecordCount: backupData.records.length,
      },
      { merge: true }
    )

    // Convert to JSON string
    const jsonData = JSON.stringify(backupData, null, 2)

    // Return as downloadable file
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="id-validation-backup-${
          new Date().toISOString().split("T")[0]
        }.json"`,
      },
    })
  } catch (error) {
    console.error("Error creating backup:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}