import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    
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

    // ── Fetch current semester ────────────────────────────────────────────────
    const semesterSnap = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get();

    const semesterData = semesterSnap.exists ? semesterSnap.data()! : null;
    const currentSemester: string = semesterData?.semester ?? "";
    const currentSchoolYear: string = semesterData?.schoolYear ?? "";

    // ── Query existing request ────────────────────────────────────────────────
    const validationRequestsRef = adminDB.collection("validation_requests2");
    const validationQuery = await validationRequestsRef
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (validationQuery.empty) {
      return NextResponse.json(
        { success: true, message: "No validation request found", data: null },
        { status: 200, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const requestDoc = validationQuery.docs[0];
    const requestData = requestDoc.data();

    // ── If accepted, check if it belongs to the current semester ─────────────
    if (requestData.status === "accepted") {
      const isSameSemester =
        requestData.semester === currentSemester &&
        requestData.schoolYear === currentSchoolYear;

      if (!isSameSemester) {
        // Accepted but from a previous semester — treat as no request for this semester
        return NextResponse.json(
          { success: true, message: "No validation request found", data: null },
          { status: 200, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Validation request found",
        data: { id: requestDoc.id, ...requestData }
      },
      { status: 200, headers: createRateLimitHeaders(rateLimitResult) }
    );

  } catch (error: any) {
    console.error("Error fetching validation status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}