import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/extend-period
 * Extend the current validation period by adding days to the end date
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    
    // Check if user is admin (via custom claims or Firestore)
    let isAdmin = false
    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB.collection("users").doc(decodedToken.uid).get()
      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { extensionDays } = await req.json()

    if (!extensionDays || extensionDays < 1 || extensionDays > 90) {
      return NextResponse.json(
        { error: "Extension days must be between 1 and 90" },
        { status: 400 }
      )
    }

    console.log(`Extending validation period by ${extensionDays} days`)

    // Get current validation period settings
    const settingsRef = adminDB.collection("system_settings").doc("idValidation")
    const settingsDoc = await settingsRef.get()

    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: "No validation period configured" },
        { status: 400 }
      )
    }

    const settings = settingsDoc.data()
    const currentEndDate = settings?.endDate

    if (!currentEndDate) {
      return NextResponse.json(
        { error: "No end date set for current period" },
        { status: 400 }
      )
    }

    // Calculate new end date
    const currentEnd = new Date(currentEndDate)
    const newEnd = new Date(currentEnd.getTime() + extensionDays * 24 * 60 * 60 * 1000)
    const newEndDateString = newEnd.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm

    // Update the end date
    await settingsRef.update({
      endDate: newEndDateString,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.uid,
      lastExtension: {
        date: new Date().toISOString(),
        daysAdded: extensionDays,
        previousEndDate: currentEndDate,
        newEndDate: newEndDateString,
        extendedBy: decodedToken.uid,
      },
    })

    console.log(`Period extended. New end date: ${newEndDateString}`)

    return NextResponse.json({
      success: true,
      message: `Validation period extended by ${extensionDays} days`,
      newEndDate: newEndDateString,
      previousEndDate: currentEndDate,
    })
  } catch (error) {
    console.error("Error extending period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}