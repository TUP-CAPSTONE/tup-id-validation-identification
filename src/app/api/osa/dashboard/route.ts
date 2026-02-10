import { NextResponse } from "next/server";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";

const db = getFirestore(app);

export async function GET() {
  try {
    // =============================
    // VALIDATION REQUEST COUNTS
    // =============================

    const pendingQuery = query(
      collection(db, "validation_requests2"),
      where("status", "==", "pending")
    );

    const acceptedQuery = query(
      collection(db, "validation_requests2"),
      where("status", "==", "accepted")
    );

    const rejectedQuery = query(
      collection(db, "validation_requests2"),
      where("status", "==", "rejected")
    );

    const [
      pendingSnap,
      acceptedSnap,
      rejectedSnap,
    ] = await Promise.all([
      getCountFromServer(pendingQuery),
      getCountFromServer(acceptedQuery),
      getCountFromServer(rejectedQuery),
    ]);

    const pending = pendingSnap.data().count;
    const accepted = acceptedSnap.data().count;
    const rejected = rejectedSnap.data().count;
    const totalRequests = pending + accepted + rejected;

    // =============================
    // STUDENT COUNTS
    // =============================

    const totalStudentsQuery = query(collection(db, "student_profiles"));

    const validatedStudentsQuery = query(
      collection(db, "student_profiles"),
      where("isValidated", "==", true)
    );

    const totalStudentsSnap = await getCountFromServer(totalStudentsQuery);
    const validatedStudentsSnap = await getCountFromServer(validatedStudentsQuery);

    const totalStudents = totalStudentsSnap.data().count;
    const validatedStudents = validatedStudentsSnap.data().count;
    const notValidatedStudents = totalStudents - validatedStudents;

    // ADD THIS (missing before)
    const pendingRequests = pending;

    // =============================
    // RECENT ACTIVITY
    // =============================

    // 1️⃣ Validation Requests
    const validationRecentQuery = query(
      collection(db, "validation_requests2"),
      orderBy("requestTime", "desc"),
      limit(5)
    );

    const validationSnapshot = await getDocs(validationRecentQuery);

    const validationActivities = validationSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        type: "ID Validation",
        message:
          data.status === "pending"
            ? `New request from ${data.studentName}`
            : data.status === "accepted"
            ? `Accepted request from ${data.studentName}`
            : `Rejected request from ${data.studentName}`,
        timestamp: data.requestTime
          ? data.requestTime.toDate().toISOString()
          : null,
        status: data.status?.toLowerCase() || "pending",
      };
    });

    // 2️⃣ QR Scan Logs
    const logsQuery = query(
      collection(db, "validation_logs"),
      orderBy("validatedAt", "desc"),
      limit(5)
    );

    const logsSnapshot = await getDocs(logsQuery);

    const logActivities = logsSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        type: "QR Scan",
        message: `QR scanned – validated by ${data.validatedBy}`,
        timestamp: data.validatedAt
          ? data.validatedAt.toDate().toISOString()
          : null,
        status: "accepted",
      };
    });

    // 3️⃣ Rejected Validations
    const rejectedRecentQuery = query(
      collection(db, "rejected_validation"),
      orderBy("rejectedAt", "desc"),
      limit(5)
    );

    const rejectedRecentSnapshot = await getDocs(rejectedRecentQuery);

    const rejectedActivities = rejectedRecentSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        type: "Validation",
        message: `Validation rejected for ${data.studentName}`,
        timestamp: data.rejectedAt
          ? data.rejectedAt.toDate().toISOString()
          : null,
        status: "rejected",
      };
    });

    // Merge and sort all activities
    const recentActivity = [
      ...validationActivities,
      ...logActivities,
      ...rejectedActivities,
    ]
      .filter((a) => a.timestamp !== null)
      .sort(
        (a, b) =>
          new Date(b.timestamp as string).getTime() -
          new Date(a.timestamp as string).getTime()
      )
      .slice(0, 8);

    // =============================
    // RETURN RESPONSE
    // =============================

    return NextResponse.json({
      idValidation: {
        pending,
        accepted,
        rejected,
        total: totalRequests,
      },
      students: {
        total: totalStudents,
        validated: validatedStudents,
        notValidated: notValidatedStudents,
        pendingRequests,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}

