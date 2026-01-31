import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  const { uid, role } = await req.json()

  await adminAuth.deleteUser(uid)
  await adminDB.collection("users").doc(uid).delete()

  if (role === "Gate") {
    await adminDB.collection("gate_accounts").doc(uid).delete()
  }

  return NextResponse.json({ success: true })
}
