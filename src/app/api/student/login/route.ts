import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const USERS_COLLECTION = "users";

export async function POST(request: NextRequest) {
  try {
    // Get identifier for rate limiting (IP address or email)
    const identifier = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "anonymous";

    // Check rate limit - 5 login attempts per minute
    const rateLimitResult = await checkRateLimit(
      rateLimiters.studentLogin,
      identifier
    );

    // Create rate limit headers
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

    // If rate limit exceeded, return 429 error
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many login attempts. Please try again later.",
          retryAfter: rateLimitResult.reset 
        },
        { 
          status: 429,
          headers: rateLimitHeaders
        }
      );
    }

    const { uid } = await request.json();

    // Validate input
    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Fetch user from users collection
    let userData: any = null;
    const userQuery = query(
      collection(db, USERS_COLLECTION),
      where("uid", "==", uid)
    );
    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {
      userData = userSnap.docs[0].data();
    } else {
      // Fallback for older records that used UID as document id
      const legacyRef = doc(db, USERS_COLLECTION, uid);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        userData = legacySnap.data();
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: "User account not found. Please contact support." },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // Role Guard: Validate role === "student"
    if (userData.role !== "student") {
      return NextResponse.json(
        { error: "Unauthorized Access: This login is for students only." },
        { status: 403, headers: rateLimitHeaders }
      );
    }

    // Account Status Check
    if (userData.accountStatus === "disabled") {
      return NextResponse.json(
        {
          error:
            "This account is disabled. Contact the Admin for more information.",
        },
        { status: 403, headers: rateLimitHeaders }
      );
    }

    // Return success response with rate limit headers
    return NextResponse.json(
      {
        success: true,
        user: {
          uid: userData.uid,
          email: userData.email,
          role: userData.role,
          accountStatus: userData.accountStatus,
        },
      },
      { 
        status: 200,
        headers: rateLimitHeaders
      }
    );
  } catch (error: any) {
    console.error("Validation error:", error);

    return NextResponse.json(
      { error: error?.message || "Validation failed. Please try again." },
      { status: 500 }
    );
  }
}