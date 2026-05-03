import jsPDF from "jspdf"

export interface OffensePDFData {
  id: string
  studentUid: string
  studentNumber: string
  studentName: string
  studentEmail: string
  offenseNumber: string
  offenseTitle: string
  offenseType: "major" | "minor"
  offenseItems?: string[]
  offenseDescription: string
  sanction: string
  sanctionLevel: string
  dateCommitted: any
  dateRecorded: any
  recordedByEmail?: string
  status: "active" | "resolved"
  resolvedAt?: any
  resolvedBy?: string
  resolutionRemarks?: string
  guardianNotifiedAt?: any
  guardianNotifiedBy?: string
  guardianEmail?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFirestoreDate(value: any, withTime = false): string {
  if (!value) return "N/A"
  const date = value?.toDate ? value.toDate() : new Date(value)
  if (isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

function sanitize(text: string): string {
  return String(text ?? "")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/[^\x00-\x7F]/g, "?")
}

function drawSectionHeader(
  pdf: jsPDF,
  label: string,
  y: number,
  pageWidth: number,
  margin: number
): number {
  pdf.setFillColor(30, 58, 138)
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text(sanitize(label.toUpperCase()), margin + 4, y + 5.5)
  pdf.setTextColor(15, 23, 42)
  return y + 13
}

function drawRow(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelColWidth: number,
  lineH: number,
  maxValueWidth: number
): number {
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.setTextColor(71, 85, 105)
  pdf.text(sanitize(label), x, y)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(15, 23, 42)
  const lines = pdf.splitTextToSize(sanitize(value || "N/A"), maxValueWidth)
  pdf.text(lines, x + labelColWidth, y)
  return y + lines.length * lineH
}

// ─── Core PDF builder — returns jsPDF instance ────────────────────────────────

function buildOffensePDF(offense: OffensePDFData): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  const labelColWidth = 52
  const valueMaxWidth = contentWidth - labelColWidth - 4
  const lineH = 5.5
  let y = margin

  const isMajor = offense.offenseType === "major"

  // ── Header bar ─────────────────────────────────────────────────────────────
  pdf.setFillColor(30, 58, 138)
  pdf.rect(0, 0, pageWidth, 28, "F")

  pdf.setFillColor(isMajor ? 220 : 217, isMajor ? 38 : 119, isMajor ? 38 : 6)
  pdf.rect(0, 28, pageWidth, 3, "F")

  pdf.setTextColor(255, 255, 255)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(15)
  pdf.text("TECHNOLOGICAL UNIVERSITY OF THE PHILIPPINES", pageWidth / 2, 10, { align: "center" })
  pdf.setFontSize(9.5)
  pdf.setFont("helvetica", "normal")
  pdf.text("Office of Student Affairs  |  Disciplinary Records", pageWidth / 2, 17, { align: "center" })
  pdf.setFontSize(8.5)
  pdf.text("Ayala Blvd., Ermita, Manila, 1000 Metro Manila, Philippines", pageWidth / 2, 23, { align: "center" })

  y = 38

  // ── Document title ─────────────────────────────────────────────────────────
  pdf.setTextColor(15, 23, 42)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(13)
  pdf.text("STUDENT DISCIPLINARY OFFENSE REPORT", pageWidth / 2, y, { align: "center" })
  y += 5

  // Offense type badge
  const badgeColor: [number, number, number] = isMajor ? [220, 38, 38] : [217, 119, 6]
  const badgeLabel = `${isMajor ? "MAJOR" : "MINOR"} OFFENSE  |  #${offense.offenseNumber}`
  const badgeW = 72
  pdf.setFillColor(...badgeColor)
  pdf.roundedRect(pageWidth / 2 - badgeW / 2, y, badgeW, 7, 3, 3, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "bold")
  pdf.text(badgeLabel, pageWidth / 2, y + 4.8, { align: "center" })
  y += 12

  // Status badge
  const isActive = offense.status === "active"
  const statusColor: [number, number, number] = isActive ? [220, 38, 38] : [22, 163, 74]
  pdf.setFillColor(...statusColor)
  pdf.roundedRect(pageWidth / 2 - 20, y, 40, 6, 2, 2, "F")
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(7.5)
  pdf.text(`STATUS: ${offense.status.toUpperCase()}`, pageWidth / 2, y + 4.2, { align: "center" })
  y += 11

  // Reference line
  pdf.setTextColor(100, 116, 139)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7.5)
  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
  pdf.text(
    `Document Reference: OSA-OFF-${offense.id.slice(0, 8).toUpperCase()}   |   Generated: ${generatedOn}`,
    margin, y
  )
  y += 2

  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.4)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6

  // ── 1. Student Information ─────────────────────────────────────────────────
  y = drawSectionHeader(pdf, "1.  Student Information", y, pageWidth, margin)

  const col2X = margin + contentWidth / 2
  const halfW = contentWidth / 2 - 4
  const savY = y

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(71, 85, 105)
  pdf.text("Full Name:", margin, y)
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(15, 23, 42)
  pdf.text(sanitize(offense.studentName), margin + 28, y)
  y += lineH

  pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105)
  pdf.text("Student No.:", margin, y)
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(15, 23, 42)
  pdf.text(sanitize(offense.studentNumber), margin + 28, y)
  y += lineH

  let ry = savY
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105)
  pdf.text("Email:", col2X, ry)
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(15, 23, 42)
  const emailLines = pdf.splitTextToSize(sanitize(offense.studentEmail || "N/A"), halfW - 14)
  pdf.text(emailLines, col2X + 14, ry)
  ry += emailLines.length * lineH

  y = Math.max(y, ry) + 4
  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6

  // ── 2. Offense Details ─────────────────────────────────────────────────────
  y = drawSectionHeader(pdf, "2.  Offense Details", y, pageWidth, margin)

  y = drawRow(pdf, "Offense Type:", `${isMajor ? "Major" : "Minor"} Offense`, margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
  y = drawRow(pdf, "Offense No.:", offense.offenseNumber, margin, y, labelColWidth, lineH, valueMaxWidth); y += 1

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(71, 85, 105)
  pdf.text("Offense Title:", margin, y)
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(15, 23, 42)
  const titleLines = pdf.splitTextToSize(sanitize(offense.offenseTitle), valueMaxWidth)
  pdf.text(titleLines, margin + labelColWidth, y)
  y += titleLines.length * lineH + 1

  if (offense.offenseItems && offense.offenseItems.length > 0) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(71, 85, 105)
    pdf.text("Includes Acts:", margin, y)
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(15, 23, 42)
    let iy = y
    offense.offenseItems.forEach((item, idx) => {
      const wrapped = pdf.splitTextToSize(sanitize(`${idx + 1}. ${item}`), valueMaxWidth)
      pdf.text(wrapped, margin + labelColWidth, iy)
      iy += wrapped.length * lineH
    })
    y = iy + 1
  }

  y += 2
  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6

  // ── 3. Sanction ────────────────────────────────────────────────────────────
  y = drawSectionHeader(pdf, "3.  Sanction", y, pageWidth, margin)

  const sanctionLevelLabel =
    offense.sanctionLevel === "first" ? "1st Offense" :
    offense.sanctionLevel === "second" ? "2nd Offense" : "3rd Offense"

  y = drawRow(pdf, "Occurrence:", sanctionLevelLabel, margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
  y = drawRow(pdf, "Sanction Applied:", offense.sanction, margin, y, labelColWidth, lineH, valueMaxWidth); y += 3

  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6

  // ── 4. Incident Record ─────────────────────────────────────────────────────
  y = drawSectionHeader(pdf, "4.  Incident Record", y, pageWidth, margin)

  y = drawRow(pdf, "Date Committed:", formatFirestoreDate(offense.dateCommitted), margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
  y = drawRow(pdf, "Date Recorded:", formatFirestoreDate(offense.dateRecorded, true), margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
  y = drawRow(pdf, "Recorded By:", offense.recordedByEmail || "OSA Staff", margin, y, labelColWidth, lineH, valueMaxWidth); y += 3

  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 6

  // ── 5. Narrative ───────────────────────────────────────────────────────────
  y = drawSectionHeader(pdf, "5.  Incident Narrative / Description", y, pageWidth, margin)

  const narrativeLines = pdf.splitTextToSize(
    sanitize(offense.offenseDescription || "No description provided."),
    contentWidth - 6
  )
  const narrativeBoxH = narrativeLines.length * lineH + 8

  if (y + narrativeBoxH > pageHeight - 30) { pdf.addPage(); y = margin }

  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(226, 232, 240)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(margin, y, contentWidth, narrativeBoxH, 3, 3, "FD")
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(15, 23, 42)
  pdf.text(narrativeLines, margin + 3, y + 5.5)
  y += narrativeBoxH + 6

  // ── 6. Resolution (if resolved) ────────────────────────────────────────────
  if (offense.status === "resolved") {
    if (y + 30 > pageHeight - 30) { pdf.addPage(); y = margin }

    pdf.setDrawColor(226, 232, 240)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6

    y = drawSectionHeader(pdf, "6.  Resolution Details", y, pageWidth, margin)

    y = drawRow(pdf, "Status:", "RESOLVED", margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
    y = drawRow(pdf, "Resolved On:", formatFirestoreDate(offense.resolvedAt, true), margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
    y = drawRow(pdf, "Resolved By:", offense.resolvedBy || "OSA Staff", margin, y, labelColWidth, lineH, valueMaxWidth); y += 1

    if (offense.resolutionRemarks) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(71, 85, 105)
      pdf.text("Resolution Remarks:", margin, y)
      y += lineH

      const remarksLines = pdf.splitTextToSize(sanitize(offense.resolutionRemarks), contentWidth - 6)
      const remarksBoxH = remarksLines.length * lineH + 8
      pdf.setFillColor(240, 253, 244); pdf.setDrawColor(134, 239, 172)
      pdf.roundedRect(margin, y, contentWidth, remarksBoxH, 3, 3, "FD")
      pdf.setFont("helvetica", "normal"); pdf.setTextColor(15, 23, 42)
      pdf.text(remarksLines, margin + 3, y + 5.5)
      y += remarksBoxH + 4
    }
  }

  // ── 7. Guardian Notification ───────────────────────────────────────────────
  if (offense.guardianNotifiedAt) {
    if (y + 24 > pageHeight - 30) { pdf.addPage(); y = margin }

    pdf.setDrawColor(226, 232, 240)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6

    const sectionNum = offense.status === "resolved" ? "7" : "6"
    y = drawSectionHeader(pdf, `${sectionNum}.  Guardian Notification`, y, pageWidth, margin)

    y = drawRow(pdf, "Guardian Email:", offense.guardianEmail || "N/A", margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
    y = drawRow(pdf, "Notified On:", formatFirestoreDate(offense.guardianNotifiedAt, true), margin, y, labelColWidth, lineH, valueMaxWidth); y += 1
    y = drawRow(pdf, "Sent By:", offense.guardianNotifiedBy || "OSA Staff", margin, y, labelColWidth, lineH, valueMaxWidth); y += 4
  }

  // ── Signature block ────────────────────────────────────────────────────────
  const finalY = Math.max(y + 10, pageHeight - 52)
  pdf.setDrawColor(203, 213, 225)
  pdf.line(margin, finalY, pageWidth - margin, finalY)

  const sigColW = contentWidth / 3
  const sigLabels = ["Prepared By:", "Noted By:", "OSA Director:"]
  sigLabels.forEach((label, i) => {
    const sx = margin + i * sigColW
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105)
    pdf.text(label, sx, finalY + 5)
    pdf.setDrawColor(100, 116, 139)
    pdf.line(sx, finalY + 20, sx + sigColW - 8, finalY + 20)
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139)
    pdf.text("Signature over Printed Name", sx, finalY + 25)
    pdf.text("Date: _______________", sx, finalY + 30)
  })

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = (pdf as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFillColor(30, 58, 138)
    pdf.rect(0, pageHeight - 10, pageWidth, 10, "F")
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont("helvetica", "normal")
    pdf.text(
      `TUP OSA Disciplinary Record  |  ${offense.studentName} — ${offense.offenseTitle}  |  Page ${p} of ${totalPages}`,
      pageWidth / 2, pageHeight - 4, { align: "center" }
    )
  }

  return pdf
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates the offense PDF and triggers a file download.
 */
export function generateOffensePDF(offense: OffensePDFData): void {
  const pdf = buildOffensePDF(offense)
  const safeStudentName = offense.studentName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")
  const fileName = `OSA_Offense_${safeStudentName}_${offense.offenseNumber}_${offense.id.slice(0, 6).toUpperCase()}.pdf`
  pdf.save(fileName)
}

/**
 * Generates the offense PDF and opens the browser's native print dialog.
 * Injects the PDF as a blob URL into a hidden iframe so only the document
 * is printed — not the surrounding page.
 */
export function printOffensePDF(offense: OffensePDFData): void {
  const pdf = buildOffensePDF(offense)
  const blob = pdf.output("blob")
  const blobURL = URL.createObjectURL(blob)

  // Reuse an existing hidden iframe or create a new one
  const IFRAME_ID = "osa-print-frame"
  let iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null

  if (!iframe) {
    iframe = document.createElement("iframe")
    iframe.id = IFRAME_ID
    iframe.style.cssText = "position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;opacity:0;border:none;"
    document.body.appendChild(iframe)
  }

  iframe.src = blobURL

  iframe.onload = () => {
    try {
      iframe!.contentWindow?.focus()
      iframe!.contentWindow?.print()
    } finally {
      // Clean up the blob URL after a short delay to allow printing to start
      setTimeout(() => URL.revokeObjectURL(blobURL), 10_000)
    }
  }
}