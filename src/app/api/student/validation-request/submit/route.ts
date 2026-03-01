import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    console.log("=== Starting validation request submission ===");

    // ── Auth ─────────────────────────────────────────────────────────────────
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
    } catch (error: any) {
      console.error("Token verification error:", error.message);
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    console.log(`✓ Authenticated user: ${uid}`);

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(
      rateLimiters.studentValidationSubmit,
      uid
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. You can only submit 3 requests per hour. Please try again later.",
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // ── Fetch current semester (required) ────────────────────────────────────
    const semesterSnap = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get();

    if (!semesterSnap.exists) {
      console.error("❌ No current semester set in system_settings/currentSemester");
      return NextResponse.json(
        {
          success: false,
          error: "Validation requests are not open yet. No semester has been configured. Please contact the admin.",
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const semesterData = semesterSnap.data()!;
    const currentSemester: string = semesterData.semester;
    const currentSchoolYear: string = semesterData.schoolYear;

    if (!currentSemester || !currentSchoolYear) {
      console.error("❌ Semester document exists but fields are missing:", semesterData);
      return NextResponse.json(
        {
          success: false,
          error: "Semester configuration is incomplete. Please contact the admin.",
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    console.log(`📅 Current semester: ${currentSemester} | ${currentSchoolYear}`);

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await request.json();
    const {
      studentNumber,
      studentName,
      email,
      phoneNumber,
      course,
      college,
      section,
      yearLevel,
      corUrl,
      idPhotoUrl,
      faceFrontUrl,
      faceLeftUrl,
      faceRightUrl,
    } = body;

    // ── Field validation ──────────────────────────────────────────────────────
    if (!studentNumber || !studentName || !college || !email || !course || !section || !yearLevel) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    if (!corUrl || !idPhotoUrl || !faceFrontUrl || !faceLeftUrl || !faceRightUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required image URLs" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Verify all URLs are valid Firebase Storage URLs
    const storageUrlPattern = /^https:\/\/firebasestorage\.googleapis\.com\//;
    const urls = [corUrl, idPhotoUrl, faceFrontUrl, faceLeftUrl, faceRightUrl];

    if (!urls.every((url) => storageUrlPattern.test(url))) {
      return NextResponse.json(
        { success: false, error: "Invalid storage URLs provided" },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    console.log(`📋 Submission details:`, {
      studentNumber,
      studentName,
      email,
      course,
      section,
      yearLevel,
    });

    // ── Check if already accepted ─────────────────────────────────────────────
    const validationRequestsRef = adminDB.collection("validation_requests2");
    const existingQuery = await validationRequestsRef
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingRequest = existingQuery.docs[0].data();
      if (existingRequest.status === "accepted") {
        console.log(`⚠️ Student ${studentNumber} already validated`);
        return NextResponse.json(
          {
            success: false,
            error: "You have already been validated. You cannot submit another request.",
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
        );
      }
      console.log(`ℹ️ Found existing request for ${studentNumber} with status: ${existingRequest.status}`);
    }

    // ── Save request ──────────────────────────────────────────────────────────
    const requestData = {
      studentId: uid,
      tupId: studentNumber,
      studentName,
      email,
      phoneNumber: phoneNumber || "",
      college: college.trim(),
      course: course.trim(),
      section: section.trim(),
      yearLevel: yearLevel.trim(),
      cor: corUrl,
      idPicture: idPhotoUrl,
      selfiePictures: {
        front: faceFrontUrl,
        left: faceLeftUrl,
        back: faceRightUrl,
      },
      // 📅 Semester snapshot at time of request
      semester: currentSemester,
      schoolYear: currentSchoolYear,
      status: "pending",
      requestTime: FieldValue.serverTimestamp(),
      rejectRemarks: null,
    };

    console.log("\n💾 Saving to Firestore...");
    const requestDocRef = adminDB
      .collection("validation_requests2")
      .doc(studentNumber);
    await requestDocRef.set(requestData, { merge: true });
    console.log("✅ Saved to Firestore successfully");
    console.log("=== Validation request submission complete ===\n");

    return NextResponse.json(
      {
        success: true,
        message: "Validation request submitted successfully",
        data: requestData,
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error: any) {
    console.error("\n❌ Error submitting validation request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}