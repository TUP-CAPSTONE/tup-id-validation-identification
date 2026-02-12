// lib/session-tracker.ts
import { adminDB } from "@/lib/firebaseAdmin"
import { FieldValue } from "firebase-admin/firestore"

export interface SessionLogData {
  userId: string
  email: string
  name: string
  role: "admin" | "osa" | "Gate" | "student"
  action: "login" | "logout"
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  sessionDuration?: number
}

/**
 * Log login for system users AND add to active_sessions
 */
export async function logLogin(
  userId: string,
  email: string,
  name: string,
  role: "admin" | "osa" | "Gate",
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Log login event
    await adminDB.collection("session_logs").add({
      userId,
      email,
      name,
      role,
      action: "login",
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })

    // Add to active_sessions for system users only
    await adminDB.collection("active_sessions").doc(userId).set({
      userId,
      email,
      name,
      role,
      loginTime: FieldValue.serverTimestamp(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })

    console.log(`✅ Login logged and active session added for ${email} (${role})`)
  } catch (err) {
    console.error("❌ Error logging login:", err)
  }
}

/**
 * Log logout and remove from active_sessions
 */
export async function logLogout(
  userId: string,
  email: string,
  name: string,
  role: "admin" | "osa" | "Gate",
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get last login to calculate session duration
    const loginDocs = await adminDB
      .collection("session_logs")
      .where("userId", "==", userId)
      .where("action", "==", "login")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get()

    let sessionDuration: number | null = null
    if (!loginDocs.empty) {
      const loginTime = loginDocs.docs[0].data().timestamp?.toDate()
      if (loginTime) sessionDuration = Date.now() - loginTime.getTime()
    }

    // Log logout
    await adminDB.collection("session_logs").add({
      userId,
      email,
      name,
      role,
      action: "logout",
      timestamp: FieldValue.serverTimestamp(),
      sessionDuration,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    })

    // Remove from active_sessions
    await adminDB.collection("active_sessions").doc(userId).delete()

    console.log(
      `✅ Logout logged and active session removed for ${email} (${role}), duration: ${
        sessionDuration ? Math.round(sessionDuration / 1000 / 60) + "m" : "unknown"
      }`
    )
  } catch (err) {
    console.error("❌ Error logging logout:", err)
  }
}

/**
 * Get all active system sessions
 */
export async function getActiveSessions(): Promise<
  Array<{
    userId: string
    email: string
    name: string
    role: "admin" | "osa" | "Gate"
    loginTime: Date | null
    ipAddress?: string | null
    userAgent?: string | null
  }>
> {
  try {
    const snapshot = await adminDB.collection("active_sessions").get()
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      loginTime: doc.data().loginTime?.toDate?.(),
    })) as Array<{
      userId: string
      email: string
      name: string
      role: "admin" | "osa" | "Gate"
      loginTime: Date | null
      ipAddress?: string | null
      userAgent?: string | null
    }>
  } catch (err) {
    console.error("❌ Error fetching active sessions:", err)
    return []
  }
}

/**
 * Get recent login/logout activity
 */
export async function getRecentLoginActivity(
  limit = 20
): Promise<Array<SessionLogData & { id: string; timestamp: Date | null }>> {
  try {
    const snapshot = await adminDB
      .collection("session_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get()

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.(),
    })) as Array<SessionLogData & { id: string; timestamp: Date | null }>
  } catch (err) {
    console.error("❌ Error fetching recent activity:", err)
    return []
  }
}

/**
 * Format session duration
 */
export function formatSessionDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
