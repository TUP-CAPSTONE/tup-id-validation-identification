import { NextRequest, NextResponse } from "next/server";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs, getDoc, doc, where } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import { rateLimiters, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

const db = getFirestore(app);

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address for rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    // Check rate limit - using existing studentProfile limiter (20 requests per minute)
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const lastRequestId = searchParams.get("lastRequestId");
    const statusFilter = searchParams.get("status"); // 'pending', 'accepted', 'rejected', or null for all
    const sortBy = searchParams.get("sortBy") || "requestTime"; // requestTime, studentName, yearLevel
    const sortOrder = searchParams.get("sortOrder") || "desc"; // asc or desc

    // Validate page size
    if (pageSize > 100 || pageSize < 1) {
      return NextResponse.json(
        { error: "Page size must be between 1 and 100" },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    // Build the query
    let requestsQuery;
    const collectionRef = collection(db, "validation_requests2");

    // Start building query constraints
    const queryConstraints: any[] = [];

    // IMPORTANT: Firebase requires composite indexes when combining where() + orderBy()
    // To avoid creating many indexes, we'll fetch more data and filter client-side when status filter is active
    
    if (statusFilter && ["pending", "accepted", "rejected"].includes(statusFilter)) {
      // When filtering by status, fetch by status only (no ordering in Firestore)
      // We'll sort the results in-memory after fetching
      queryConstraints.push(where("status", "==", statusFilter));
      queryConstraints.push(limit(pageSize * 3)); // Fetch more to account for sorting
    } else {
      // No status filter - can use normal ordering
      queryConstraints.push(orderBy(sortBy, sortOrder as "asc" | "desc"));
      
      // Add pagination cursor if provided
      if (lastRequestId) {
        const lastDocRef = doc(db, "validation_requests2", lastRequestId);
        const lastDocSnap = await getDoc(lastDocRef);
        
        if (lastDocSnap.exists()) {
          queryConstraints.push(startAfter(lastDocSnap));
        }
      }
      
      queryConstraints.push(limit(pageSize));
    }

    // Execute query
    requestsQuery = query(collectionRef, ...queryConstraints);
    const requestsSnapshot = await getDocs(requestsQuery);

    // Map the data
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
      };
    });

    // If status filter is active, sort in-memory
    if (statusFilter) {
      requests.sort((a, b) => {
        let aVal, bVal;
        
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
    const hasMore = requestsSnapshot.docs.length === pageSize;
    const lastDoc = requestsSnapshot.docs[requestsSnapshot.docs.length - 1];

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
    console.error("Error fetching validation requests:", error);
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