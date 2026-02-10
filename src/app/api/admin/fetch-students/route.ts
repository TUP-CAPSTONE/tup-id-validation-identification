import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

export async function GET() {
  try {
    // Query users collection where role is 'student'
    const snapshot = await adminDB
      .collection("users")
      .where("role", "==", "student")
      .get()

    const students = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ students })
  } catch (error) {
    console.error("Fetch students error:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}