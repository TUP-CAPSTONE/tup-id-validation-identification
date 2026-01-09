import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    /**
     * ✅ Create Auth user
     */
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })

    /**
     * ✅ Optional but RECOMMENDED: custom claim
     */
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "OSA",
    })

    /**
     * ✅ Create Firestore user document
     */
    await adminDB.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: "OSA",
      accountStatus: "active",
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Create OSA error:", error)

    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create OSA account" },
      { status: 500 }
    )
  }
}
