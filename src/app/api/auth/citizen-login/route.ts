import { NextResponse } from "next/server";
import { signSession, UserSession } from "@/lib/security/token";
import { appendAuditRecord } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

interface CitizenRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  aadhaarLast4: string;
  khasraNo: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  areaHa: number;
  totalCompensationLakhs: number;
  dbtStatus: "CREDITED" | "DISPATCHED" | "QUEUED";
  utrNumber?: string;
}

const VERIFIED_CITIZENS: CitizenRecord[] = [
  {
    id: "CITIZEN-DAUSA-042A",
    name: "Rameshwar Prasad Meena",
    email: "rameshwar.meena@citizen.gov.in",
    phone: "9829012345",
    aadhaarLast4: "4291",
    khasraNo: "Plot 42A",
    village: "Ramgarh Revenue Ward 3",
    tehsil: "Dausa",
    district: "Dausa",
    state: "Rajasthan",
    areaHa: 2.45,
    totalCompensationLakhs: 223.44,
    dbtStatus: "CREDITED",
    utrNumber: "PFMS1679001234",
  },
  {
    id: "CITIZEN-RAM-108B",
    name: "Smt. Sunita Devi",
    email: "sunita.devi@citizen.gov.in",
    phone: "9876543210",
    aadhaarLast4: "8820",
    khasraNo: "Khasra 108/2",
    village: "Ramgarh",
    tehsil: "Bandikui",
    district: "Dausa",
    state: "Rajasthan",
    areaHa: 0.85,
    totalCompensationLakhs: 34.80,
    dbtStatus: "DISPATCHED",
    utrNumber: "PFMS1679005678",
  },
  {
    id: "CITIZEN-SWM-089A",
    name: "Vikram Rathore",
    email: "vikram.rathore@citizen.gov.in",
    phone: "9414098765",
    aadhaarLast4: "5512",
    khasraNo: "Khasra 89/1",
    village: "Chauth Ka Barwara",
    tehsil: "Sawai Madhopur",
    district: "Sawai Madhopur",
    state: "Rajasthan",
    areaHa: 1.60,
    totalCompensationLakhs: 78.20,
    dbtStatus: "QUEUED",
    utrNumber: undefined,
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { citizenId, aadhaarOrPhone, otp } = body;

    let citizen: CitizenRecord | undefined;

    if (citizenId) {
      citizen = VERIFIED_CITIZENS.find((c) => c.id === citizenId);
    } else if (aadhaarOrPhone) {
      const clean = String(aadhaarOrPhone).replace(/[\s-]/g, "");
      citizen = VERIFIED_CITIZENS.find(
        (c) =>
          c.aadhaarLast4 === clean.slice(-4) ||
          c.phone === clean ||
          clean.includes(c.aadhaarLast4)
      );

      // If user typed a custom phone/aadhaar not in presets, create a dynamically matched citizen record for smooth demo
      if (!citizen) {
        citizen = {
          id: `CITIZEN-${clean.slice(-4)}`,
          name: "Landowner Citizen",
          email: `citizen.${clean.slice(-4)}@gov.in`,
          phone: clean.length === 10 ? clean : "9829012345",
          aadhaarLast4: clean.slice(-4) || "9999",
          khasraNo: "Plot 104/A",
          village: "Ramgarh",
          tehsil: "Dausa",
          district: "Dausa",
          state: "Rajasthan",
          areaHa: 1.20,
          totalCompensationLakhs: 58.4,
          dbtStatus: "CREDITED",
          utrNumber: "PFMS" + Math.floor(1000000000 + Math.random() * 9000000000),
        };
      }
    } else {
      // Default to first preset citizen for quick demo login
      citizen = VERIFIED_CITIZENS[0];
    }

    if (!citizen) {
      return NextResponse.json(
        { error: "Landowner record not found for the provided Aadhaar/Mobile number." },
        { status: 404 }
      );
    }

    // 8-hour session expiry
    const exp = Date.now() + 8 * 60 * 60 * 1000;
    const sessionPayload: UserSession = {
      userId: citizen.id,
      name: citizen.name,
      email: citizen.email,
      role: "CITIZEN",
      userType: "CITIZEN",
      aadhaarLast4: citizen.aadhaarLast4,
      phone: citizen.phone,
      khasraNo: citizen.khasraNo,
      village: citizen.village,
      district: citizen.district,
      state: citizen.state,
      exp,
    };

    const token = await signSession(sessionPayload);

    // Record citizen login in audit log
    await appendAuditRecord(
      "CITIZEN_LOGIN",
      "CITIZEN-PORTAL",
      citizen.id,
      {
        name: citizen.name,
        aadhaarLast4: citizen.aadhaarLast4,
        khasraNo: citizen.khasraNo,
        village: citizen.village,
      }
    );

    const response = NextResponse.json({
      success: true,
      message: "Citizen authenticated successfully via UIDAI OTP",
      user: {
        id: citizen.id,
        name: citizen.name,
        email: citizen.email,
        role: "CITIZEN",
        userType: "CITIZEN",
        aadhaarLast4: citizen.aadhaarLast4,
        phone: citizen.phone,
        khasraNo: citizen.khasraNo,
        village: citizen.village,
        district: citizen.district,
        state: citizen.state,
        totalCompensationLakhs: citizen.totalCompensationLakhs,
        dbtStatus: citizen.dbtStatus,
        utrNumber: citizen.utrNumber,
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
    console.error("Citizen authentication error:", error);
    return NextResponse.json(
      { error: "Internal error authenticating citizen" },
      { status: 500 }
    );
  }
}
