import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/security/token";

export async function POST(request: Request) {
  let authHeaders = {};
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nlams_session")?.value;
  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session?.backendToken) {
      authHeaders = { Authorization: `Bearer ${session.backendToken}`, "Content-Type": "application/json" };
    }
  }

  try {
    const body = await request.json();
    const backendRes = await fetchBackend(`/api/valuation/compute`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body),
    });
    
    if (!backendRes || !backendRes.ok) {
      const errorMsg = backendRes ? await backendRes.text() : "Network error";
      return NextResponse.json({ success: false, error: errorMsg }, { status: backendRes?.status || 500 });
    }
    
    const data = await backendRes.json();
    return NextResponse.json({ ...data, source: "LIVE_DATABASE" });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to connect to backend valuation service" }, { status: 500 });
  }
}
