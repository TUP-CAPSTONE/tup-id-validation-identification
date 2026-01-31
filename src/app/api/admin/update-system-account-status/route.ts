import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, accountStatus } = body

    if (!uid || !accountStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (accountStatus !== "active" && accountStatus !== "disabled") {
      return NextResponse.json(
        { error: "Invalid accountStatus" },
        { status: 400 }
      )
    }

    // update users doc
    await adminDB.collection("users").doc(uid).set(
      {
        accountStatus,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    // if this uid exists in gate_accounts, update also
    const gateDoc = await adminDB.collection("gate_accounts").doc(uid).get()
    if (gateDoc.exists) {
      await adminDB.collection("gate_accounts").doc(uid).set(
        {
          accountStatus,
          updatedAt: new Date(),
        },
        { merge: true }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update account status error:", error)
    return NextResponse.json(
      { error: "Failed to update account status" },
      { status: 500 }
    )
  }
}
