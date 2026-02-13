import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const ENTRANCE_EXIT_LOGS_COLLECTION = "entrance_exit_logs";

export async function GET(request: NextRequest) {
  try {
    // Get the date parameter from the URL search params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Fetch the document for the specific date
    const docRef = doc(db, ENTRANCE_EXIT_LOGS_COLLECTION, date);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Return empty arrays if no logs exist for this date
      return NextResponse.json(
        {
          success: true,
          date,
          entranceLogs: [],
          exitLogs: [],
          totalEntrance: 0,
          totalExit: 0,
        },
        { status: 200 }
      );
    }

    const data = docSnap.data();
    const logs = data.logs || [];

    // Separate entrance and exit logs
    const entranceLogs = logs
      .filter((log: any) => log.action === "entrance")
      .map((log: any, index: number) => ({
        id: `entrance-${index}-${log.timestamp?.toMillis() || Date.now()}`,
        studentId: log.studentId,
        action: log.action,
        gateId: log.gateId,
        timestamp: log.timestamp?.toDate().toISOString() || new Date().toISOString(),
        confidenceScore: log.confidenceScore,
        scannedBy: log.scannedBy,
      }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const exitLogs = logs
      .filter((log: any) => log.action === "exit")
      .map((log: any, index: number) => ({
        id: `exit-${index}-${log.timestamp?.toMillis() || Date.now()}`,
        studentId: log.studentId,
        action: log.action,
        gateId: log.gateId,
        timestamp: log.timestamp?.toDate().toISOString() || new Date().toISOString(),
        confidenceScore: log.confidenceScore,
        scannedBy: log.scannedBy,
      }))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(
      {
        success: true,
        date,
        entranceLogs,
        exitLogs,
        totalEntrance: entranceLogs.length,
        totalExit: exitLogs.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching entrance/exit logs:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}