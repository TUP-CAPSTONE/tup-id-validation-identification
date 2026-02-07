import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const { requestId, rejectRemarks } = await req.json()

    if (!requestId || !rejectRemarks) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      )
    }

    console.log("📝 Reject request:", { requestId, rejectRemarks })

    // 🔐 OSA/Admin session check
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value || cookieStore.get("osa_session")?.value

    if (!adminSession) {
      console.error("❌ No admin/OSA session found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let reviewerName: string
    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      const adminUser = await adminAuth.getUser(decoded.uid)
      reviewerName = adminUser.displayName || adminUser.email || "OSA Staff"
      console.log("✅ Reviewer authenticated:", reviewerName)
    } catch (authError: any) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    // 📄 Fetch validation request
    const requestRef = adminDB.collection("validation_requests2").doc(requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      console.error("❌ Request not found:", requestId)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const requestData = requestSnap.data()!
    console.log("📄 Request data:", requestData)

    if (requestData.status !== "pending") {
      console.error("❌ Request already processed:", requestData.status)
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      )
    }

    const now = new Date()

    // 🚀 Batch writes
    const batch = adminDB.batch()

    // Update validation request status
    batch.update(requestRef, {
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      rejectRemarks,
      reviewedBy: reviewerName,
    })

    // 📋 Copy student info to rejected_validation collection (without images)
    // Auto-generate document ID for multiple rejection history
    const rejectedRef = adminDB.collection("rejected_validation").doc()
    
    batch.set(rejectedRef, {
      // Student Information (no images)
      studentId: requestData.studentId || null,
      tupId: requestData.tupId || requestData.tup_id || null,
      studentName: requestData.studentName || requestData.name || null,
      email: requestData.email || null,
      phoneNumber: requestData.phoneNumber || requestData.phone || null,
      course: requestData.course || null,
      section: requestData.section || null,
      yearLevel: requestData.yearLevel || requestData.year || null,
      
      // Rejection Details
      rejectRemarks,
      rejectedAt: now,
      rejectedBy: reviewerName,
      
      // Reference to original request
      originalRequestId: requestId,
      requestTime: requestData.requestTime || null,
      
      // Metadata
      createdAt: now,
    })

    await batch.commit()
    console.log("✅ Rejection processed and saved to rejected_validation")

    return NextResponse.json({ 
      success: true,
      rejectedDocId: rejectedRef.id
    })

  } catch (error: any) {
    console.error("🔥 REJECT ERROR:", error)
    console.error("Stack trace:", error.stack)
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    )
  }
}