export interface RejectionEmailParams {
  studentName: string
  studentId: string
  rejectRemarks: string
  rejectedBy: string
  rejectedAt: string
}

export function buildRejectionEmailHTML(params: RejectionEmailParams): string {
  const { studentName, studentId, rejectRemarks, rejectedBy, rejectedAt } = params

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
        
        <!-- Header Card -->
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:20px;padding:28px 24px;color:#fff;box-shadow:0 12px 35px rgba(239,68,68,0.3);">
          <div style="font-size:15px;opacity:.92;letter-spacing:.5px;text-transform:uppercase;">TUP SIIVS</div>
          <div style="font-size:28px;font-weight:900;margin-top:8px;">ID Validation Update</div>
          <div style="font-size:15px;opacity:.94;margin-top:10px;line-height:1.6;">
            Your ID validation request requires attention and resubmission.
          </div>
        </div>

        <!-- Main Content Card -->
        <div style="background:#ffffff;border-radius:20px;margin-top:18px;padding:28px;border:1.5px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          
          <div style="font-size:17px;color:#0f172a;font-weight:700;margin-bottom:12px;">
            Hello ${studentName},
          </div>

          <div style="font-size:14px;color:#475569;line-height:1.8;">
            We regret to inform you that your ID validation request for <b>${studentId}</b> has been reviewed by the Office of Student Affairs (OSA) and requires resubmission.
          </div>

          <!-- Status Section -->
          <div style="margin-top:24px;background:#fef2f2;border-left:4px solid #ef4444;padding:20px;border-radius:12px;">
            <div style="font-size:15px;color:#991b1b;font-weight:700;margin-bottom:12px;">
              ❌ Request Status: Not Approved
            </div>
            <div style="font-size:13px;color:#7f1d1d;line-height:1.7;">
              <b>TUP ID:</b> ${studentId}<br>
              <b>Reviewed by:</b> ${rejectedBy}<br>
              <b>Review date:</b> ${rejectedAt}
            </div>
          </div>

          <!-- Remarks Section -->
          <div style="margin-top:24px;border-left:4px solid #f59e0b;padding-left:18px;background:#fffbeb;padding:18px;border-radius:12px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:12px;">
              📋 Remarks from OSA:
            </div>
            <div style="background:#ffffff;padding:16px;border-radius:8px;border:1px solid #fde68a;margin-top:10px;">
              <div style="font-size:13px;color:#78350f;line-height:1.8;white-space:pre-wrap;">${rejectRemarks}</div>
            </div>
          </div>

          <!-- Next Steps -->
          <div style="margin-top:24px;background:#f0f9ff;border-left:4px solid #0ea5e9;padding:18px;border-radius:12px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:12px;">
              📝 What to do next:
            </div>
            <ol style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.9;">
              <li style="margin-bottom:8px;">Carefully review the remarks from OSA above</li>
              <li style="margin-bottom:8px;">Address all the issues mentioned in the remarks</li>
              <li style="margin-bottom:8px;">Prepare the correct documents and information</li>
              <li style="margin-bottom:8px;">Submit a new validation request through the SIIVS portal</li>
              <li style="margin-bottom:8px;">Ensure all information is accurate and complete</li>
            </ol>
          </div>

          <!-- Important Reminders -->
          <div style="margin-top:20px;background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:10px;">
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">
              ⚠️ Important Reminders:
            </div>
            <ul style="margin:0;padding-left:20px;color:#78350f;font-size:12px;line-height:1.7;">
              <li>Double-check all information before resubmitting</li>
              <li>Ensure all required documents are clear and readable</li>
              <li>Visit OSA if you need clarification on the remarks</li>
              <li>Keep your contact information up to date</li>
            </ul>
          </div>

          <!-- Help Section -->
          <div style="margin-top:22px;font-size:12px;color:#64748b;line-height:1.7;text-align:center;padding-top:18px;border-top:1px solid #e2e8f0;">
            <b>Need Help?</b> Contact the Office of Student Affairs (OSA) for assistance.
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align:center;margin-top:16px;font-size:12px;color:#94a3b8;line-height:1.6;">
          © ${new Date().getFullYear()} TUP Student ID Validation System. All rights reserved.
        </div>

      </div>
    </div>
  `
}