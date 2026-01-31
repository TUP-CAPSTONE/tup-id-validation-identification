import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { role, email, password } = data

    if (!role || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields (role, email, password)" },
        { status: 400 }
      )
    }

    // Create auth user
    const user = await adminAuth.createUser({ email, password })
    await adminAuth.setCustomUserClaims(user.uid, { role })

    // Build user payload (ONLY store the correct name field)
    const userDoc: any = {
      uid: user.uid,
      email,
      role,
      accountStatus: "active",
      createdAt: new Date(),
    }

    if (role === "Gate") {
      userDoc.gateName = data.gateName || null
      // IMPORTANT: do not store fullName at all
    } else {
      // OSA (or any non-Gate role)
      userDoc.fullName = data.fullName || null
      // IMPORTANT: do not store gateName at all
    }

    // Save to users collection
    await adminDB.collection("users").doc(user.uid).set(userDoc)

    // If Gate account, also save to gate_accounts collection
    if (role === "Gate") {
      await adminDB.collection("gate_accounts").doc(user.uid).set({
        uid: user.uid,
        gateName: data.gateName || null,
        location: data.location || null,
        deviceID: data.deviceID || null,
        isActive: true,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("create-system-account error:", error)
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    )
  }
}
