import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();

    const INDEXER_SECRET = process.env.NEXT_PUBLIC_INDEXER_SECRET;

    const res = await fetch("http://127.0.0.1:5002/build", {
      method: "POST",
      headers: {
        "X-Admin-Key": INDEXER_SECRET!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Proxy error: " + error.message },
      { status: 500 }
    );
  }
};
