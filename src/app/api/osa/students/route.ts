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
    const collegeFilter = searchParams.get("college") || "";
    const courseFilter = searchParams.get("course") || "";
    const sectionFilter = searchParams.get("section") || "";
    const statusFilter = searchParams.get("status") || "";

    // Validate page size
    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // Build the query - fetch larger dataset when filters are active
    const effectivePageSize = (collegeFilter || statusFilter) ? 100 : pageSize;
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
        limit(effectivePageSize)
      );
    } else {
      studentsQuery = query(
        collection(db, "student_profiles"),
        orderBy("studentNumber", "asc"),
        limit(effectivePageSize)
      );
    }

    // Execute the query
    const studentsSnapshot = await getDocs(studentsQuery);

    // Get all student UIDs to check for pending validation requests
    const studentUids = studentsSnapshot.docs.map(doc => doc.data().uid);

    // Fetch pending validation requests for these students
    // Split into chunks of 30 due to Firestore IN query limit
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
        
        pendingSnapshot.docs.forEach(doc => {
          const data = doc.data();
          pendingRequests[data.studentId] = true;
        });
      }
    }

    // Map the students data
    const allStudents = studentsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Determine status - check validation status correctly
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
        validatedAt: data.validatedAt?.toDate().toISOString() || null,
        email: data.email,
        docId: doc.id,
      };
    });

    // Apply filters in priority order: College -> Status -> Course -> Section
    let filteredStudents = allStudents;

    // Priority 1: Apply college filter
    if (collegeFilter) {
      filteredStudents = filteredStudents.filter(student => 
        student.college.toLowerCase() === collegeFilter.toLowerCase()
      );
    }

    // Priority 2: Apply status filter (exclude Request Pending by default)
    if (statusFilter) {
      filteredStudents = filteredStudents.filter(student => student.status === statusFilter);
    } else {
      // By default, exclude "Request Pending" status
      filteredStudents = filteredStudents.filter(student => student.status !== "Request Pending");
    }

    // Priority 3: Apply course filter
    if (courseFilter) {
      filteredStudents = filteredStudents.filter(student => 
        student.course.toLowerCase() === courseFilter.toLowerCase()
      );
    }

    // Priority 4: Apply section filter
    if (sectionFilter) {
      filteredStudents = filteredStudents.filter(student => 
        student.section.toLowerCase() === sectionFilter.toLowerCase()
      );
    }

    // Priority 5: Apply search filter if provided
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase().trim();
      filteredStudents = filteredStudents.filter(
        student =>
          student.fullName.toLowerCase().includes(lowerSearch) ||
          student.studentNumber.toLowerCase().includes(lowerSearch) ||
          student.email.toLowerCase().includes(lowerSearch)
      );
    }

    // Collect available values for dropdowns based on ALL students fetched (before pagination)
    const baseForDropdowns = allStudents;
    
    // Get all valid colleges from base data
    const allColleges = [...new Set(
      baseForDropdowns
        .map(s => s.college)
        .filter(c => c !== "N/A")
        .sort()
    )];

    // Get courses based on selected college or all courses if no college selected
    let allCourses: string[] = [];
    if (collegeFilter) {
      allCourses = [...new Set(
        baseForDropdowns
          .filter(s => s.college.toLowerCase() === collegeFilter.toLowerCase())
          .map(s => s.course)
          .filter(c => c !== "N/A")
          .sort()
      )];
    } else {
      // Show all courses if no college filter
      allCourses = [...new Set(
        baseForDropdowns
          .map(s => s.course)
          .filter(c => c !== "N/A")
          .sort()
      )];
    }

    // Get all sections
    const allSections = [...new Set(
      baseForDropdowns
        .map(s => s.section)
        .filter(s => s !== "N/A")
        .sort()
    )];

    // Paginate the filtered results
    const paginatedStudents = filteredStudents.slice(0, pageSize);
    
    // Remove docId from response (it's only for internal use)
    const studentsToReturn = paginatedStudents.map(({ docId, ...rest }) => rest);

    // Determine if there are more results
    // hasMore is true if we have more filtered results than current page,
    // or if we fetched a full batch AND have enough for a full page
    const hasMore = filteredStudents.length > pageSize || 
                    (allStudents.length === effectivePageSize && filteredStudents.length >= pageSize);
    
    // Get the document ID of the last filtered student for next page cursor
    const lastFilteredStudent = paginatedStudents[paginatedStudents.length - 1];
    const nextCursor = lastFilteredStudent ? lastFilteredStudent.docId : null;

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