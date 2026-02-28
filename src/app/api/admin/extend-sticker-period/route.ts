import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"

/**
 * POST /api/admin/extend-sticker-period
 *
 * Extends the sticker claiming end date by N days without touching the start date.
 * Mirrors the logic of /api/admin/extend-period but targets the
 * system_settings/stickerClaiming document.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("admin_session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)

    let isAdmin = false

    if (decodedToken.role === "admin") {
      isAdmin = true
    } else {
      const userSnap = await adminDB
        .collection("users")
        .doc(decodedToken.uid)
        .get()

      if (userSnap.exists && userSnap.data()?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // ── Validate input ───────────────────────────────────────────────────────
    const { extensionDays } = await req.json()

    if (
      typeof extensionDays !== "number" ||
      !Number.isInteger(extensionDays) ||
      extensionDays < 1 ||
      extensionDays > 90
    ) {
      return NextResponse.json(
        { error: "extensionDays must be an integer between 1 and 90" },
        { status: 400 }
      )
    }

    // ── Fetch existing sticker claiming period ───────────────────────────────
    const stickerRef = adminDB
      .collection("system_settings")
      .doc("stickerClaiming")

    const stickerDoc = await stickerRef.get()

    if (!stickerDoc.exists) {
      return NextResponse.json(
        { error: "No sticker claiming period found. Please set one first." },
        { status: 404 }
      )
    }

    const data = stickerDoc.data()

    if (!data?.endDate) {
      return NextResponse.json(
        { error: "Sticker claiming period has no end date to extend." },
        { status: 400 }
      )
    }

    // ── Compute new end date ─────────────────────────────────────────────────
    const currentEndDate = new Date(data.endDate)
    const EXTENSION_MS = extensionDays * 24 * 60 * 60 * 1000
    const newEndDate = new Date(currentEndDate.getTime() + EXTENSION_MS)
    const newEndISO = newEndDate.toISOString()

    // ── Persist ──────────────────────────────────────────────────────────────
    await stickerRef.set(
      {
        endDate: newEndISO,
        updatedAt: new Date().toISOString(),
        updatedBy: decodedToken.uid,
        lastExtensionDays: extensionDays,
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      newEndDate: newEndISO,
      message: `Sticker claiming period extended by ${extensionDays} day${extensionDays === 1 ? "" : "s"}.`,
    })
  } catch (error) {
    console.error("Error extending sticker claiming period:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}