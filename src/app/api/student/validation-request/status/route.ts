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
      rateLimiters.studentValidationStatus,
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

    // Query validation_requests2 collection for existing request
    const validationRequestsRef = adminDB.collection("validation_requests2");
    const validationQuery = await validationRequestsRef
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (validationQuery.empty) {
      // No existing request found
      return NextResponse.json(
        {
          success: true,
          message: "No validation request found",
          data: null
        },
        { 
          status: 200,
          headers: createRateLimitHeaders(rateLimitResult)
        }
      );
    }

    // Return existing request
    const requestDoc = validationQuery.docs[0];
    const requestData = {
      id: requestDoc.id,
      ...requestDoc.data()
    };

    return NextResponse.json(
      {
        success: true,
        message: "Validation request found",
        data: requestData
      },
      { 
        status: 200,
        headers: createRateLimitHeaders(rateLimitResult)
      }
    );

  } catch (error: any) {
    console.error("Error fetching validation status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}