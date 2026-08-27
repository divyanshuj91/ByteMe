/**
 * NLAMS Cryptographic Session Token & Security Utility
 * Uses Web Crypto API for zero-dependency Edge-runtime & Node.js compatibility.
 */

const SECRET_KEY = process.env.NLAMS_AUTH_SECRET || "nlams_super_secure_statutory_key_2026_goi_nic";


// Helper to convert string to BufferSource
function strToBuf(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

// Helper to convert ArrayBuffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type UserRole =
  | "CALA_OFFICER"
  | "DIRECTOR_GENERAL"
  | "SURVEYOR"
  | "FINANCE_OFFICER"
  | "CITIZEN"
  | "ADMINISTRATOR"
  | "MINISTRY";

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  userType: "OFFICER" | "CITIZEN";
  department?: string;
  state?: string;
  district?: string;
  village?: string;
  khasraNo?: string;
  aadhaarLast4?: string;
  phone?: string;
  backendToken?: string;
  exp: number; // Expiry timestamp
}

// Backward compatibility alias
export type OfficerSession = UserSession;

/**
 * Sign payload using HMAC-SHA256
 */
export async function signSession(payload: OfficerSession): Promise<string> {
  const dataString = JSON.stringify(payload);
  const dataB64 = btoa(unescape(encodeURIComponent(dataString)));

  const key = await crypto.subtle.importKey(
    "raw",
    strToBuf(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    strToBuf(dataB64)
  );

  const signatureHex = bufToHex(signatureBuffer);
  return `${dataB64}.${signatureHex}`;
}

/**
 * Verify and decode an HMAC-SHA256 session token
 */
export async function verifySession(token: string): Promise<OfficerSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [dataB64, signatureHex] = parts;
    const dataString = decodeURIComponent(escape(atob(dataB64)));
    const payload: OfficerSession = JSON.parse(dataString);

    // Check expiry
    if (Date.now() > payload.exp) {
      return null;
    }

    // Verify cryptographic signature
    const key = await crypto.subtle.importKey(
      "raw",
      strToBuf(SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert signatureHex back to Uint8Array
    const sigBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      strToBuf(dataB64)
    );

    return isValid ? payload : null;
  } catch {
    return null;
  }
}
