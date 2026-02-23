import { NextRequest, NextResponse } from "next/server";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, where } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address for rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    // Check rate limit
    const rateLimit = await checkRateLimit(
      rateLimiters.studentProfile,
      `registration-requests:${ip}`
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
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const lastRequestId = searchParams.get("lastRequestId");
    const statusFilterRaw = searchParams.get("status");
    const statusFilter = statusFilterRaw?.toLowerCase(); // Keep as-is since we check lowercase version below
    const sortBy = searchParams.get("sortBy") || "requestedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Validate page size
    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // Build the query
    const collectionRef = collection(db, "registration_requests");
    const queryConstraints: any[] = [];

    // Convert status filter to lowercase for Firestore query (Firestore uses lowercase)
    const firestoreStatus = statusFilter;

    // Handle filtering and sorting to avoid composite index requirements
    if (firestoreStatus && ["pending", "accepted", "rejected"].includes(firestoreStatus)) {
      // When filtering by status, fetch by status only
      queryConstraints.push(where("status", "==", firestoreStatus));
      queryConstraints.push(limit(pageSize * 3)); // Fetch more for in-memory sorting
    } else {
      // No status filter - use Firestore ordering
      const sortField = sortBy === "requestedAt" ? "createdAt" : sortBy;
      queryConstraints.push(orderBy(sortField, sortOrder as "asc" | "desc"));
      
      if (lastRequestId) {
        const lastDocRef = doc(db, "registration_requests", lastRequestId);
        const lastDocSnap = await getDoc(lastDocRef);
        
        if (lastDocSnap.exists()) {
          queryConstraints.push(startAfter(lastDocSnap));
        }
      }
      
      queryConstraints.push(limit(pageSize));
    }

    // Execute query
    const requestsQuery = query(collectionRef, ...queryConstraints);
    const requestsSnapshot = await getDocs(requestsQuery);

    // Map the data
    let requests = requestsSnapshot.docs.map((doc) => {
      const d = doc.data();

      const name = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim();
      const status =
        d.status === "pending"
          ? "Pending"
          : d.status === "accepted"
          ? "Accepted"
          : d.status === "rejected"
          ? "Rejected"
          : d.status;

      return {
        id: doc.id,
        name,
        fullName: name,
        studentNumber: d.tup_id || d.studentNumber || doc.id,
        email: d.student_email || d.email || "",
        phone: d.student_phone_num || d.phone || "",
        guardianEmail: d.guardian_email || d.guardianEmail || "",
        guardianPhone: d.guardian_phone_number || d.guardianPhone || "",
        bday: d.bday || d.birthDate,
        college: d.college || "",
        course: d.course || "",
        section: d.section || "",
        uid: d.uid || "",
        requestedAt: d.createdAt || d.requestedAt,
        requestedAtISO: (d.createdAt || d.requestedAt)?.toDate().toISOString() || "",
        status,
        remarks: d.remarks || null,
        reviewedBy: d.reviewedBy || null,
        facePhotos: d.facePhotos || null,
      };
    });

    // If status filter is active, sort in-memory
    if (firestoreStatus) {
      requests.sort((a, b) => {
        let aVal, bVal;
        
        if (sortBy === "requestedAt") {
          aVal = new Date(a.requestedAtISO).getTime();
          bVal = new Date(b.requestedAtISO).getTime();
        } else if (sortBy === "email") {
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
        } else if (sortBy === "studentNumber") {
          aVal = a.studentNumber;
          bVal = b.studentNumber;
        } else {
          return 0;
        }
        
        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Apply pagination manually
      const startIndex = lastRequestId ? requests.findIndex(r => r.id === lastRequestId) + 1 : 0;
      requests = requests.slice(startIndex, startIndex + pageSize);
    }

    // Determine if there are more results
    const hasMore = requestsSnapshot.docs.length === pageSize || (firestoreStatus && requests.length === pageSize);
    const lastDoc = requests[requests.length - 1];

    return NextResponse.json(
      {
        requests,
        hasMore,
        lastRequestId: lastDoc?.id || null,
        totalFetched: requests.length,
      },
      {
        status: 200,
        headers: createRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error("Error fetching registration requests:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}