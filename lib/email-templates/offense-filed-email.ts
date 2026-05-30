export interface OffenseFiledEmailParams {
  studentName: string
  studentNumber: string
  offenseType: "major" | "minor"
  offenseNumber: string
  offenseTitle: string
  offenseItems: string[]
  sanctionLevel: "first" | "second" | "third"
  sanction: string
  dateCommitted: string
  dateRecorded: string
  recordedByEmail: string
  narrativeSummary?: string
}

export function buildOffenseFiledEmailHTML(params: OffenseFiledEmailParams): string {
  const {
    studentName,
    studentNumber,
    offenseType,
    offenseNumber,
    offenseTitle,
    offenseItems,
    sanctionLevel,
    sanction,
    dateCommitted,
    dateRecorded,
    recordedByEmail,
    narrativeSummary,
  } = params

  const isMajor = offenseType === "major"
  const offenseBadgeColor = isMajor ? "#dc2626" : "#d97706"
  const offenseBadgeBg = isMajor ? "#fef2f2" : "#fffbeb"
  const offenseBadgeBorder = isMajor ? "#fca5a5" : "#fcd34d"
  const headerGradient = isMajor
    ? "linear-gradient(135deg,#dc2626,#b91c1c)"
    : "linear-gradient(135deg,#d97706,#b45309)"
  const headerShadow = isMajor
    ? "0 12px 35px rgba(220,38,38,0.3)"
    : "0 12px 35px rgba(217,119,6,0.3)"

  const sanctionLevelLabel =
    sanctionLevel === "first" ? "1st Offense" :
    sanctionLevel === "second" ? "2nd Offense" : "3rd Offense"

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">

        <!-- Header Card -->
        <div style="background:${headerGradient};border-radius:20px;padding:28px 24px;color:#fff;box-shadow:${headerShadow};">
          <div style="font-size:15px;opacity:.92;letter-spacing:.5px;text-transform:uppercase;">TUP Office of Student Affairs</div>
          <div style="font-size:28px;font-weight:900;margin-top:8px;">⚠️ Offense Notice</div>
          <div style="font-size:15px;opacity:.94;margin-top:10px;line-height:1.6;">
            An offense has been officially filed against your record. Please read this notice carefully.
          </div>
        </div>

        <!-- Main Content Card -->
        <div style="background:#ffffff;border-radius:20px;margin-top:18px;padding:28px;border:1.5px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.04);">

          <div style="font-size:17px;color:#0f172a;font-weight:700;margin-bottom:12px;">
            Dear ${studentName},
          </div>

          <div style="font-size:14px;color:#475569;line-height:1.8;">
            This is an official notice from the <b>Office of Student Affairs (OSA)</b> that a disciplinary offense has been recorded against your student record (<b>${studentNumber}</b>). Please review the details below.
          </div>

          <!-- Offense Details -->
          <div style="margin-top:24px;background:${offenseBadgeBg};border:2px solid ${offenseBadgeBorder};border-radius:16px;padding:22px;">
            <div style="font-size:15px;color:${offenseBadgeColor};font-weight:800;margin-bottom:16px;">
              ${isMajor ? "🔴" : "🟡"} ${isMajor ? "Major" : "Minor"} Offense — #${offenseNumber}
            </div>

            <div style="background:#ffffff;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
              <div style="font-size:15px;font-weight:900;color:#0f172a;margin-bottom:10px;">
                ${offenseTitle}
              </div>
              ${offenseItems && offenseItems.length > 0 ? `
              <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.9;">
                ${offenseItems.map(item => `<li style="margin-bottom:4px;">${item}</li>`).join("")}
              </ul>
              ` : ""}
            </div>
          </div>

          <!-- Sanction -->
          <div style="margin-top:20px;background:#fff7ed;border-left:4px solid #f97316;border-radius:12px;padding:18px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:8px;">
              ⚖️ Applicable Sanction
            </div>
            <div style="font-size:13px;color:#7c2d12;line-height:1.8;">
              <b>${sanctionLevelLabel}:</b> ${sanction}
            </div>
          </div>

          <!-- Incident Info -->
          <div style="margin-top:20px;background:#f8fafc;border-radius:12px;padding:18px;border:1.5px solid #e2e8f0;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:12px;">
              📋 Incident Information
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;color:#475569;">
              <tr>
                <td style="padding:6px 0;font-weight:600;color:#0f172a;width:45%;">Date Committed:</td>
                <td style="padding:6px 0;">${dateCommitted}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-weight:600;color:#0f172a;">Date Recorded:</td>
                <td style="padding:6px 0;">${dateRecorded}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-weight:600;color:#0f172a;">Filed By:</td>
                <td style="padding:6px 0;">${recordedByEmail}</td>
              </tr>
            </table>
          </div>

          ${narrativeSummary ? `
          <!-- Narrative Summary -->
          <div style="margin-top:20px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:12px;padding:18px;">
            <div style="font-size:14px;color:#0f172a;font-weight:700;margin-bottom:8px;">
              📝 Incident Description
            </div>
            <div style="font-size:13px;color:#334155;line-height:1.8;">
              ${narrativeSummary}
            </div>
          </div>
          ` : ""}

          <!-- Important Reminders -->
          <div style="margin-top:20px;background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:10px;">
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">
              ⚠️ Important Reminders:
            </div>
            <ul style="margin:0;padding-left:20px;color:#78350f;font-size:12px;line-height:1.7;">
              <li>This offense has been officially recorded in your student disciplinary record</li>
              <li>You may be required to appear before the OSA for a hearing regarding this matter</li>
              <li>Accumulation of offenses may result in more severe sanctions</li>
              <li>If you believe this filing is erroneous, please contact the OSA immediately</li>
            </ul>
          </div>

          <!-- Help Section -->
          <div style="margin-top:22px;font-size:12px;color:#64748b;line-height:1.7;text-align:center;padding-top:18px;border-top:1px solid #e2e8f0;">
            <b>Questions or Concerns?</b> Contact the Office of Student Affairs (OSA) for assistance.
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align:center;margin-top:16px;font-size:12px;color:#94a3b8;line-height:1.6;">
          © ${new Date().getFullYear()} Technological University of the Philippines — Office of Student Affairs. All rights reserved.
        </div>

      </div>
    </div>
  `
}