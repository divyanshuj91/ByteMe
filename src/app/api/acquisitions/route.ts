import { NextResponse } from "next/server";
import { MOCK_PROJECTS } from "@/lib/data/mock-projects";
import { AcquisitionProject } from "@/types";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

let inMemoryProjects: AcquisitionProject[] = [...MOCK_PROJECTS];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const stage = searchParams.get("stage");

  // Attempt live query to Backend Database API
  try {
    const backendRes = await fetchBackend("/api/projects");
    if (backendRes && backendRes.ok) {
      const result = await backendRes.json();
      if (result && (result.data || Array.isArray(result))) {
        const liveProjects = result.data || result;
        if (Array.isArray(liveProjects) && liveProjects.length > 0) {
          let filtered = liveProjects;
          if (status) filtered = filtered.filter((p: any) => p.status === status);
          if (stage) filtered = filtered.filter((p: any) => p.currentStage === stage);
          return NextResponse.json({
            success: true,
            total: filtered.length,
            data: filtered,
            source: "LIVE_DATABASE",
          });
        }
      }
    }
  } catch (err) {
    console.warn("Live backend query fallback:", err);
  }

  let filtered = inMemoryProjects;
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }
  if (stage) {
    filtered = filtered.filter((p) => p.currentStage === stage);
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    data: filtered,
    source: "DYNAMIC_CACHE",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward to live backend
    try {
      const backendRes = await fetchBackend("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (backendRes && backendRes.ok) {
        const liveResult = await backendRes.json();
        return NextResponse.json({
          success: true,
          message: "Acquisition project created in live database",
          data: liveResult.data || liveResult,
          source: "LIVE_DATABASE",
        });
      }
    } catch (err) {
      console.warn("Backend project creation fallback:", err);
    }

    const newProject: AcquisitionProject = {
      id: `proj-${Date.now()}`,
      code: body.code || `ACQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: body.title || "Untitled Project",
      sponsoringAgency: body.sponsoringAgency || "State Infrastructure Agency",
      state: body.state || "Rajasthan",
      districts: body.districts || ["Dausa"],
      totalAreaHa: Number(body.totalAreaHa) || 100,
      acquiredAreaHa: 0,
      affectedVillagesCount: Number(body.affectedVillagesCount) || 5,
      affectedFamiliesCount: Number(body.affectedFamiliesCount) || 120,
      sanctionedBudgetCr: Number(body.sanctionedBudgetCr) || 250,
      disbursedCompensationCr: 0,
      currentStage: "SECTION_4_SIA",
      stageProgress: 10,
      status: "ON_TRACK",
      slaWarning: false,
      slaDaysRemaining: 60,
      startDate: new Date().toISOString().split("T")[0],
      targetCompletionDate: body.targetCompletionDate || "2025-12-31",
      description: body.description || "New statutory land acquisition intake.",
      officerName: body.officerName || "Competent Authority",
      officerDesignation: body.officerDesignation || "CALA / Special LAO",
      milestones: [
        {
          id: `m-${Date.now()}-1`,
          code: "SEC-4",
          name: "Social Impact Assessment (SIA)",
          section: "Section 4",
          actReference: "RFCTLARR Act 2013, Sec 4(1)",
          status: "IN_PROGRESS",
          targetDate: "2024-12-01",
          officerInCharge: body.officerName || "CALA Lead",
          slaDays: 60,
          remainingDays: 60,
          documents: [],
        },
      ],
    };

    inMemoryProjects.unshift(newProject);

    return NextResponse.json({
      success: true,
      message: "Acquisition project initiated successfully",
      data: newProject,
      source: "DYNAMIC_CACHE",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid payload" },
      { status: 400 }
    );
  }
}
