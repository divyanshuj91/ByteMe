"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Building2,
  MapPin,
  CircleDollarSign,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useState, useEffect } from "react";
import { MOCK_PROJECTS } from "@/lib/data/mock-projects";
import { AcquisitionProject } from "@/types";

interface RedFlag {
  id: string;
  project: string;
  agency?: string;
  location?: string;
  issue?: string;
  breachType?: string;
  delay?: string;
  daysOverdue?: number;
  severity: "CRITICAL" | "WARNING" | "LITIGATION" | string;
}

export default function ExecutiveDashboardPage() {
  const [selectedState, setSelectedState] = useState("ALL");
  const [projects, setProjects] = useState<AcquisitionProject[]>(MOCK_PROJECTS);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDynamicData() {
      try {
        const [projRes, statRes] = await Promise.all([
          fetch("/api/acquisitions").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/stats").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (projRes && projRes.data && Array.isArray(projRes.data)) {
          setProjects(projRes.data);
        }
        if (statRes && statRes.data) {
          setStats(statRes.data);
        }
      } catch (err) {
        console.warn("Live executive matrix query fallback:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDynamicData();
  }, []);

  const totalActiveProjects = stats?.activeProjects || projects.length;
  const totalArea = stats?.totalAreaHa || projects.reduce((acc, p) => acc + (p.totalAreaHa || 0), 0);
  const totalDisbursed = stats?.totalDisbursedCr || projects.reduce((acc, p) => acc + (p.disbursedCompensationCr || 0), 0);
  const slaCompliance = stats?.slaCompliancePct || 91.4;

  const stageData = [
    { name: "Sec 4 (SIA)", count: stats?.stageBreakdown?.SECTION_4_SIA || 210, color: "bg-primary" },
    { name: "Sec 11 (Prelim)", count: stats?.stageBreakdown?.SECTION_11_PRELIMINARY || 312, color: "bg-secondary" },
    { name: "Sec 19 (Declaration)", count: stats?.stageBreakdown?.SECTION_19_DECLARATION || 184, color: "bg-primary-container" },
    { name: "Sec 23 (Award)", count: stats?.stageBreakdown?.SECTION_23_AWARD || 115, color: "bg-tertiary" },
    { name: "Sec 38 (Possession)", count: stats?.stageBreakdown?.SECTION_38_POSSESSION || 84, color: "bg-success-green" },
  ];

  const redFlags: RedFlag[] = (stats?.redFlags as RedFlag[] | undefined) || [
    {
      id: "rf-1",
      project: "NTPC 400MW Solar Park",
      agency: "NTPC Renewable",
      location: "Satna, MP",
      breachType: "Section 11 Objections Inquiry Exceeded",
      delay: "4 Days Overdue",
      severity: "CRITICAL",
    },
    {
      id: "rf-2",
      project: "Dholera SIR Activation B",
      agency: "DICDL",
      location: "Ahmedabad, GJ",
      breachType: "Sec 19 Declaration Sanction Pending",
      delay: "6 Days to Deadline",
      severity: "WARNING",
    },
    {
      id: "rf-3",
      project: "Delhi-Mumbai Exp Pkg 4",
      agency: "NHAI",
      location: "Dausa, RJ",
      breachType: "Litigation Stay on Khasra 219B (Sec 64)",
      delay: "Tribunal Pending",
      severity: "LITIGATION",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar />

        {/* Main Executive Canvas */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase bg-surface-container-high px-2 py-0.5 rounded text-primary border border-outline-variant/30">
                  National Apex Command
                </span>
                <span className="text-xs font-mono text-emphasis">
                  Q3 FY 2024-25
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mt-1 font-sans">
                Executive Monitoring Matrix
              </h1>
              <p className="text-xs text-emphasis mt-0.5">
                Statutory SLA monitoring, stage-gate tracking, and budget disbursement compliance across all projects.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/acquisitions/new"
                className="bg-primary text-white text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-all"
              >
                + New Project
              </Link>
            </div>
          </div>

          {/* Hero Bento KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-xl p-5 border border-outline-variant/40">
              <div className="flex items-center justify-between text-emphasis">
                <span className="text-xs font-mono uppercase">Total Active Projects</span>
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold font-mono text-primary">{totalActiveProjects.toLocaleString()}</div>
                <div className="text-[11px] font-mono text-success-green flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +5.2% vs last quarter
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border border-outline-variant/40">
              <div className="flex items-center justify-between text-emphasis">
                <span className="text-xs font-mono uppercase">Total Area Acquired</span>
                <MapPin className="w-4 h-4 text-secondary" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold font-mono text-on-surface">{Math.round(totalArea).toLocaleString()} <span className="text-xs font-normal">Ha</span></div>
                <div className="text-[11px] font-mono text-emphasis mt-1">
                  Target: {(Math.round(totalArea * 1.15)).toLocaleString()} Ha (86.9%)
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border border-outline-variant/40">
              <div className="flex items-center justify-between text-emphasis">
                <span className="text-xs font-mono uppercase">Compensation Disbursed</span>
                <CircleDollarSign className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold font-mono text-primary">₹{Math.round(totalDisbursed).toLocaleString()} <span className="text-xs font-normal">Cr</span></div>
                <div className="text-[11px] font-mono text-success-green mt-1">
                  Sanctioned: ₹{Math.round(totalDisbursed * 1.2).toLocaleString()} Cr
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5 border border-outline-variant/40">
              <div className="flex items-center justify-between text-emphasis">
                <span className="text-xs font-mono uppercase">SLA Compliance Rate</span>
                <FileCheck2 className="w-4 h-4 text-success-green" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold font-mono text-success-green">{slaCompliance}%</div>
                <div className="text-[11px] font-mono text-danger mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {redFlags.length} active alerts
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Stage Distribution & Red Flag Alert Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Stage Distribution Breakdown */}
            <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-outline-variant/40">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
                <h3 className="text-sm font-bold text-on-surface font-sans">
                  Statutory Stage Distribution (RFCTLARR)
                </h3>
                <span className="text-xs font-mono text-emphasis">905 in-flight</span>
              </div>

              <div className="space-y-4">
                {stageData.map((stage) => (
                  <div key={stage.name}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-on-surface font-semibold">{stage.name}</span>
                      <span className="text-emphasis font-bold">{stage.count} projects</span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden border border-outline-variant/30">
                      <div
                        className={`${stage.color} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${(stage.count / 350) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/30 flex items-center justify-between text-xs font-mono">
                <span className="text-emphasis">Avg. Stage Velocity:</span>
                <span className="text-primary font-bold">42 Days per Milestone</span>
              </div>
            </div>

            {/* Red Flag & SLA Breach Early Warning */}
            <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-danger/30 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-danger animate-pulse" />
                  <h3 className="text-sm font-bold text-danger font-sans">
                    Early Warning & SLA Breach Radar
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-danger bg-danger/10 px-2 py-0.5 rounded font-bold">
                  3 Critical Cases
                </span>
              </div>

              <div className="space-y-3">
                {redFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className={`p-3 rounded-xl border text-xs ${
                      flag.severity === "CRITICAL"
                        ? "bg-danger/10 border-danger/30 text-danger"
                        : flag.severity === "WARNING"
                        ? "bg-warning/10 border-warning/30 text-warning-amber"
                        : "bg-surface-container/70 border-outline-variant/40 text-emphasis"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-on-surface text-xs">
                          {flag.project}
                        </div>
                        <div className="text-[11px] font-mono text-emphasis">
                          {flag.agency} • {flag.location}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-background">
                        {flag.delay}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-on-surface-variant font-mono">
                      {flag.breachType}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-end">
                <Link
                  href="/workflow"
                  className="text-xs font-mono text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <span>Open All Escalations in Workflow</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Active Projects Table */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
              <h3 className="text-sm font-bold text-on-surface font-sans">
                Active National Infrastructure Projects
              </h3>
              <Link
                href="/workflow"
                className="text-xs font-mono text-primary font-bold hover:underline"
              >
                View Full Dossier →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-emphasis">
                    <th className="pb-3 font-semibold">Project Code & Name</th>
                    <th className="pb-3 font-semibold">State / Districts</th>
                    <th className="pb-3 font-semibold">Total Area</th>
                    <th className="pb-3 font-semibold">Current Stage</th>
                    <th className="pb-3 font-semibold">Progress</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {MOCK_PROJECTS.map((proj) => (
                    <tr key={proj.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="py-3.5 pr-3">
                        <div className="font-bold text-primary">{proj.code}</div>
                        <div className="text-[11px] text-emphasis font-sans truncate max-w-xs">
                          {proj.title}
                        </div>
                      </td>
                      <td className="py-3 text-on-surface">
                        {proj.state} ({proj.districts.join(", ")})
                      </td>
                      <td className="py-3 text-on-surface font-bold">
                        {proj.totalAreaHa} Ha
                      </td>
                      <td className="py-3">
                        <span className="bg-surface-container-high px-2 py-0.5 rounded text-[11px] font-semibold text-emphasis border border-outline-variant/40">
                          {proj.currentStage.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-surface-container-high rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${proj.stageProgress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-emphasis font-bold">
                            {proj.stageProgress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            proj.status === "ON_TRACK"
                              ? "bg-success-green/15 text-success-green border border-success-green/30"
                              : proj.status === "AT_RISK"
                              ? "bg-warning/15 text-warning-amber border border-warning/30"
                              : "bg-danger/15 text-danger border border-danger/30"
                          }`}
                        >
                          {proj.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
