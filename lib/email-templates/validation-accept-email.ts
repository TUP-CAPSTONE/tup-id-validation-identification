export interface ValidationEmailParams {
  studentName: string
  studentId: string
  expirationDate: string
  validationRules: string[]
  claimSchedule?: {
    dateLabel: string
    timeSlotLabel: string
  }
}

export function buildValidationEmailHTML(params: ValidationEmailParams): string {
  const { studentName, studentId, expirationDate, validationRules, claimSchedule } = params

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">

        <!-- Header Card -->
        <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:20px;padding:28px 24px;color:#fff;box-shadow:0 12px 35px rgba(14,165,233,0.3);">
          <div style="font-size:15px;opacity:.92;letter-spacing:.5px;text-transform:uppercase;">TUP SIIVS</div>
          <div style="font-size:28px;font-weight:900;margin-top:8px;">ID Validation Approved ✓</div>
          <div style="font-size:15px;opacity:.94;margin-top:10px;line-height:1.6;">
            Your ID validation request has been accepted. Please read this email carefully for your claiming schedule and instructions.
          </div>
        </div>

        <!-- Main Content Card -->
        <div style="background:#ffffff;border-radius:20px;margin-top:18px;padding:28px;border:1.5px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.04);">

          <div style="font-size:17px;color:#0f172a;font-weight:700;margin-bottom:12px;">
            Hello ${studentName},
          </div>

          <div style="font-size:14px;color:#475569;line-height:1.8;">
            Congratulations! Your ID validation request for <b>${studentId}</b> has been approved by the Office of Student Affairs (OSA).
          </div>

          ${claimSchedule ? `
          <!-- Sticker Claiming Schedule -->
          <div style="margin-top:24px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:22px;text-align:center;">
            <div style="font-size:15px;color:#15803d;font-weight:800;margin-bottom:14px;">
              🗓️ Your Assigned Sticker Claiming Schedule
            </div>
            <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:16px 28px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
              <div style="font-size:18px;font-weight:900;color:#166534;margin-bottom:6px;">
                ${claimSchedule.dateLabel}
              </div>
              <div style="font-size:15px;font-weight:700;color:#15803d;">
                ⏰ ${claimSchedule.timeSlotLabel}
              </div>
            </div>
          </div>

          <!-- Reassurance Notice -->
          <div style="margin-top:16px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:18px;">
            <div style="font-size:13px;font-weight:800;color:#1e40af;margin-bottom:8px;">
              📌 Don't worry — you have until your QR code expires!
            </div>
            <div style="font-size:13px;color:#1e3a8a;line-height:1.8;">
              Your QR code is valid for <b>2 days</b> from the time this email was sent (expires on <b>${expirationDate}</b>).
              This means you do <b>not</b> need to visit the OSA specifically on <b>${claimSchedule.dateLabel}</b> only —
              you may visit on <b>any day within your QR code's validity period</b>, as long as you arrive during your assigned
              time slot of <b>${claimSchedule.timeSlotLabel}</b>.
            </div>
            <div style="margin-top:10px;font-size:12px;color:#1d4ed8;font-weight:600;">
              Example: If your schedule says Monday, 8:00 AM – 11:00 AM and your QR expires on Wednesday,
              you may visit on Monday, Tuesday, or Wednesday — but always between 8:00 AM and 11:00 AM.
            </div>
          </div>
          ` : ''}

          <!-- QR Code Section -->
          <div style="margin-top:24px;text-align:center;background:#f8fafc;border-radius:16px;padding:24px;border:2px dashed #cbd5e1;">
            <div style="font-size:15px;color:#0f172a;font-weight:700;margin-bottom:14px;">
              📱 Your Validation QR Code
            </div>
            <img
              src="cid:qrcode@validation"
              alt="Validation QR Code"
              width="280"
              style="
                display:block;
                width:100%;
                max-width:280px;
                height:auto;
                border-radius:12px;
                background:#fff;
                padding:12px;
                box-shadow:0 4px 10px rgba(0,0,0,0.08);
                margin:0 auto;
              "
            />
            <div style="margin-top:16px;font-size:13px;color:#64748b;line-height:1.6;">
              <b>Student ID:</b> ${studentId}
            </div>
            <div style="margin-top:8px;font-size:12px;color:#ef4444;font-weight:600;">
              ⏰ QR Code Expires on: ${expirationDate}
            </div>
          </div>

          <!-- Validation Steps -->
          <div style="margin-top:26px;background:#f0f9ff;padding:18px;border-left:4px solid #0ea5e9;border-radius:12px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:12px;">
              📋 Steps to Complete Your Validation:
            </div>
            <ol style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.9;">
              ${validationRules.map(rule => `<li style="margin-bottom:8px;">${rule}</li>`).join('')}
            </ol>
          </div>

          <!-- Important Reminders -->
          <div style="margin-top:20px;background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:10px;">
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">
              ⚠️ Important Reminders:
            </div>
            <ul style="margin:0;padding-left:20px;color:#78350f;font-size:12px;line-height:1.7;">
              <li>Do not share this QR code with anyone</li>
              <li>The QR code can only be used once and expires in 2 days</li>
              <li>Bring your original ID and COR to the OSA</li>
              ${claimSchedule ? `<li>You must arrive during your assigned time slot: <b>${claimSchedule.timeSlotLabel}</b></li>` : ''}
              <li>If you are unable to visit within your QR code's validity, please contact the OSA for assistance</li>
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