import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    // Extract token
    const token = authHeader.split("Bearer ")[1];
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(
      rateLimiters.studentProfile,
      uid
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Rate limit exceeded. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Fetch student profile from Firestore
    // First try querying by uid in student_profiles collection
    let profileData: any = null;

    const studentProfilesRef = adminDB.collection("student_profiles");
    const profileQuery = await studentProfilesRef.where("uid", "==", uid).limit(1).get();

    if (!profileQuery.empty) {
      profileData = profileQuery.docs[0].data();
    } else {
      // Fallback: try students collection with uid as document ID
      const studentDoc = await adminDB.collection("students").doc(uid).get();
      if (studentDoc.exists) {
        profileData = studentDoc.data();
      }
    }

    if (!profileData) {
      return NextResponse.json(
        { success: false, error: "Student profile not found" },
        { status: 404, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile fetched successfully",
        data: profileData
      },
      { 
        status: 200,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );

  } catch (error: any) {
    console.error("Error fetching student profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}