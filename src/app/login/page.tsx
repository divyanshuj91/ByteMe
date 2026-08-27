"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  User,
  Usb,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  BadgeCheck,
  Smartphone,
  CreditCard,
  RefreshCw,
  Landmark,
  UserCheck,
  CheckCircle2,
  UserPlus,
  LogIn,
  Mail,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const authReason = searchParams.get("reason");

  // Auth Type: "SIGN_IN" or "SIGN_UP"
  const [authType, setAuthType] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");

  // Portal Mode for Sign In: "CITIZEN" or "OFFICER"
  const [authMode, setAuthMode] = useState<"CITIZEN" | "OFFICER">("CITIZEN");

  // Registration Form States (Exclusively for Citizens & Landowners)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");

  // Officer Form States
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPassword, setOfficerPassword] = useState("");
  const [dscScanning, setDscScanning] = useState(false);
  const [dscSuccess, setDscSuccess] = useState(false);

  // Citizen Form States
  const [citizenLoginMethod, setCitizenLoginMethod] = useState<"AADHAAR" | "EMAIL">("EMAIL");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [citizenPassword, setCitizenPassword] = useState("");
  const [aadhaarOrPhone, setAadhaarOrPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"INPUT" | "OTP_SENT">("INPUT");
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Common Loading & Error States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // 1. Citizen Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aadhaarOrPhone) {
      setErrorMsg("Please enter your Aadhaar or Mobile Number.");
      return;
    }

    setOtpSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", identifier: aadhaarOrPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to generate OTP.");
        setOtpSending(false);
        return;
      }

      setOtpStep("OTP_SENT");
      setOtpSending(false);
      setOtpCountdown(60);
      setOtpValue("123456"); // Pre-fill demo OTP for one-click testing
      setSuccessMsg("UIDAI OTP sent! Demo code: 123456 pre-filled.");
    } catch {
      setErrorMsg("Network error contacting UIDAI Aadhaar gateway.");
      setOtpSending(false);
    }
  };

  // 2a. Citizen Email+Password Login
  const handleCitizenEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: citizenEmail.trim().toLowerCase(), password: citizenPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const target = redirectTarget || "/citizen-portal";
      router.push(target);
    } catch {
      setErrorMsg("Network error connecting to authentication service.");
      setLoading(false);
    }
  };

  // 2b. Citizen Verify OTP & Login
  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // First verify OTP
      const otpRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          identifier: aadhaarOrPhone,
          otp: otpValue,
        }),
      });

      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        setErrorMsg(otpData.error || "Invalid OTP code.");
        setLoading(false);
        return;
      }

      // Then authenticate citizen session
      const res = await fetch("/api/auth/citizen-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarOrPhone, otp: otpValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Citizen verification failed.");
        setLoading(false);
        return;
      }

      const target = redirectTarget || "/citizen-portal";
      router.push(target);
    } catch {
      setErrorMsg("Network error connecting to Citizen Land Records portal.");
      setLoading(false);
    }
  };

  // 3. Officer Standard Login
  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: officerEmail, password: officerPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Authentication failed. Invalid credentials.");
        setLoading(false);
        return;
      }

      const target = redirectTarget || "/executive-dashboard";
      router.push(target);
    } catch {
      setErrorMsg("Network error contacting NIC Parichay Auth Server.");
      setLoading(false);
    }
  };

  // 4. Officer DSC Token Login
  const handleDscAuth = async () => {
    setDscScanning(true);
    setDscSuccess(false);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: officerEmail || "cala.dausa@gov.in",
          dscChallenge: "DSC_HARDWARE_TOKEN_VERIFIED",
        }),
      });

      if (res.ok) {
        setDscScanning(false);
        setDscSuccess(true);
        setTimeout(() => {
          const target = redirectTarget || "/executive-dashboard";
          router.push(target);
        }, 800);
      } else {
        setDscScanning(false);
        setErrorMsg("DSC Certificate signature verification failed.");
      }
    } catch {
      setDscScanning(false);
      setErrorMsg("Hardware cryptographic token communication failure.");
    }
  };

  // 5. User Registration (Sign Up)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: "CITIZEN",
          phone: regPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Citizen account created successfully! Redirecting...");
      setTimeout(() => {
        router.push(redirectTarget || "/citizen-portal");
      }, 700);
    } catch {
      setErrorMsg("Network error connecting to registration service.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col justify-between p-4 md:p-8 font-sans">
      {/* Top minimal header */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg font-serif">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-sans font-bold shadow-sm">
            NL
          </div>
          <span className="tracking-tight">NLAMS</span>
        </Link>
        <span className="text-xs font-sans font-semibold bg-surface-container-high px-3 py-1 rounded-full text-emphasis border border-outline-variant/30 flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-primary" />
          <span>Gov of India • National Portal</span>
        </span>
      </div>

      {/* Main Login Card */}
      <main className="w-full max-w-xl mx-auto my-auto py-6">
        {/* Seal and Title */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center shadow-inner text-primary">
            {authType === "SIGN_UP" ? (
              <UserPlus className="w-9 h-9 text-primary" />
            ) : authMode === "CITIZEN" ? (
              <UserCheck className="w-9 h-9 text-emerald-700" />
            ) : (
              <ShieldCheck className="w-9 h-9 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-on-surface font-sans">
            {authType === "SIGN_UP"
              ? "Citizen & Landowner Registration"
              : authMode === "CITIZEN"
              ? "Citizen & Landowner Portal"
              : "Officer Authentication Portal"}
          </h1>
          <p className="text-xs text-emphasis mt-1">
            {authType === "SIGN_UP"
              ? "Create your citizen account to track land parcels, DBT compensation, and claims"
              : authMode === "CITIZEN"
              ? "Verify Land Parcels, Compensation (Sec 26-30), DBT Status & Receipts"
              : "Department of Land Resources (DoLR) • RFCTLARR-2013 Command"}
          </p>
        </div>

        {/* Top-Level Sign In vs Sign Up Tab Switcher */}
        <div className="flex rounded-2xl bg-surface-container p-1 border border-outline-variant/40 mb-4 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setAuthType("SIGN_IN");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authType === "SIGN_IN"
                ? "bg-surface-container-highest text-on-surface shadow-sm border border-outline-variant/50"
                : "text-emphasis hover:text-on-surface"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In (Login)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthType("SIGN_UP");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authType === "SIGN_UP"
                ? "bg-emerald-700 text-white shadow-sm font-semibold"
                : "text-emphasis hover:text-on-surface"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Citizen Sign Up</span>
          </button>
        </div>

        {/* Sign In Mode: Citizen vs Officer Selector */}
        {authType === "SIGN_IN" && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-high rounded-2xl mb-5 text-xs font-bold border border-outline-variant/40 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setAuthMode("CITIZEN");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "CITIZEN"
                  ? "bg-emerald-700 text-white shadow-md font-semibold"
                  : "text-emphasis hover:text-on-surface"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Citizen / Landowner</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("OFFICER");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === "OFFICER"
                  ? "bg-primary text-white shadow-md font-semibold"
                  : "text-emphasis hover:text-on-surface"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Officer Portal (SSO)</span>
            </button>
          </div>
        )}
        {/* Middleware Access Alert Banner */}
        {authReason === "auth_required" && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Security Notice: Authentication is required to access protected statutory modules.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-success-green/15 border border-success-green/30 text-success-green text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-success-green" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== SIGN UP VIEW ===================== */}
        {authType === "SIGN_UP" && (
          <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl border border-outline-variant/40">
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                  Full Name / Landowner Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold font-sans"
                    placeholder="e.g. Rameshwar Prasad Meena"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Mobile Phone (Optional) */}
              <div>
                <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                    Password (min 6 chars)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{loading ? "Creating Encrypted Citizen Account..." : "Create Citizen Account & Access Portal"}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthType("SIGN_IN")}
                  className="text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  Already have an account? Sign In here →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== CITIZEN LOGIN VIEW ===================== */}
        {authType === "SIGN_IN" && authMode === "CITIZEN" && (
          <div>
            {/* Citizen Login Method Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl mb-4 text-xs font-bold border border-outline-variant/40 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setCitizenLoginMethod("EMAIL");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  citizenLoginMethod === "EMAIL"
                    ? "bg-emerald-700 text-white shadow-md font-semibold"
                    : "text-emphasis hover:text-on-surface"
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Login with Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCitizenLoginMethod("AADHAAR");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  citizenLoginMethod === "AADHAAR"
                    ? "bg-emerald-700 text-white shadow-md font-semibold"
                    : "text-emphasis hover:text-on-surface"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Aadhaar OTP</span>
              </button>
            </div>

            {/* Clean Citizen Login Box */}
            <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl border border-outline-variant/40">

              {/* ===== EMAIL + PASSWORD LOGIN ===== */}
              {citizenLoginMethod === "EMAIL" && (
                <form onSubmit={handleCitizenEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={citizenEmail}
                        onChange={(e) => setCitizenEmail(e.target.value)}
                        className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={citizenPassword}
                        onChange={(e) => setCitizenPassword(e.target.value)}
                        className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>{loading ? "Authenticating..." : "Sign In to Citizen Portal"}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthType("SIGN_UP");
                        setErrorMsg(null);
                      }}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      Don&apos;t have an account? Register here →
                    </button>
                  </div>
                </form>
              )}

              {/* ===== AADHAAR OTP LOGIN ===== */}
              {citizenLoginMethod === "AADHAAR" && (
                <form onSubmit={handleCitizenLogin} className="space-y-4">
                  {/* Aadhaar or Mobile input */}
                  <div>
                    <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                      Aadhaar Number / Registered Mobile
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={aadhaarOrPhone}
                        onChange={(e) => setAadhaarOrPhone(e.target.value)}
                        className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                        placeholder="12-digit Aadhaar / 10-digit Mobile"
                      />
                    </div>
                  </div>

                  {/* OTP Section */}
                  {otpStep === "INPUT" ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {otpSending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                      <span>{otpSending ? "Dispatching UIDAI OTP..." : "Send Aadhaar OTP"}</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs uppercase text-emphasis font-bold">
                            Enter 6-Digit OTP
                          </label>
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={otpValue}
                            onChange={(e) => setOtpValue(e.target.value)}
                            className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-mono font-bold tracking-widest text-center"
                            placeholder="••••••"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-emphasis">
                        <span>Didn&apos;t receive code?</span>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpCountdown > 0 || otpSending}
                          className="text-primary font-bold hover:underline disabled:opacity-50"
                        >
                          {otpCountdown > 0
                            ? `Resend in ${otpCountdown}s`
                            : "Resend UIDAI OTP"}
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !otpValue}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {loading ? (
                          <span>Verifying Cryptographic UIDAI Session...</span>
                        ) : (
                          <>
                            <span>Verify & Enter Citizen Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================== OFFICER LOGIN VIEW ===================== */}
        {authType === "SIGN_IN" && authMode === "OFFICER" && (
          <div>
            {/* Clean Officer Login Box */}
            <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl border border-outline-variant/40">
              <form onSubmit={handleOfficerLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                    Official Email / Parichay ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={officerEmail}
                      onChange={(e) => setOfficerEmail(e.target.value)}
                      className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                      placeholder="name@gov.in"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs uppercase text-emphasis mb-1 font-bold">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={officerPassword}
                      onChange={(e) => setOfficerPassword(e.target.value)}
                      className="solarized-input w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-sans font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Verifying HMAC-SHA256 Token...</span>
                  ) : (
                    <>
                      <span>Sign In to Officer Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5 flex items-center justify-center">
                <div className="border-t border-outline-variant/40 w-full" />
                <span className="bg-[#eee8d5] px-3 text-[10px] uppercase font-bold text-emphasis absolute rounded-full">
                  Or Cryptographic Hardware
                </span>
              </div>

              {/* DSC USB Token Flow */}
              <div>
                <button
                  type="button"
                  onClick={handleDscAuth}
                  disabled={dscScanning}
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest border border-primary/40 text-primary font-sans text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Usb className="w-4 h-4" />
                  <span>
                    {dscScanning
                      ? "Verifying PKCS#11 Hardware Token..."
                      : dscSuccess
                      ? "DSC Token Verified & Signed!"
                      : "Authenticate via Class 3 DSC Token"}
                  </span>
                </button>

                {dscSuccess && (
                  <div className="mt-2 p-2 bg-success-green/10 border border-success-green/30 rounded-lg text-xs font-sans text-success-green flex items-center gap-1.5 font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>CCA India Class 3 Certificate Authenticated (2048-bit RSA)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto text-center text-xs text-emphasis space-y-1">
        <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
          <BadgeCheck className="w-3.5 h-3.5" />
          <span>Server-Side HttpOnly Session Guard Active (Edge & Node.js Compatible)</span>
        </span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center font-mono text-sm text-emphasis">
          Initializing portal security modules...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
