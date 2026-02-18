import { NextResponse } from "next/server"
import { adminDB } from "@/lib/firebaseAdmin"

function buildRejectionEmailHTML(params: {
  studentName: string
  remarks: string
  registerUrl: string
}) {
  const { studentName, remarks, registerUrl } = params

  const safeRemarks = String(remarks)
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

  return `
    <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:650px;margin:0 auto;padding:28px 18px;">
        
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:18px;padding:22px 22px 18px 22px;color:#fff;box-shadow:0 10px 30px rgba(2,6,23,0.25);">
          <div style="font-size:14px;opacity:.95;letter-spacing:.4px;">TUP SIIVS</div>
          <div style="font-size:24px;font-weight:800;margin-top:6px;">Registration Rejected ❌</div>
          <div style="font-size:14px;opacity:.95;margin-top:8px;line-height:1.5;">
            Your registration request was reviewed, but it could not be approved.
          </div>
        </div>

        <div style="background:#ffffff;border-radius:18px;margin-top:16px;padding:22px;border:1px solid #e7e9f2;">
          <div style="font-size:16px;color:#0f172a;font-weight:700;margin-bottom:10px;">
            Hello ${studentName},
          </div>

          <div style="font-size:14px;color:#334155;line-height:1.7;">
            We regret to inform you that your registration request has been <b>rejected</b>.
            Please review the reason below:
          </div>

          <div style="margin-top:16px;border-radius:16px;border:1px solid #fee2e2;background:#fff1f2;padding:16px;">
            <div style="font-size:13px;color:#991b1b;margin-bottom:10px;font-weight:800;">
              Reason for Rejection
            </div>

            <div style="font-size:14px;color:#7f1d1d;line-height:1.6;white-space:pre-line;">
              ${safeRemarks}
            </div>
          </div>

          <div style="margin-top:18px;">
            <a href="${registerUrl}"
              style="display:inline-block;background:#b32032;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 18px;border-radius:12px;">
              Register Again →
            </a>
          </div>

          <div style="margin-top:16px;font-size:12px;color:#64748b;line-height:1.6;">
            If you believe this was a mistake, please contact the administration or submit a new registration request with the correct information.
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
    const { requestId, remarks } = await req.json()

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
    }

    if (!remarks || typeof remarks !== "string") {
      return NextResponse.json({ error: "Missing remarks" }, { status: 400 })
    }

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
    const studentName = data.name || "Student"

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!studentEmail || !emailRegex.test(studentEmail)) {
      return NextResponse.json(
        { error: "Invalid student email in request document" },
        { status: 400 }
      )
    }

    const now = new Date()

    const registerUrl =
      process.env.APP_REGISTER_URL || "https://tup-id-validation-identification.vercel.app/clients/students/register"

    const html = buildRejectionEmailHTML({
      studentName,
      remarks,
      registerUrl,
    })

    const batch = adminDB.batch()

    // ✅ 1. Update the original registration_requests document status to "rejected"
    batch.update(requestRef, {
      status: "rejected",
      remarks: remarks,
      processedAt: now,
    })

    // ✅ 2. Queue rejection email
    batch.set(adminDB.collection("mail").doc(), {
      to: studentEmail,
      message: {
        subject: "Registration Rejected - TUP Student Registration",
        html,
      },
    })

    // ✅ 3. (Optional) Archive a copy in rejected_requests collection for audit trail
    batch.set(adminDB.collection("rejected_requests").doc(), {
      originalRequestId: requestId,
      ...data,
      status: "rejected",
      remarks,
      processedAt: now,
    })

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Reject registration error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}