import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDB } from "@/lib/firebaseAdmin";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

// Module-level semester cache (lives for the lifetime of the serverless instance)
let semesterCache: {
  data: { semester: string; schoolYear: string };
  fetchedAt: number;
} | null = null;

const SEMESTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedSemester() {
  const now = Date.now();
  if (semesterCache && now - semesterCache.fetchedAt < SEMESTER_CACHE_TTL_MS) {
    console.log("📅 Using cached semester data");
    return semesterCache.data;
  }

  const semesterSnap = await adminDB
    .collection("system_settings")
    .doc("currentSemester")
    .get();

  if (!semesterSnap.exists) return null;

  const semesterData = semesterSnap.data()!;
  const { semester, schoolYear } = semesterData;
  if (!semester || !schoolYear) return null;

  semesterCache = { data: { semester, schoolYear }, fetchedAt: now };
  return semesterCache.data;
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Starting validation request submission ===");

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
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

    // ── Parse body early (no need to wait) ───────────────────────────────────
    const bodyPromise = request.json();

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

    // ── Parallel: semester cache + existing request check ─────────────────────
    const validationRequestsRef = adminDB.collection("validation_requests2");

    const [semesterData, existingQuery, body] = await Promise.all([
      getCachedSemester(),
      validationRequestsRef.where("studentId", "==", uid).limit(1).get(),
      bodyPromise,
    ]);

    // ── Semester validation ───────────────────────────────────────────────────
    if (!semesterData) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation requests are not open yet. No semester has been configured. Please contact the admin.",
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    const { semester: currentSemester, schoolYear: currentSchoolYear } = semesterData;
    console.log(`📅 Current semester: ${currentSemester} | ${currentSchoolYear}`);

    // ── Field validation ──────────────────────────────────────────────────────
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

    // ── Check existing request ────────────────────────────────────────────────
    if (!existingQuery.empty) {
      const existingRequest = existingQuery.docs[0].data();

      if (existingRequest.status === "accepted") {
        const isSameSemester =
          existingRequest.semester === currentSemester &&
          existingRequest.schoolYear === currentSchoolYear;

        if (isSameSemester) {
          console.log(`⚠️ Student ${studentNumber} already validated for this semester`);
          return NextResponse.json(
            {
              success: false,
              error: "You have already been validated for this semester. You cannot submit another request.",
            },
            { status: 400, headers: createRateLimitHeaders(rateLimitResult) }
          );
        }

        console.log(`ℹ️ Student ${studentNumber} was accepted in a previous semester. Allowing new request.`);
      } else {
        console.log(`ℹ️ Found existing request for ${studentNumber} with status: ${existingRequest.status}`);
      }
    }

    // ── Build request data ────────────────────────────────────────────────────
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
      semester: currentSemester,
      schoolYear: currentSchoolYear,
      status: "pending",
      requestTime: FieldValue.serverTimestamp(),
      rejectRemarks: null,
    };

    // ── Save request ──────────────────────────────────────────────────────────
    console.log("\n💾 Saving to Firestore...");

    const hasExistingDoc = !existingQuery.empty;
    const existingStatus = hasExistingDoc ? existingQuery.docs[0].data().status : null;

    let requestDocRef;
    if (hasExistingDoc && existingStatus === "rejected") {
      requestDocRef = existingQuery.docs[0].ref;
      await requestDocRef.set(requestData);
    } else {
      requestDocRef = adminDB.collection("validation_requests2").doc();
      await requestDocRef.set(requestData);
    }

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