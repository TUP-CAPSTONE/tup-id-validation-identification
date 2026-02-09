import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

function buildAcceptanceEmailHTML(params: {
  studentName: string
  studentEmail: string
  tupId: string
  loginUrl: string
}) {
  const { studentName, loginUrl } = params

  return `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:650px;margin:0 auto;padding:28px 18px;">
        
        <div style="background:linear-gradient(135deg,#b32032,#7a1421);border-radius:18px;padding:22px 22px 18px 22px;color:#fff;box-shadow:0 10px 30px rgba(179,32,50,0.25);">
          <div style="font-size:14px;opacity:.95;letter-spacing:.4px;">TUP SIIVS</div>
          <div style="font-size:24px;font-weight:800;margin-top:6px;">Registration Accepted ✅</div>
          <div style="font-size:14px;opacity:.95;margin-top:8px;line-height:1.5;">
            Your student registration has been approved. You may now login using your account.
          </div>
        </div>

        <div style="background:#ffffff;border-radius:18px;margin-top:16px;padding:22px;border:1px solid #e7e9f2;">
          <div style="font-size:16px;color:#0f172a;font-weight:700;margin-bottom:10px;">
            Hello ${studentName},
          </div>

          <div style="font-size:14px;color:#334155;line-height:1.7;">
            We are pleased to inform you that your registration request has been <b>accepted</b>.
            You can now access the system using the login credentials below:
          </div>

          <div style="margin-top:16px;border-radius:16px;border:1px solid #e7e9f2;background:#f8fafc;padding:16px;">
            <div style="font-size:13px;color:#64748b;margin-bottom:10px;">Login Credentials</div>

            <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;">
              <div style="min-width:95px;font-size:13px;color:#0f172a;font-weight:800;">Email:</div>
              <div style="font-size:13px;color:#0f172a;background:#ffffff;border:1px solid #e7e9f2;padding:10px 12px;border-radius:12px;flex:1;">
                {Your submitted email}
              </div>
            </div>

            <div style="display:flex;gap:10px;align-items:flex-start;">
              <div style="min-width:95px;font-size:13px;color:#0f172a;font-weight:800;">Password:</div>
              <div style="font-size:13px;color:#0f172a;background:#ffffff;border:1px solid #e7e9f2;padding:10px 12px;border-radius:12px;flex:1;">
                {Your TUP ID}
                <div style="margin-top:6px;color:#64748b;font-size:12px;">
                  Ex. TUP-22-1234
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:18px;">
            <a href="${loginUrl}"
              style="display:inline-block;background:#b32032;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 18px;border-radius:12px;">
              Login Now →
            </a>
          </div>

          <div style="margin-top:16px;font-size:12px;color:#64748b;line-height:1.6;">
            <b>Security Reminder:</b> Please change your password immediately after your first login.
            If you did not request this registration, please ignore this email.
          </div>
        </div>

        <div style="text-align:center;margin-top:14px;font-size:12px;color:#94a3b8;line-height:1.6;">
          © ${new Date().getFullYear()} TUP SIIVS. All rights reserved.
        </div>

      </div>
    </div>
  `
}

export async function POST(req: Request) {
  try {
    const { requestId } = await req.json()

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    // 🔐 Admin session
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifySessionCookie(adminSession, true)
    const adminUser = await adminAuth.getUser(decoded.uid)
    const adminName = adminUser.displayName || adminUser.email || "Admin"

    // 📄 Fetch request
    const requestRef = adminDB.collection("registration_requests").doc(requestId)
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

    const studentEmail = data.student_email
    const studentName = data.name
    const tupId = data.tup_id

    if (!studentEmail || !studentName || !tupId) {
      return NextResponse.json(
        { error: "Invalid request document fields" },
        { status: 400 }
      )
    }

    // ✅ Create Auth user (this is the only heavy part we cannot avoid)
    const userRecord = await adminAuth.createUser({
      email: studentEmail,
      password: tupId,
      displayName: studentName,
    })

    const studentDocId = tupId
    const now = new Date()

    // 🚀 Batch writes (fast)
    const batch = adminDB.batch()

    batch.set(adminDB.collection("users").doc(studentDocId), {
      uid: userRecord.uid,
      studentNumber: tupId,
      email: studentEmail,
      fullName: studentName,
      role: "student",
      accountStatus: "active",
      createdAt: now,
    })

    batch.set(adminDB.collection("student_profiles").doc(studentDocId), {
      uid: userRecord.uid,
      studentNumber: tupId,
      email: studentEmail,
      fullName: studentName,
      phone: data.student_phone_num || "",
      birthDate: data.bday || "",
      guardianEmail: data.guardian_email || "",
      guardianPhoneNumber: data.guardian_phone_number || "",
      accountStatus: "active",
      createdAt: now,
      isOnboarded: false,
      isValidated: false,
    })

    batch.update(requestRef, {
      status: "accepted",
      remarks: "accepted",
      reviewedBy: adminName,
      processedAt: now,
    })

    // 📩 Queue email via Trigger Email extension
    const loginUrl = process.env.APP_LOGIN_URL || "http://localhost:3000/login"
    const html = buildAcceptanceEmailHTML({
      studentName,
      studentEmail,
      tupId,
      loginUrl,
    })

    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: "Registration Accepted - TUP Student Account Approved",
        html,
      },
    })

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("🔥 ACCEPT ERROR:", error)

    // better error message for duplicate email
    if (String(error?.message || "").includes("email-already-exists")) {
      return NextResponse.json(
        { error: "Email already exists in authentication" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
