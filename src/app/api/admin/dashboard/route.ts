// api/admin/dashboard/route.ts
import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { getActiveSessions, getRecentLoginActivity } from "@/lib/session-tracker"

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value
    if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifySessionCookie(adminSession, true)
    const adminUid = decoded.uid

    const adminDoc = await adminDB.collection("users").doc(adminUid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin")
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    console.log("📊 Fetching admin dashboard data...")

    const [
      usersSnapshot,
      studentProfilesSnapshot,
      registrationRequestsSnapshot,
      validationRequestsSnapshot,
      activeSessions,
      recentLoginActivity,
    ] = await Promise.all([
      adminDB.collection("users").get(),
      adminDB.collection("student_profiles").get(),
      adminDB.collection("registration_requests").get(),
      adminDB.collection("validation_requests2").get(),
      getActiveSessions(),
      getRecentLoginActivity(15),
    ])

    // Process counts
    let adminCount = 0, osaCount = 0, gateCount = 0, studentCount = 0
    usersSnapshot.forEach(doc => {
      const role = doc.data().role?.toLowerCase()
      if (role === "admin") adminCount++
      else if (role === "osa") osaCount++
      else if (role === "gate") gateCount++
      else if (role === "student") studentCount++
    })

    let validatedCount = 0, notValidatedCount = 0
    studentProfilesSnapshot.forEach(doc => {
      doc.data().isValidated ? validatedCount++ : notValidatedCount++
    })

    let pendingRegistrations = 0, approvedRegistrations = 0, rejectedRegistrations = 0
    registrationRequestsSnapshot.forEach(doc => {
      const status = doc.data().status?.toLowerCase()
      if (status === "pending") pendingRegistrations++
      else if (status === "approved") approvedRegistrations++
      else if (status === "rejected") rejectedRegistrations++
    })

    let pendingValidations = 0, acceptedValidations = 0, rejectedValidations = 0
    validationRequestsSnapshot.forEach(doc => {
      const status = doc.data().status?.toLowerCase()
      if (status === "pending") pendingValidations++
      else if (status === "accepted") acceptedValidations++
      else if (status === "rejected") rejectedValidations++
    })

    // Recent activity
    const recentValidations = await adminDB
      .collection("validation_requests2")
      .where("status", "in", ["accepted", "rejected"])
      .orderBy("requestTime", "desc")
      .limit(5)
      .get()

    const recentActivity: any[] = []
    recentValidations.forEach(doc => {
      const data = doc.data()
      recentActivity.push({
        type: "ID Validation",
        message: `${data.studentName || "Student"}'s validation request ${data.status}`,
        timestamp: data.requestTime?.toDate() || new Date(),
        status: data.status,
      })
    })

    // Add system login/logout
    recentLoginActivity
      .filter(log => ["admin", "osa", "Gate"].includes(log.role))
      .slice(0, 10)
      .forEach(log => {
        recentActivity.push({
          type: "Session",
          message: `${log.name} ${log.action === "login" ? "logged in" : "logged out"}`,
          timestamp: log.timestamp || new Date(),
          status: log.action,
          role: log.role,
        })
      })

    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    console.log("✅ Dashboard data fetched successfully")

    return NextResponse.json({
      systemAccounts: {
        total: adminCount + osaCount + gateCount,
        admin: adminCount,
        osa: osaCount,
        gate: gateCount,
        activeNow: activeSessions.length,
      },
      students: { total: studentCount, validated: validatedCount, notValidated: notValidatedCount, pendingRegistrations },
      registrations: { pending: pendingRegistrations, approved: approvedRegistrations, rejected: rejectedRegistrations, total: pendingRegistrations + approvedRegistrations + rejectedRegistrations },
      idValidation: { pending: pendingValidations, accepted: acceptedValidations, rejected: rejectedValidations, total: pendingValidations + acceptedValidations + rejectedValidations },
      activeSessions: activeSessions.map(session => ({ ...session, loginTime: session.loginTime?.toISOString() })),
      recentLoginActivity: recentLoginActivity.filter(log => ["admin", "osa", "Gate"].includes(log.role)).map(log => ({ ...log, timestamp: log.timestamp?.toISOString() })),
      recentActivity: recentActivity.slice(0, 15),
    })
  } catch (error: any) {
    console.error("❌ Dashboard error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch dashboard data" }, { status: 500 })
  }
}
