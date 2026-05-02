import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { buildOffenseFiledEmailHTML } from "@/lib/email-templates/offense-filed-email"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      studentUid,
      studentNumber,
      studentName,
      studentEmail,
      offenseNumber,
      offenseTitle,
      offenseType,
      offenseItems,
      offenseDescription,
      sanction,
      sanctionLevel,
      dateCommitted,
    } = body

    // --- Input validation ---
    if (!studentUid || !studentNumber || !studentEmail) {
      return NextResponse.json({ error: "Missing student information" }, { status: 400 })
    }

    if (!offenseNumber || !offenseTitle || !offenseType) {
      return NextResponse.json({ error: "Missing offense information" }, { status: 400 })
    }

    if (!dateCommitted) {
      return NextResponse.json({ error: "Missing date committed" }, { status: 400 })
    }

    if (!offenseDescription?.trim()) {
      return NextResponse.json({ error: "Missing offense description/narrative" }, { status: 400 })
    }

    // --- OSA/Admin session check ---
    const cookieStore = await cookies()
    const adminSession =
      cookieStore.get("admin_session")?.value ||
      cookieStore.get("osa_session")?.value

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let adminUserId: string
    let adminEmail: string

    try {
      const decoded = await adminAuth.verifySessionCookie(adminSession, true)
      adminUserId = decoded.uid
      const adminUser = await adminAuth.getUser(adminUserId)
      adminEmail = adminUser.email || "OSA Staff"
      console.log("✅ OSA authenticated:", adminEmail)
    } catch (authError: any) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    const now = new Date()
    const dateCommittedParsed = new Date(dateCommitted)

    const dateCommittedLabel = dateCommittedParsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const dateRecordedLabel = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    // --- Build email HTML ---
    const emailHTML = buildOffenseFiledEmailHTML({
      studentName,
      studentNumber,
      offenseType,
      offenseNumber,
      offenseTitle,
      offenseItems: offenseItems || [],
      sanctionLevel,
      sanction,
      dateCommitted: dateCommittedLabel,
      dateRecorded: dateRecordedLabel,
      recordedByEmail: adminEmail,
      narrativeSummary: offenseDescription.trim(),
    })

    // --- Batch write: offense record + email trigger ---
    const batch = adminDB.batch()

    // 1. Write offense record to student_offenses collection
    const offenseRef = adminDB.collection("student_offenses").doc()
    batch.set(offenseRef, {
      studentUid,
      studentNumber,
      studentName,
      studentEmail,

      offenseNumber,
      offenseTitle,
      offenseType,
      offenseItems: offenseItems || [],

      offenseDescription: offenseDescription.trim(),
      sanction,
      sanctionLevel,

      dateCommitted: dateCommittedParsed,
      dateRecorded: FieldValue.serverTimestamp(),

      recordedBy: adminUserId,
      recordedByEmail: adminEmail,

      status: "active",
    })

    // 2. Write offense to student profile subcollection for easy querying
    const studentOffenseRef = adminDB
      .collection("student_profiles")
      .doc(studentUid)
      .collection("offense_history")
      .doc(offenseRef.id)

    batch.set(studentOffenseRef, {
      offenseId: offenseRef.id,
      offenseNumber,
      offenseTitle,
      offenseType,
      sanctionLevel,
      sanction,
      dateCommitted: dateCommittedParsed,
      dateRecorded: FieldValue.serverTimestamp(),
      status: "active",
    })

    // 3. Trigger email via Firebase Extension (Trigger Email)
    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: `Disciplinary Notice — ${offenseType === "major" ? "Major" : "Minor"} Offense #${offenseNumber} Filed Against Your Record`,
        html: emailHTML,
      },
    })

    await batch.commit()
    console.log("✅ Offense filed and email triggered:", offenseRef.id)

    return NextResponse.json({
      success: true,
      offenseId: offenseRef.id,
      studentName,
      offenseTitle,
    })
  } catch (error: any) {
    console.error("🔥 FILE OFFENSE ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}