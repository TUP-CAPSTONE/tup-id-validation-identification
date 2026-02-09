import { NextResponse } from "next/server"
import { adminAuth, adminDB } from "@/lib/firebaseAdmin"
import { cookies } from "next/headers"
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    /**
     * 1️⃣ Rate limiting check
     */
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    
    const rateLimit = await checkRateLimit(
      rateLimiters.osaLogin,
      `osa-login:${ip}`
    )

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          resetAt: rateLimit.reset,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    /**
     * 2️⃣ Validate token
     */
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { 
          status: 400,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    /**
     * 3️⃣ Verify Firebase ID token
     */
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    /**
     * 4️⃣ Get user document from Firestore
     */
    const userRef = adminDB.collection("users").doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User record not found" },
        { 
          status: 403,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    const userData = userSnap.data()

    console.log("User data:", userData)
    console.log("User role:", userData?.role)
    console.log("Account status:", userData?.accountStatus)

    /**
     * 5️⃣ Check account status
     */
    const accountStatus = userData?.accountStatus?.toLowerCase()
    
    if (accountStatus === "disabled") {
      return NextResponse.json(
        { error: "This account is disabled. Contact OSA or the Admin for more information." },
        { 
          status: 403,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    if (accountStatus !== "active") {
      return NextResponse.json(
        { error: "Account status is invalid. Contact OSA or the Admin for assistance." },
        { 
          status: 403,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    /**
     * 6️⃣ Check OSA role (case-insensitive)
     */
    const userRole = userData?.role?.toUpperCase()
    
    if (userRole !== "OSA") {
      console.error(`OSA privilege check failed. Expected 'OSA', got '${userData?.role}'`)
      
      // Provide detailed error message
      let errorMessage = "Not authorized as OSA"
      if (!userData?.role) {
        errorMessage = "Account does not have OSA privileges. Role field is missing."
      } else {
        errorMessage = `Not authorized as OSA. Your account role is: ${userData.role}`
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { 
          status: 403,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    /**
     * 7️⃣ Create session cookie
     */
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    })

    ;(await cookies()).set("osa_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    })

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit),
      }
    )
  } catch (error) {
    console.error("OSA login error:", error)
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
}