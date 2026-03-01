import { NextRequest, NextResponse } from "next/server";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, where } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    const rateLimit = await checkRateLimit(
      rateLimiters.studentProfile,
      `student-list:${ip}`
    );

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", resetAt: rateLimit.reset },
        { status: 429, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    // lastDocId is the Firebase Auth UID — the actual Firestore doc ID of student_profiles
    const lastDocId = searchParams.get("lastStudentNumber");
    const searchQuery = searchParams.get("search") || "";
    const collegeFilter = searchParams.get("college") || "";
    const courseFilter = searchParams.get("course") || "";
    const sectionFilter = searchParams.get("section") || "";
    const statusFilter = searchParams.get("status") || "";

    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const effectivePageSize = (collegeFilter || statusFilter) ? 100 : pageSize;
    let studentsQuery;

    if (lastDocId) {
      // Cursor uses the UID (doc ID), not the studentNumber field
      const lastDocRef = doc(db, "student_profiles", lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);

      if (!lastDocSnap.exists()) {
        return NextResponse.json(
          { error: "Invalid pagination cursor" },
          { status: 400, headers: createRateLimitHeaders(rateLimit) }
        );
      }

      studentsQuery = query(
        collection(db, "student_profiles"),
        orderBy("studentNumber", "asc"),
        startAfter(lastDocSnap),
        limit(effectivePageSize)
      );
    } else {
      studentsQuery = query(
        collection(db, "student_profiles"),
        orderBy("studentNumber", "asc"),
        limit(effectivePageSize)
      );
    }

    const studentsSnapshot = await getDocs(studentsQuery);

    const studentUids = studentsSnapshot.docs.map(d => d.data().uid).filter(Boolean);

    let pendingRequests: { [key: string]: boolean } = {};
    if (studentUids.length > 0) {
      const chunkSize = 30;
      for (let i = 0; i < studentUids.length; i += chunkSize) {
        const chunk = studentUids.slice(i, i + chunkSize);
        const pendingQuery = query(
          collection(db, "validation_requests2"),
          where("studentId", "in", chunk),
          where("status", "==", "pending")
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        pendingSnapshot.docs.forEach(d => {
          pendingRequests[d.data().studentId] = true;
        });
      }
    }

    const allStudents = studentsSnapshot.docs.map(d => {
      const data = d.data();

      let status: "Validated" | "Not Validated" | "Request Pending";
      if (pendingRequests[data.uid]) {
        status = "Request Pending";
      } else if (data.isValidated === true) {
        status = "Validated";
      } else {
        status = "Not Validated";
      }

      return {
        studentNumber: data.studentNumber,
        fullName: data.fullName,
        college: data.college || "N/A",
        course: data.course || "N/A",
        section: data.section || "N/A",
        status,
        validatedAt: data.validatedAt?.toDate?.().toISOString() || null,
        email: data.email,
        uid: d.id,   // doc ID = Firebase Auth UID — used for history subcollection path
        docId: d.id, // kept separately for pagination cursor (stripped before response)
      };
    });

    let filteredStudents = allStudents;

    if (collegeFilter) {
      filteredStudents = filteredStudents.filter(s =>
        s.college.toLowerCase() === collegeFilter.toLowerCase()
      );
    }

    if (statusFilter) {
      filteredStudents = filteredStudents.filter(s => s.status === statusFilter);
    }
    // No default exclusion — show all students including "Request Pending"

    if (courseFilter) {
      filteredStudents = filteredStudents.filter(s =>
        s.course.toLowerCase() === courseFilter.toLowerCase()
      );
    }

    if (sectionFilter) {
      filteredStudents = filteredStudents.filter(s =>
        s.section.toLowerCase() === sectionFilter.toLowerCase()
      );
    }

    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase().trim();
      filteredStudents = filteredStudents.filter(s =>
        s.fullName?.toLowerCase().includes(lowerSearch) ||
        s.studentNumber?.toLowerCase().includes(lowerSearch) ||
        s.email?.toLowerCase().includes(lowerSearch)
      );
    }

    const allColleges = [...new Set(
      allStudents.map(s => s.college).filter(c => c !== "N/A").sort()
    )];

    let allCourses: string[] = [];
    if (collegeFilter) {
      allCourses = [...new Set(
        allStudents
          .filter(s => s.college.toLowerCase() === collegeFilter.toLowerCase())
          .map(s => s.course).filter(c => c !== "N/A").sort()
      )];
    } else {
      allCourses = [...new Set(
        allStudents.map(s => s.course).filter(c => c !== "N/A").sort()
      )];
    }

    const allSections = [...new Set(
      allStudents.map(s => s.section).filter(s => s !== "N/A").sort()
    )];

    const paginatedStudents = filteredStudents.slice(0, pageSize);
    const studentsToReturn = paginatedStudents.map(({ docId, ...rest }) => rest);

    const hasMore =
      filteredStudents.length > pageSize ||
      (allStudents.length === effectivePageSize && filteredStudents.length >= pageSize);

    const nextCursor = paginatedStudents[paginatedStudents.length - 1]?.docId ?? null;

    return NextResponse.json(
      {
        students: studentsToReturn,
        hasMore,
        lastStudentNumber: nextCursor,
        totalFetched: studentsToReturn.length,
        availableColleges: allColleges,
        availableCourses: allCourses,
        availableSections: allSections,
      },
      { status: 200, headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}