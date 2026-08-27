import { NextResponse } from "next/server";
import { signSession, OfficerSession, UserSession } from "@/lib/security/token";
import { appendAuditRecord } from "@/lib/security/audit";
import { REGISTERED_USERS_STORE } from "@/lib/auth-store";
import { fetchBackend } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

// Verified Officer Accounts Directory
const VERIFIED_OFFICERS: Record<
  string,
  {
    pass: string;
    officer: Omit<OfficerSession, "exp">;
  }
> = {
  "cala.dausa@gov.in": {
    pass: "cala@2026",
    officer: {
      userId: "OFFICER-DAUSA-01",
      name: "Rajeshwar Sharma, IAS",
      email: "cala.dausa@gov.in",
      role: "CALA_OFFICER",
      userType: "OFFICER",
      department: "Revenue & Land Reforms Department",
      state: "Rajasthan",
    },
  },
  "dg.nhai@gov.in": {
    pass: "nhai@2026",
    officer: {
      userId: "OFFICER-NHAI-HQ",
      name: "Dr. Vikramaditya Sen",
      email: "dg.nhai@gov.in",
      role: "DIRECTOR_GENERAL",
      userType: "OFFICER",
      department: "National Highways Authority of India",
      state: "National HQ (New Delhi)",
    },
  },
  "officer@nic.in": {
    pass: "demo@2026",
    officer: {
      userId: "OFFICER-NIC-DEMO",
      name: "Ananya Deshmukh, IAS",
      email: "officer@nic.in",
      role: "CALA_OFFICER",
      userType: "OFFICER",
      department: "Department of Land Resources (DoLR)",
      state: "Maharashtra",
    },
  },
  "citizen@nlams.gov.in": {
    pass: "nlams2026",
    officer: {
      userId: "CITIZEN-DAUSA-042A",
      name: "Rameshwar Prasad Meena",
      email: "citizen@nlams.gov.in",
      role: "CITIZEN",
      userType: "CITIZEN",
      department: "Landowner (Dausa Revenue Zone)",
      state: "Rajasthan",
      district: "Dausa",
      village: "Ramgarh Revenue Ward 3",
      khasraNo: "Plot 42A",
      aadhaarLast4: "4291",
    },
  },
};

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
    const match = VERIFIED_OFFICERS[cleanEmail];
    const registered = REGISTERED_USERS_STORE.get(cleanEmail);

    let sessionPayload: UserSession | null = null;

    if (match && (dscChallenge || match.pass === password)) {
      sessionPayload = {
        ...match.officer,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      };
    } else if (registered && (dscChallenge || registered.passwordHash === password)) {
      sessionPayload = {
        userId: `USER-${cleanEmail.slice(0, 4).toUpperCase()}`,
        name: registered.name,
        email: registered.email,
        role: registered.role,
        userType: registered.role === "CITIZEN" ? "CITIZEN" : "OFFICER",
        department: registered.department,
        state: registered.state,
        phone: registered.phone,
        khasraNo: registered.khasraNo,
        village: registered.village,
        district: registered.district,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      };
    } else {
      // Attempt authentication via Backend Database API
      try {
        const backendRes = await fetchBackend("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (backendRes && backendRes.ok) {
          const backendData = await backendRes.json();
          if (backendData && backendData.user) {
            sessionPayload = {
              userId: backendData.user.id || `USER-${cleanEmail.slice(0, 4).toUpperCase()}`,
              name: backendData.user.name,
              email: backendData.user.email,
              role: backendData.user.role,
              userType: backendData.user.role === "CITIZEN" ? "CITIZEN" : "OFFICER",
              department: backendData.user.agency,
              exp: Date.now() + 8 * 60 * 60 * 1000,
            };
          }
        }
      } catch (err) {
        console.warn("Backend auth query fallback:", err);
      }
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
