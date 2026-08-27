"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getStoredProjects } from "@/lib/storage";
import { AcquisitionProject } from "@/types";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Building2,
  MapPin,
  CircleDollarSign,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Filter,
  UserCheck,
  FileText,
  Send,
  ExternalLink,
  BadgeCheck,
} from "lucide-react";

export default function OperationsDashboardPage() {
  const [projects, setProjects] = useState<AcquisitionProject[]>([]);
  const [selectedQueueFilter, setSelectedQueueFilter] = useState("ALL");
  const [approvedActionMsg, setApprovedActionMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLiveProjects() {
      try {
        const res = await fetch("/api/acquisitions");
        if (res.ok) {
          const result = await res.json();
          if (result && result.data && Array.isArray(result.data)) {
            setProjects(result.data);
            return;
          }
        }
      } catch (err) {
        console.warn("Live projects fetch fallback:", err);
      }
      setProjects(getStoredProjects());
    }
    fetchLiveProjects();
  }, []);

  const pendingApprovals = [
    {
      id: "appr-1",
      caseCode: "NHAI-DEL-MUM-PKG4",
      title: "Delhi-Mumbai Exp Package 4",
      section: "Section 11(1)",
      stepName: "Preliminary Gazette Publication Approval",
      officer: "Rajeshwar Sharma, CALA",
      submittedDate: "2024-11-20",
      ageDays: 4,
      priority: "HIGH",
      status: "PENDING_CALA_SIGN",
    },
    {
      id: "appr-2",
      caseCode: "RAIL-DFCC-W-PKG2",
      title: "Western Dedicated Freight Corridor",
      section: "Section 19(1)",
      stepName: "Declaration of Acquisition & R&R Sanction",
      officer: "District Collectorate, Sawai Madhopur",
      submittedDate: "2024-11-18",
      ageDays: 6,
      priority: "CRITICAL",
      status: "PENDING_COLLECTOR",
    },
    {
      id: "appr-3",
      caseCode: "METRO-DEL-EXT-PH4",
      title: "Delhi Metro Phase 4 Corridor",
      section: "Section 23",
      stepName: "Award Determination & Solatium Approval",
      officer: "State Land Directorate",
      submittedDate: "2024-11-22",
      ageDays: 2,
      priority: "MEDIUM",
      status: "PENDING_FINANCE",
    },
  ];

  const handleApproveCase = (id: string, title: string) => {
    setApprovedActionMsg(`Case ${title} approved and digitally signed with Class 3 DSC token!`);
    setTimeout(() => setApprovedActionMsg(null), 4500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase bg-surface-container-high px-2 py-0.5 rounded text-secondary border border-outline-variant/30">
                  District Operations Hub
                </span>
                <span className="text-xs font-mono text-emphasis">
                  Dausa & Sawai Madhopur Circles
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mt-1 font-sans">
                Operations & Approvals Dashboard
              </h1>
              <p className="text-xs text-emphasis mt-0.5">
                Active workflow execution, surveyor field assignments, and statutory CALA sign-off queue.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/acquisitions/new"
                className="bg-primary hover:bg-primary/90 text-white text-xs font-mono uppercase tracking-wider px-4 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>+ New Requisition</span>
              </Link>
            </div>
          </div>

          {/* Action Success Toast */}
          {approvedActionMsg && (
            <div className="mb-6 p-3 rounded-xl bg-success-green/15 border border-success-green/30 text-success-green text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{approvedActionMsg}</span>
            </div>
          )}

          {/* Top Bento Operational Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Metric 1 */}
            <div className="glass-card rounded-2xl p-5 border border-outline-variant/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emphasis font-bold uppercase">
                  Active Cases
                </span>
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-on-surface">
                  {projects.length || 4}
                </div>
                <div className="text-[11px] font-mono text-emphasis mt-1 flex justify-between">
                  <span>Target: &lt;10 per CALA</span>
                  <span className="text-secondary font-bold">On Track</span>
                </div>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="glass-card rounded-2xl p-5 border border-outline-variant/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emphasis font-bold uppercase">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-tertiary" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-primary">
                  {pendingApprovals.length}
                </div>
                <div className="text-[11px] font-mono text-emphasis mt-1 flex justify-between">
                  <span>Avg Queue Age: 4.0 Days</span>
                  <span className="text-warning font-bold">In SLA Window</span>
                </div>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="glass-card rounded-2xl p-5 border border-outline-variant/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emphasis font-bold uppercase">
                  Field Surveys
                </span>
                <UserCheck className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-secondary">
                  18 / 22
                </div>
                <div className="text-[11px] font-mono text-emphasis mt-1 flex justify-between">
                  <span>Patwari Ground Truth</span>
                  <span className="text-success-green font-bold">82% Verified</span>
                </div>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="glass-card rounded-2xl p-5 border border-outline-variant/40 flex flex-col justify-between h-36">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emphasis font-bold uppercase">
                  Total Land Extent
                </span>
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono text-on-surface">
                  {projects.reduce((acc, p) => acc + p.totalAreaHa, 0).toFixed(1)} Ha
                </div>
                <div className="text-[11px] font-mono text-emphasis mt-1 flex justify-between">
                  <span>Across Corridors</span>
                  <span className="text-primary font-bold">In RoW Alignment</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Approvals Queue */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-outline-variant/20">
              <div>
                <h3 className="text-base font-bold text-on-surface font-sans">
                  CALA Statutory Sign-off Queue
                </h3>
                <p className="text-xs text-emphasis mt-0.5 font-mono">
                  Gazette notifications and Section 23 award sheets awaiting digital signature.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emphasis">Priority:</span>
                <select
                  value={selectedQueueFilter}
                  onChange={(e) => setSelectedQueueFilter(e.target.value)}
                  className="solarized-input px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-primary"
                >
                  <option value="ALL">All Approvals</option>
                  <option value="CRITICAL">Critical SLA (&lt;3 Days)</option>
                  <option value="HIGH">High Priority</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-emphasis">
                    <th className="pb-3 font-semibold">Case Reference</th>
                    <th className="pb-3 font-semibold">Statutory Clause</th>
                    <th className="pb-3 font-semibold">Pending Milestone</th>
                    <th className="pb-3 font-semibold">Queue Age</th>
                    <th className="pb-3 font-semibold">Authority</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {pendingApprovals.map((appr) => (
                    <tr key={appr.id} className="hover:bg-surface-container/40 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-primary">{appr.caseCode}</div>
                        <div className="text-[11px] text-emphasis truncate max-w-xs">{appr.title}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
                          {appr.section}
                        </span>
                      </td>
                      <td className="py-3 text-on-surface">
                        {appr.stepName}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            appr.priority === "CRITICAL"
                              ? "bg-danger/15 text-danger border border-danger/30"
                              : "bg-warning/15 text-warning border border-warning/30"
                          }`}
                        >
                          {appr.ageDays} Days in Queue
                        </span>
                      </td>
                      <td className="py-3 text-emphasis">
                        {appr.officer}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleApproveCase(appr.id, appr.title)}
                          className="bg-primary hover:bg-primary/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Send className="w-3 h-3" />
                          <span>DSC Sign & Issue</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Projects Operational Table */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/20">
              <h3 className="text-base font-bold text-on-surface font-sans">
                Active District Acquisition Dossiers
              </h3>
              <Link
                href="/workflow"
                className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>View Full Statutory Workflow</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30 space-y-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{proj.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        proj.status === "ON_TRACK"
                          ? "bg-success-green/15 text-success-green border border-success-green/30"
                          : "bg-danger/15 text-danger border border-danger/30"
                      }`}
                    >
                      {proj.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface font-sans">{proj.title}</h4>
                  <div className="flex justify-between text-[11px] text-emphasis">
                    <span>Sponsoring: {proj.sponsoringAgency}</span>
                    <span>Progress: {proj.stageProgress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${proj.stageProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[11px]">
                    <span className="text-emphasis">Budget: ₹{proj.sanctionedBudgetCr} Cr</span>
                    <Link
                      href={`/workflow`}
                      className="text-primary font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>Open Dossier</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
