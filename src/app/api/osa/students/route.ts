import { NextRequest, NextResponse } from "next/server";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, where } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address for rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    // Check rate limit - 50 requests per minute for student list fetching
    const rateLimit = await checkRateLimit(
      rateLimiters.studentProfile,
      `student-list:${ip}`
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const lastStudentNumber = searchParams.get("lastStudentNumber");
    const searchQuery = searchParams.get("search") || "";

    // Validate page size
    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // Build the query
    let studentsQuery;
    
    if (lastStudentNumber) {
      // Get the last document for pagination
      const lastDocRef = doc(db, "student_profiles", lastStudentNumber);
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
        limit(pageSize)
      );
    } else {
      studentsQuery = query(
        collection(db, "student_profiles"),
        orderBy("studentNumber", "asc"),
        limit(pageSize)
      );
    }

    // Execute the query
    const studentsSnapshot = await getDocs(studentsQuery);

    // Get all student UIDs to check for pending validation requests
    const studentUids = studentsSnapshot.docs.map(doc => doc.data().uid);

    // Fetch pending validation requests for these students
    let pendingRequests: { [key: string]: boolean } = {};
    if (studentUids.length > 0) {
      const pendingQuery = query(
        collection(db, "validation_requests2"),
        where("studentId", "in", studentUids),
        where("status", "==", "pending")
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      
      pendingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        pendingRequests[data.studentId] = true;
      });
    }

    // Map the students data
    const students = studentsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Determine status
      let status: "Validated" | "Not Validated" | "Request Pending";
      if (pendingRequests[data.uid]) {
        status = "Request Pending";
      } else if (data.isValidated) {
        status = "Validated";
      } else {
        status = "Not Validated";
      }

      return {
        studentNumber: data.studentNumber,
        fullName: data.fullName,
        course: data.course || "N/A",
        status,
        validatedAt: data.validatedAt?.toDate().toISOString() || null,
        email: data.email,
      };
    });

    // Apply search filter if provided (client-side for now, can be optimized with Algolia/Typesense)
    let filteredStudents = students;
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      filteredStudents = students.filter(
        student =>
          student.fullName.toLowerCase().includes(lowerSearch) ||
          student.studentNumber.toLowerCase().includes(lowerSearch)
      );
    }

    // Determine if there are more results
    const hasMore = studentsSnapshot.docs.length === pageSize;
    const lastDoc = studentsSnapshot.docs[studentsSnapshot.docs.length - 1];

    return NextResponse.json(
      {
        students: filteredStudents,
        hasMore,
        lastStudentNumber: lastDoc?.id || null,
        totalFetched: filteredStudents.length,
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}