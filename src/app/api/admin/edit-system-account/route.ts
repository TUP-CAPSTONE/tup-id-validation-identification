import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, role, fullName, gateName, location, deviceID } = body

    if (!uid || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (role === "OSA") {
      await adminAuth.updateUser(uid, {
        displayName: fullName,
      })

      await adminDB.collection("users").doc(uid).update({
        fullName,
        updatedAt: new Date(),
      })
    }

    if (role === "Gate") {
      await adminDB.collection("users").doc(uid).update({
        gateName,
        updatedAt: new Date(),
      })

      await adminDB.collection("gate_accounts").doc(uid).update({
        gateName,
        location,
        deviceID,
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Edit system account error:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}
