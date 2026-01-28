import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing requestId" },
        { status: 400 }
      )
    }

    /* --------------------------------
       🔐 Get Admin Session (NEXT 14/15 FIX)
    -------------------------------- */
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const decoded = await adminAuth.verifySessionCookie(
      adminSession,
      true
    )

    const adminUser = await adminAuth.getUser(decoded.uid)
    const adminName = adminUser.displayName || adminUser.email || "Admin"

    /* --------------------------------
       📄 Fetch Registration Request
    -------------------------------- */
    const requestRef = adminDB
      .collection("registration_requests")
      .doc(requestId)

    const snap = await requestRef.get()

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      )
    }

    const data = snap.data()!

    if (data.status !== "pending") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      )
    }

    /* --------------------------------
       🔒 SAFETY CHECKS
    -------------------------------- */

    // Firebase Auth check
    try {
      await adminAuth.getUserByEmail(data.student_email)
      return NextResponse.json(
        { error: "Email already exists in authentication" },
        { status: 400 }
      )
    } catch {}

    // Firestore users check
    const existingUserSnap = await adminDB
      .collection("users")
      .where("email", "==", data.student_email)
      .limit(1)
      .get()

    if (!existingUserSnap.empty) {
      return NextResponse.json(
        { error: "Email already exists in users collection" },
        { status: 400 }
      )
    }

    /* --------------------------------
       ✅ CREATE AUTH USER
    -------------------------------- */
    const userRecord = await adminAuth.createUser({
      email: data.student_email,
      password: data.tup_id,
      displayName: data.name,
    })

    const studentDocId = data.tup_id

    await adminDB.collection("users").doc(studentDocId).set({
      uid: userRecord.uid,
      studentNumber: data.tup_id,
      email: data.student_email,
      fullName: data.name,
      role: "student",
      accountStatus: "active",
      createdAt: new Date(),
    })

    await adminDB.collection("student_profiles").doc(studentDocId).set({
      uid: userRecord.uid,
      studentNumber: data.tup_id,
      email: data.student_email,
      fullName: data.name,
      phone: data.student_phone_num,
      birthDate: data.bday,
      guardianEmail: data.guardian_email,
      guardianPhoneNumber: data.guardian_phone_number,
      accountStatus: "active",
      createdAt: new Date(),
      isOnboarded: false,
      isValidated: false,
    })

    console.log("Updating registration request with ID:", requestId);
    
    await requestRef.update({
      status: "Accepted",
      remarks: "Accepted",
      reviewedBy: adminName,
      processedAt: new Date(),
    })

    console.log("Registration request updated successfully");

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("🔥 ACCEPT ERROR:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
