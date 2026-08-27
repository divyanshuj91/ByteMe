import { NextResponse } from "next/server";
import { signSession, UserSession } from "@/lib/security/token";
import { appendAuditRecord } from "@/lib/security/audit";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role = "CITIZEN", phone, agency } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required for registration." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const isCitizen = role === "CITIZEN";
    const userRole = isCitizen ? "CITIZEN" : role;
    const department = agency || (isCitizen ? "Landowner" : "Revenue & Land Reforms Department");

    // Proxy the registration request to the backend
    let backendToken: string | undefined = undefined;
    let userId = `USER-${Date.now().toString().slice(-6)}`;

    try {
      const backendRes = await fetchBackend("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          password,
          role: userRole,
          agency: department,
        }),
      });

      if (backendRes && backendRes.ok) {
        const backendData = await backendRes.json();
        const payload = backendData.data || backendData;
        const user = payload.user || backendData.user;
        const token = payload.token || backendData.token;
        if (user) {
          userId = user.id || userId;
        }
        if (token) {
          backendToken = token;
        }
      } else if (backendRes && !backendRes.ok) {
        const errorData = await backendRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error || errorData.message || "Registration failed on backend." },
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
    
    // TODO: email verification (post-SIH)

    const state = "Rajasthan";
    const exp = Date.now() + 8 * 60 * 60 * 1000;

    const sessionPayload: UserSession = {
      userId,
      name: name.trim(),
      email: cleanEmail,
      role: userRole,
      userType: isCitizen ? "CITIZEN" : "OFFICER",
      department,
      state,
      phone: phone || "9829012345",
      khasraNo: isCitizen ? "Plot 42A" : undefined,
      village: isCitizen ? "Ramgarh Revenue Ward 3" : undefined,
      district: isCitizen ? "Dausa" : undefined,
      aadhaarLast4: isCitizen ? "4291" : undefined,
      backendToken,
      exp,
    };

    const token = await signSession(sessionPayload);

    // Append to audit trail
    await appendAuditRecord(
      "USER_REGISTRATION",
      isCitizen ? "CITIZEN-PORTAL" : "EXECUTIVE-PORTAL",
      userId,
      {
        name: name.trim(),
        email: cleanEmail,
        role: userRole,
        registeredAt: new Date().toISOString(),
      }
    );

    const response = NextResponse.json({
      success: true,
      message: "Account registered successfully.",
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: userRole,
        userType: isCitizen ? "CITIZEN" : "OFFICER",
        targetPortal: isCitizen ? "/citizen-portal" : "/executive-dashboard",
      },
    });

    // Set secure cookie
    response.cookies.set("nlams_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
