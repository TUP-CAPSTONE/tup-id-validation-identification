import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    const requestRef = adminDB.collection("registration_requests2").doc(requestId)
    const snap = await requestRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const data = snap.data()!

    if (data.status !== "pending") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      )
    }

    // 🔒 SAFETY: Check if email already exists
    try {
      await adminAuth.getUserByEmail(data.email)
      return NextResponse.json(
        { error: "Email already has an account" },
        { status: 400 }
      )
    } catch {
      // user does not exist → OK
    }

    // ✅ Create Auth user
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.studentNumber, // temporary password
      displayName: data.fullName,
    })

    // ✅ Create Firestore user document
    await adminDB.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: data.email,
      fullName: data.fullName,
      role: "student",
      accountStatus: "active",
      createdAt: new Date(),
    })

    // ✅ Update registration request
    await requestRef.update({
      status: "accepted",
      remarks: "accepted",
      processedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("🔥 ACCEPT ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
