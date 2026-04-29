export interface ValidationCompleteEmailParams {
  studentName: string
  studentId: string
  validatedBy: string
  semester: string
  schoolYear: string
}

export function buildValidationCompleteEmailHTML(
  params: ValidationCompleteEmailParams
): string {
  const { studentName, studentId, validatedBy, semester, schoolYear } = params

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">

        <!-- Header Card -->
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);border-radius:20px;padding:28px 24px;color:#fff;box-shadow:0 12px 35px rgba(22,163,74,0.3);">
          <div style="font-size:15px;opacity:.92;letter-spacing:.5px;text-transform:uppercase;">TUP SIIVS</div>
          <div style="font-size:28px;font-weight:900;margin-top:8px;">ID Validation Complete ✓</div>
          <div style="font-size:15px;opacity:.94;margin-top:10px;line-height:1.6;">
            Your student ID has been successfully validated by the Office of Student Affairs.
          </div>
        </div>

        <!-- Main Content Card -->
        <div style="background:#ffffff;border-radius:20px;margin-top:18px;padding:28px;border:1.5px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.04);">

          <div style="font-size:17px;color:#0f172a;font-weight:700;margin-bottom:12px;">
            Hello ${studentName},
          </div>

          <div style="font-size:14px;color:#475569;line-height:1.8;">
            Congratulations! Your student ID for <b>${studentId}</b> has been successfully validated 
            for <b>${semester} – ${schoolYear}</b>. Your validation sticker has been affixed to your ID 
            by OSA staff.
          </div>

          <!-- Validation Confirmed Badge -->
          <div style="margin-top:24px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🎉</div>
            <div style="font-size:18px;font-weight:900;color:#166534;margin-bottom:6px;">
              ID Successfully Validated
            </div>
            <div style="font-size:13px;color:#15803d;margin-top:8px;">
              Validated by: <b>${validatedBy}</b>
            </div>
            <div style="margin-top:12px;display:inline-block;background:#16a34a;color:#fff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:999px;letter-spacing:.4px;">
              ✓ ID VALIDATED – ${semester} ${schoolYear}
            </div>
          </div>

          <!-- What this means -->
          <div style="margin-top:24px;background:#f0f9ff;padding:18px;border-left:4px solid #0ea5e9;border-radius:12px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:12px;">
              📋 What this means for you:
            </div>
            <ol style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.9;">
              <li style="margin-bottom:8px;">Your student ID is now officially validated for <b>${semester} – ${schoolYear}</b>.</li>
              <li style="margin-bottom:8px;">You may use your validated ID to access campus facilities and services.</li>
              <li style="margin-bottom:8px;">Your validation status is recorded in the system and visible in your student account.</li>
              <li style="margin-bottom:8px;">You can verify your validation status anytime by checking your account — look for the <b>"ID Validated"</b> badge beside your name.</li>
            </ol>
          </div>

          <!-- Important Reminders -->
          <div style="margin-top:20px;background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:10px;">
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">
              ⚠️ Important Reminders:
            </div>
            <ul style="margin:0;padding-left:20px;color:#78350f;font-size:12px;line-height:1.7;">
              <li>Keep your validated ID with you at all times within campus.</li>
              <li>Do not tamper with or remove the validation sticker from your ID.</li>
              <li>Your validation is valid for this semester only. You will need to revalidate next semester.</li>
              <li>If your ID is lost or damaged, contact the OSA immediately.</li>
            </ul>
          </div>

          <!-- Check your account notice -->
          <div style="margin-top:20px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:18px;text-align:center;">
            <div style="font-size:13px;font-weight:800;color:#1e40af;margin-bottom:6px;">
              📱 Check your student account
            </div>
            <div style="font-size:13px;color:#1e3a8a;line-height:1.8;">
              Log in to your account and look for the <b>"ID Validated" badge</b> beside your name 
              to confirm your validation status is reflected in the system.
            </div>
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