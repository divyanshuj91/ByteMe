import { NextResponse } from "next/server";
import { MOCK_PARCELS } from "@/lib/data/cadastral-parcels";
import { fetchBackend } from "@/lib/backend-api";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/security/token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let authHeaders = {};
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nlams_session")?.value;
  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session?.backendToken) {
      authHeaders = { Authorization: `Bearer ${session.backendToken}` };
    }
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase();
  const village = searchParams.get("village");
  const status = searchParams.get("status");

  // Attempt live query to Backend Database API
  try {
    const backendRes = await fetchBackend("/api/gis/parcels", { headers: authHeaders });
    if (backendRes && backendRes.ok) {
      const result = await backendRes.json();
      const liveParcels = result.data || result;
      if (Array.isArray(liveParcels) && liveParcels.length > 0) {
        let filtered = liveParcels;
        if (q) {
          filtered = filtered.filter(
            (p: any) =>
              p.khasraNo?.toLowerCase().includes(q) ||
              p.ownerName?.toLowerCase().includes(q) ||
              p.village?.toLowerCase().includes(q)
          );
        }
        if (village) filtered = filtered.filter((p: any) => p.village === village);
        if (status) filtered = filtered.filter((p: any) => p.surveyStatus === status);

        return NextResponse.json({
          success: true,
          total: filtered.length,
          data: filtered,
          source: "LIVE_DATABASE",
        });
      }
    }
  } catch (err) {
    console.warn("Live parcels query fallback:", err);
  }

  let filtered = MOCK_PARCELS;

  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.khasraNo.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q)
    );
  }

  if (village) {
    filtered = filtered.filter((p) => p.village === village);
  }

  if (status) {
    filtered = filtered.filter((p) => p.surveyStatus === status);
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    data: filtered,
    source: "DYNAMIC_CACHE",
  });
}
