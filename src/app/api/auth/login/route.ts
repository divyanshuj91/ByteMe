import { NextResponse } from "next/server";
import { signSession, UserSession } from "@/lib/security/token";
import { appendAuditRecord } from "@/lib/security/audit";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, dscChallenge } = body;

    if (!email || (!password && !dscChallenge)) {
      return NextResponse.json(
        { error: "Email and password or DSC token are required credentials" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    let sessionPayload: UserSession | null = null;

    // Proxy authentication via Backend Database API
    try {
      const backendRes = await fetchBackend("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (backendRes && backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData && backendData.user && backendData.token) {
          sessionPayload = {
            userId: backendData.user.id || `USER-${cleanEmail.slice(0, 4).toUpperCase()}`,
            name: backendData.user.name,
            email: backendData.user.email,
            role: backendData.user.role,
            userType: backendData.user.role === "CITIZEN" ? "CITIZEN" : "OFFICER",
            department: backendData.user.agency,
            backendToken: backendData.token,
            exp: Date.now() + 8 * 60 * 60 * 1000,
          };
        }
      } else if (backendRes && !backendRes.ok) {
        const errorData = await backendRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.message || "Invalid credentials." },
          { status: backendRes.status }
        );
      }
    } catch (err) {
      console.warn("Backend auth query failed:", err);
      return NextResponse.json(
        { error: "Backend service unavailable." },
        { status: 503 }
      );
    }

    if (!sessionPayload) {
      return NextResponse.json(
        { error: "Invalid credentials. Please check your email and password." },
        { status: 401 }
      );
    }

    const token = await signSession(sessionPayload);

    // Record login in immutable audit ledger
    await appendAuditRecord(
      "OFFICER_LOGIN",
      "AUTH-PORTAL",
      sessionPayload.userId,
      {
        email: cleanEmail,
        role: sessionPayload.role,
        department: sessionPayload.department,
      }
    );

    const response = NextResponse.json({
      success: true,
      message: "Session authenticated via HMAC-SHA256 token",
      user: {
        id: sessionPayload.userId,
        name: sessionPayload.name,
        email: sessionPayload.email,
        role: sessionPayload.role,
        userType: sessionPayload.userType || "OFFICER",
        department: sessionPayload.department,
        district: sessionPayload.district,
        village: sessionPayload.village,
        khasraNo: sessionPayload.khasraNo,
        aadhaarLast4: sessionPayload.aadhaarLast4,
      },
      officer: {
        name: sessionPayload.name,
        email: sessionPayload.email,
        role: sessionPayload.role,
        department: sessionPayload.department,
      },
    });

    // Set secure HttpOnly cookie
    response.cookies.set("nlams_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60, // 8 hours in seconds
    });

    return response;
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.json(
      { error: "Internal security authorization failure" },
      { status: 500 }
    );
  }
}
