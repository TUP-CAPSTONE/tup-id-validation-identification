import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

/**
 * This endpoint fixes OSA accounts that are missing the role field
 * or have incorrect role values
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    /**
     * Get user by email
     */
    const userRecord = await adminAuth.getUserByEmail(email)
    const uid = userRecord.uid

    /**
     * Update or set the role in Firestore
     */
    await adminDB.collection("users").doc(uid).set(
      {
        role: "OSA",
        email: email,
        name: userRecord.displayName || "OSA Staff",
        accountStatus: "active",
        updatedAt: new Date(),
      },
      { merge: true } // This will update existing fields or create new ones
    )

    /**
     * Also set custom claims
     */
    await adminAuth.setCustomUserClaims(uid, {
      role: "OSA",
    })

    return NextResponse.json({
      success: true,
      message: `Successfully updated role for ${email}`,
      uid: uid,
    })
  } catch (error: any) {
    console.error("Fix OSA role error:", error)

    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update OSA role" },
      { status: 500 }
    )
  }
}
