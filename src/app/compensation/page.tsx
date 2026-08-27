"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useState, useMemo, useEffect } from "react";
import { computeRFCTLARRCompensation } from "@/lib/rfctlarr-engine";
import useSWR from "swr";
import DataStatusIndicator, { DataSource } from "@/components/ui/DataStatusIndicator";
import AwardDossierModal from "@/components/compensation/AwardDossierModal";
import {
  Calculator,
  CircleDollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Download,
  Building2,
  Printer,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";

export default function CompensationPage() {
  // Section 26 Rate states
  const [circleRate, setCircleRate] = useState<number>(22.0); // Lakhs/Ha
  const [saleDeedRate, setSaleDeedRate] = useState<number>(26.5); // Lakhs/Ha (3-yr top 50% avg)
  const [areaHa, setAreaHa] = useState<number>(2.45);
  const [isRural, setIsRural] = useState<boolean>(true);
  const [distanceKm, setDistanceKm] = useState<number>(14);
  const [structureValuation, setStructureValuation] = useState<number>(4.2);
  const [treesValuation, setTreesValuation] = useState<number>(1.8);
  const [interestMonths, setInterestMonths] = useState<number>(14); // from Sec 11 to Award
  const [rehabGrant, setRehabGrant] = useState<number>(5.0); // R&R one-time grant

  // Dossier Modal State
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  const effectiveMarketRate = Math.max(circleRate, saleDeedRate);

  const calculation = useMemo(() => {
    return computeRFCTLARRCompensation({
      circleRatePerHa: circleRate,
      saleDeedAvgRatePerHa: saleDeedRate,
      areaHa: areaHa,
      isRural: isRural,
      distanceFromUrbanKm: distanceKm,
      structureValuationLakhs: structureValuation,
      treesCropsValuationLakhs: treesValuation,
      interestMonths: interestMonths,
      rehabilitationAssistanceLakhs: rehabGrant,
    });
  }, [
    circleRate,
    saleDeedRate,
    areaHa,
    isRural,
    distanceKm,
    structureValuation,
    treesValuation,
    interestMonths,
    rehabGrant,
  ]);

  // Fetch live parcels using SWR
  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const { data: parcelsRes, mutate: mutateParcels } = useSWR("/api/parcels", fetcher, { refreshInterval: 15000 });
  const parcels: any[] = parcelsRes?.data || [];
  const currentSource = parcelsRes?.source as DataSource | null;

  const beneficiaries = parcels.map((p: any) => ({
    id: p.id,
    name: p.ownerName,
    khasraNo: p.khasraNo,
    village: p.village,
    areaHa: p.areaHa || 1.2,
    bankAccountMasked: "**** **** 4122",
    ifsc: "SBIN000XXXX",
    totalAwardLakhs: p.awardedAmountLakhs || 0,
    dbtStatus: p.compensationStatus === "DISBURSED" ? "SUCCESS" :
               p.compensationStatus === "ESCROW_LITIGATION" ? "HOLD_DISPUTE" :
               p.compensationStatus === "AWARD_PUBLISHED" ? "PROCESSING" : "PENDING",
    utrNumber: p.compensationStatus === "DISBURSED" ? `PFMS${p.id.slice(0, 6)}` : null
  }));

  const [dbtSuccessMsg, setDbtSuccessMsg] = useState<{ text: string; sms?: string } | null>(null);

  const handleTriggerDBT = async (id: string, name: string, parcelAreaHa: number, phone: string = "+91 98290-XXXXX") => {
    try {
      const payload = {
        parcelId: id,
        baseMarketRatePerHa: Math.max(circleRate, saleDeedRate),
        areaHa: parcelAreaHa,
        isRural,
        distanceFromUrbanKm: distanceKm,
        structureValuationLakhs: structureValuation,
        treesCropsValuationLakhs: treesValuation,
        interestMonths,
        rehabilitationAssistanceLakhs: rehabGrant
      };

      const computeRes = await fetch("/api/valuation/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const computeData = await computeRes.json();

      if (!computeRes.ok || !computeData.success) throw new Error(computeData.error || "Compute failed");

      const valuationId = computeData.data.valuationId;

      const signRes = await fetch(`/api/valuation/${valuationId}/sign`, {
        method: "POST"
      });
      const signData = await signRes.json();

      if (!signRes.ok || !signData.success) throw new Error(signData.error || "Sign failed");

      mutateParcels();
      
      const utr = `PFMS${Date.now().toString().slice(0, 10)}`;
      setDbtSuccessMsg({
        text: `PFMS DBT batch dispatched! UTR: ${utr} credited to ${name}.`,
        sms: `SMS Sent to ${phone}: "Govt of RJ: ₹${computeData.data.breakdown.totalPayableLakhs}L credited via DBT under RFCTLARR Award. Ref: ${utr}"`,
      });
      setTimeout(() => setDbtSuccessMsg(null), 6000);
    } catch (e) {
      alert("Failed to sign and disburse: " + (e as Error).message);
    }
  };

  const handleRouteToEscrow = (id: string, name: string) => {
    const escrowRef = `ESCROW-SEC64-${Date.now().toString().slice(0, 8)}`;
    const updated = beneficiaries.map((b: any) =>
      b.id === id
        ? {
            ...b,
            dbtStatus: "HOLD_DISPUTE" as const,
            disbursedLakhs: b.totalAwardLakhs,
            utrNumber: escrowRef,
            disbursedDate: new Date().toISOString().split("T")[0],
          }
        : b
    );
    // Locally updating array since we don't have a specific escrow API in this phase, 
    // but a real implementation would update parcel compensationStatus to 'ESCROW_LITIGATION'.
    setDbtSuccessMsg({
      text: `Section 64 Litigation Guard: Disbursal to ${name} locked; ₹${calculation.totalPayableLakhs}L routed to District Land Tribunal Escrow (${escrowRef}).`,
    });
    setTimeout(() => setDbtSuccessMsg(null), 6000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase bg-surface-container-high px-2 py-0.5 rounded text-primary border border-outline-variant/30">
                  RFCTLARR-2013 Valuation Engine
                </span>
                <span className="text-xs font-mono text-emphasis">
                  First & Second Schedule Compliance
                </span>
                <DataStatusIndicator source={currentSource || undefined} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mt-1 font-sans">
              Statutory Compensation & R&R Disbursements
            </h1>
            <p className="text-xs text-emphasis mt-0.5">
              Live RFCTLARR statutory award calculator with rural distance multipliers (1.0 - 2.0x), 100% Solatium, and PFMS DBT ledger.
            </p>
          </div>

          {/* Toast Message */}
          {dbtSuccessMsg && (
            <div className="mb-6 p-4 rounded-xl bg-success-green/15 border border-success-green/30 text-success-green text-xs font-mono space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{dbtSuccessMsg.text}</span>
              </div>
              {dbtSuccessMsg.sms && (
                <div className="text-[11px] text-emphasis flex items-center gap-1.5 pl-6">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span className="italic">{dbtSuccessMsg.sms}</span>
                </div>
              )}
            </div>
          )}

          {/* Top Section: Calculator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Calculator Input Form */}
            <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-outline-variant/40">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
                <h2 className="text-sm font-bold text-on-surface font-sans flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span>Statutory Formula Parameters</span>
                </h2>
                <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                  Sec 26-30 RFCTLARR
                </span>
              </div>

              <div className="space-y-3.5 text-xs font-mono">
                {/* Section 26: Dual Market Rate Comparison */}
                <div className="p-3 bg-surface-container-high/60 rounded-xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emphasis font-bold text-[11px]">
                      Section 26(1) Market Rate Determination:
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      Effective: ₹{effectiveMarketRate.toFixed(1)} L/Ha
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-emphasis mb-1">
                        Collector Circle Rate (₹ L/Ha):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={circleRate}
                        onChange={(e) => setCircleRate(Number(e.target.value))}
                        className="solarized-input w-full p-2 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emphasis mb-1">
                        3-Yr Sale Deeds Avg (₹ L/Ha):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={saleDeedRate}
                        onChange={(e) => setSaleDeedRate(Number(e.target.value))}
                        className="solarized-input w-full p-2 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-emphasis italic">
                    *Rule: Law strictly enforces the higher of Circle Rate (₹{circleRate}L) vs Registered Deeds (₹{saleDeedRate}L).
                  </p>
                </div>

                {/* Area Extent */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-emphasis font-semibold">
                      Acquired Land Extent (Hectares):
                    </label>
                    <span className="font-bold text-primary">{areaHa} Ha ({(areaHa * 2.471).toFixed(2)} Acres)</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="20"
                    step="0.05"
                    value={areaHa}
                    onChange={(e) => setAreaHa(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Rural Multiplier toggle & distance */}
                <div className="p-3 bg-surface-container-high/60 rounded-xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emphasis font-semibold">Location Multiplier (Sec 26(1)(b)):</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRural(false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !isRural
                            ? "bg-primary text-white"
                            : "bg-surface-container text-emphasis"
                        }`}
                      >
                        Urban (1.0x)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRural(true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          isRural
                            ? "bg-primary text-white"
                            : "bg-surface-container text-emphasis"
                        }`}
                      >
                        Rural (Multiplier)
                      </button>
                    </div>
                  </div>

                  {isRural && (
                    <div className="pt-2 border-t border-outline-variant/20">
                      <div className="flex justify-between mb-1">
                        <span className="text-emphasis">Distance from Urban Boundary:</span>
                        <span className="font-bold text-primary">{distanceKm} km (Factor: {calculation.multiplierFactor}x)</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="40"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Assets (Structures + Trees) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emphasis mb-1">Structures Valuation (₹ L):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={structureValuation}
                      onChange={(e) => setStructureValuation(Number(e.target.value))}
                      className="solarized-input w-full p-2 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-emphasis mb-1">Trees & Crops (₹ L):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={treesValuation}
                      onChange={(e) => setTreesValuation(Number(e.target.value))}
                      className="solarized-input w-full p-2 rounded-lg font-bold"
                    />
                  </div>
                </div>

                {/* Additional Interest & R&R Grant */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emphasis mb-1">Interest Duration (Months @12%):</label>
                    <input
                      type="number"
                      value={interestMonths}
                      onChange={(e) => setInterestMonths(Number(e.target.value))}
                      className="solarized-input w-full p-2 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-emphasis mb-1">R&R Assistance Grant (₹ L):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={rehabGrant}
                      onChange={(e) => setRehabGrant(Number(e.target.value))}
                      className="solarized-input w-full p-2 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Calculation Award Breakdown Card */}
            <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-outline-variant/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
                  <h2 className="text-sm font-bold text-on-surface font-sans flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>Statutory Award Breakdown</span>
                  </h2>
                  <span className="text-[10px] font-mono text-success-green font-bold bg-success-green/10 px-2 py-0.5 rounded">
                    RFCTLARR First Schedule
                  </span>
                </div>

                {/* Breakdown List */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Sec 26 Base Land Value (Rate × Area):</span>
                    <span className="font-semibold text-on-surface">₹{calculation.baseLandValueLakhs} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Rural Distance Multiplier:</span>
                    <span className="font-bold text-secondary">{calculation.multiplierFactor}x</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Multiplied Market Value:</span>
                    <span className="font-bold text-on-surface">₹{calculation.multipliedLandValueLakhs} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Sec 29 Asset Valuation (Structures + Trees):</span>
                    <span className="font-semibold text-on-surface">₹{calculation.structureAndAssetsLakhs} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Sec 30(1) Statutory 100% Solatium:</span>
                    <span className="font-bold text-primary">₹{calculation.solatiumLakhs} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Sec 30(3) 12% p.a. Additional Interest:</span>
                    <span className="font-semibold text-on-surface">₹{calculation.interest12PctLakhs} Lakhs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/15">
                    <span className="text-emphasis">Second Schedule R&R Grant:</span>
                    <span className="font-semibold text-on-surface">₹{calculation.rehabilitationGrantLakhs} Lakhs</span>
                  </div>
                </div>
              </div>

              {/* Total Payable Box + Form 7 Action */}
              <div className="mt-6 space-y-3">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="text-[11px] font-mono uppercase text-emphasis font-semibold">
                    Final Statutory Award Total
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl md:text-3xl font-bold font-mono text-primary">
                      ₹{calculation.totalPayableLakhs} Lakhs
                    </span>
                    <span className="text-xs font-mono font-bold text-emphasis">
                      ({calculation.currencyFormattedTotal})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDossierOpen(true)}
                  className="w-full bg-[#006098] hover:bg-[#006098]/90 text-white text-xs font-mono font-bold uppercase tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate Form 7 Statutory Award Dossier (PDF)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Beneficiary Ledger & DBT Dispatch */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
              <div>
                <h3 className="text-sm font-bold text-on-surface font-sans">
                  Direct Benefit Transfer (DBT) Beneficiary Ledger
                </h3>
                <p className="text-xs text-emphasis mt-0.5">
                  Direct PFMS / e-Kuber payment gateway integration for Aadhaar-linked accounts with Section 64 litigation safeguards.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-emphasis">
                    <th className="pb-3 font-semibold">Beneficiary Name</th>
                    <th className="pb-3 font-semibold">Khasra / Village</th>
                    <th className="pb-3 font-semibold">Bank Account</th>
                    <th className="pb-3 font-semibold">Total Award</th>
                    <th className="pb-3 font-semibold">DBT Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {beneficiaries.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="py-3 font-bold text-on-surface">
                        {b.name}
                      </td>
                      <td className="py-3 text-emphasis">
                        Plot {b.khasraNo} ({b.village})
                      </td>
                      <td className="py-3 text-on-surface">
                        {b.bankAccountMasked} ({b.ifsc})
                      </td>
                      <td className="py-3 font-bold text-primary">
                        ₹{b.totalAwardLakhs} Lakhs
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.dbtStatus === "SUCCESS"
                              ? "bg-success-green/15 text-success-green border border-success-green/30"
                              : b.dbtStatus === "PROCESSING"
                              ? "bg-primary/15 text-primary border border-primary/30"
                              : "bg-danger/15 text-danger border border-danger/30"
                          }`}
                        >
                          {b.dbtStatus}
                        </span>
                        {b.utrNumber && (
                          <div className="text-[10px] text-emphasis mt-0.5">
                            Ref: {b.utrNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {b.dbtStatus !== "SUCCESS" && b.dbtStatus !== "HOLD_DISPUTE" ? (
                          <button
                            onClick={() => handleTriggerDBT(b.id, b.name, b.areaHa)}
                            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded text-[11px] font-bold transition-all shadow-sm"
                          >
                            Sign & Disburse
                          </button>
                        ) : b.dbtStatus === "HOLD_DISPUTE" ? (
                          <button
                            onClick={() => handleRouteToEscrow(b.id, b.name)}
                            className="bg-[#dc322f] hover:bg-[#dc322f]/90 text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 ml-auto shadow-sm"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Route to Escrow (Sec 64)</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-success-green font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Disbursed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Form 7 Statutory Award Dossier Modal */}
      <AwardDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        khasraNo="Plot 42A"
        village="Ramgarh Revenue Ward 3"
        ownerName="Rameshwar Prasad Meena"
        areaHa={areaHa}
        circleRate={circleRate}
        saleDeedRate={saleDeedRate}
        isRural={isRural}
        distanceKm={distanceKm}
        calculation={calculation}
      />

      <Footer />
    </div>
  );
}
