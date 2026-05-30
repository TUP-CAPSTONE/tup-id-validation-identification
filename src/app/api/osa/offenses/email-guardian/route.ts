import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"
import { buildGuardianOffenseEmailHTML } from "@/lib/email-templates/guardian-offense-email"

export async function POST(req: Request) {
  try {
    const { offenseId } = await req.json()

    if (!offenseId) {
      return NextResponse.json({ error: "Missing offenseId" }, { status: 400 })
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

    // --- Fetch offense record ---
    const offenseRef = adminDB.collection("student_offenses").doc(offenseId)
    const offenseSnap = await offenseRef.get()

    if (!offenseSnap.exists) {
      return NextResponse.json({ error: "Offense not found" }, { status: 404 })
    }

    const offense = offenseSnap.data()!

    if (offense.status !== "active") {
      return NextResponse.json(
        { error: "Guardian email can only be sent for active offenses" },
        { status: 400 }
      )
    }

    // --- Fetch guardian email from student_profiles ---
    const studentProfileRef = adminDB.collection("student_profiles").doc(offense.studentUid)
    const studentProfileSnap = await studentProfileRef.get()

    if (!studentProfileSnap.exists) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const studentProfile = studentProfileSnap.data()!
    const guardianEmail = studentProfile.guardianEmail
    const guardianName = studentProfile.guardianName || undefined

    if (!guardianEmail) {
      return NextResponse.json(
        { error: "No guardian email found on this student's profile" },
        { status: 422 }
      )
    }

    // --- Format dates ---
    const dateCommittedLabel = offense.dateCommitted
      ? new Date(
          offense.dateCommitted.toDate
            ? offense.dateCommitted.toDate()
            : offense.dateCommitted
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A"

    const dateRecordedLabel = offense.dateRecorded
      ? new Date(
          offense.dateRecorded.toDate
            ? offense.dateRecorded.toDate()
            : offense.dateRecorded
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A"

    // --- Build email HTML ---
    const emailHTML = buildGuardianOffenseEmailHTML({
      guardianName,
      studentName: offense.studentName,
      studentNumber: offense.studentNumber,
      offenseType: offense.offenseType,
      offenseNumber: offense.offenseNumber,
      offenseTitle: offense.offenseTitle,
      offenseItems: offense.offenseItems || [],
      sanctionLevel: offense.sanctionLevel,
      sanction: offense.sanction,
      dateCommitted: dateCommittedLabel,
      dateRecorded: dateRecordedLabel,
      offenseDescription: offense.offenseDescription,
      recordedByEmail: offense.recordedByEmail || adminEmail,
    })

    // --- Write mail doc + update offense record in a batch ---
    const batch = adminDB.batch()

    // 1. Trigger email via Firebase Extension (Trigger Email)
    batch.set(adminDB.collection("mail").doc(), {
      to: guardianEmail,
      message: {
        subject: `[TUP OSA] Guardian Notice — Disciplinary Offense Filed for ${offense.studentName}`,
        html: emailHTML,
      },
    })

    // 2. Log that guardian was notified on the offense record
    batch.update(offenseRef, {
      guardianNotifiedAt: FieldValue.serverTimestamp(),
      guardianNotifiedBy: adminEmail,
      guardianEmail,
    })

    await batch.commit()
    console.log("✅ Guardian email triggered for offense:", offenseId)

    return NextResponse.json({
      success: true,
      guardianEmail,
      studentName: offense.studentName,
    })
  } catch (error: any) {
    console.error("🔥 EMAIL GUARDIAN ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}