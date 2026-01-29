import { NextResponse } from "next/server";
import { adminDB } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await adminDB
      .collection("feedback_reports")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        // convert Firestore timestamps to JS Date
        createdAt: data.createdAt ? data.createdAt.toDate() : null,
        resolvedAt: data.resolvedAt ? data.resolvedAt.toDate() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
      };
    });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("GET admin feedback reports error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
