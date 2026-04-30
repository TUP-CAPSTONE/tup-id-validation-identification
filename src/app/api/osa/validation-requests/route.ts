import { NextRequest, NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, where } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    const rateLimit = await checkRateLimit(
      rateLimiters.studentProfile,
      `validation-requests:${ip}`
    );

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          resetAt: rateLimit.reset,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      );
    }

    // ── Fetch current semester (required) ─────────────────────────────
    const semesterSnap = await adminDB
      .collection("system_settings")
      .doc("currentSemester")
      .get();

    if (!semesterSnap.exists) {
      return NextResponse.json(
        { error: "No semester configured. Please contact the admin." },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const semesterData = semesterSnap.data()!;
    const currentSemester: string = semesterData.semester;
    const currentSchoolYear: string = semesterData.schoolYear;

    if (!currentSemester || !currentSchoolYear) {
      return NextResponse.json(
        { error: "Semester configuration is incomplete." },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // ── Query params ───────────────────────────────────────────────────
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const lastRequestId = searchParams.get("lastRequestId");
    const statusFilter = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "requestTime";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // ── Firestore query ────────────────────────────────────────────────
    const collectionRef = collection(db, "validation_requests2");
    const queryConstraints: any[] = [];

    // Filter by current semester only
    queryConstraints.push(where("semester", "==", currentSemester));
    queryConstraints.push(where("schoolYear", "==", currentSchoolYear));

    if (statusFilter && ["pending", "accepted", "rejected"].includes(statusFilter)) {
      queryConstraints.push(where("status", "==", statusFilter));
      queryConstraints.push(limit(pageSize * 3));
    } else {
      queryConstraints.push(orderBy(sortBy, sortOrder as "asc" | "desc"));

      if (lastRequestId) {
        const lastDocRef = doc(db, "validation_requests2", lastRequestId);
        const lastDocSnap = await getDoc(lastDocRef);
        if (lastDocSnap.exists()) {
          queryConstraints.push(startAfter(lastDocSnap));
        }
      }

      queryConstraints.push(limit(pageSize));
    }

    const requestsSnapshot = await getDocs(query(collectionRef, ...queryConstraints));

    let requests = requestsSnapshot.docs.map((doc) => {
      const docData = doc.data();
      return {
        id: doc.id,
        requestId: doc.id,
        studentId: docData.studentId,
        studentName: docData.studentName,
        tupId: docData.tupId,
        email: docData.email,
        phoneNumber: docData.phoneNumber,
        course: docData.course || "",
        section: docData.section || "",
        yearLevel: docData.yearLevel || "",
        idPicture: docData.idPicture,
        corFile: docData.cor || docData.corFile,
        selfiePictures: docData.selfiePictures,
        status: docData.status,
        rejectRemarks: docData.rejectRemarks,
        requestTime: docData.requestTime?.toDate().toISOString() || "",
        semester: docData.semester,
        schoolYear: docData.schoolYear,
      };
    });

    if (statusFilter) {
      requests.sort((a, b) => {
        let aVal: any, bVal: any;

        if (sortBy === "requestTime") {
          aVal = new Date(a.requestTime).getTime();
          bVal = new Date(b.requestTime).getTime();
        } else if (sortBy === "studentName") {
          aVal = a.studentName.toLowerCase();
          bVal = b.studentName.toLowerCase();
        } else if (sortBy === "yearLevel") {
          aVal = a.yearLevel;
          bVal = b.yearLevel;
        } else {
          return 0;
        }

        return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
      });

      const startIndex = lastRequestId
        ? requests.findIndex((r) => r.id === lastRequestId) + 1
        : 0;
      requests = requests.slice(startIndex, startIndex + pageSize);
    }

    const hasMore = requestsSnapshot.docs.length === pageSize;
    const lastDoc = requestsSnapshot.docs[requestsSnapshot.docs.length - 1];

    return NextResponse.json(
      {
        requests,
        hasMore,
        lastRequestId: lastDoc?.id || null,
        totalFetched: requests.length,
        semester: currentSemester,
        schoolYear: currentSchoolYear,
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error("Error fetching validation requests:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}