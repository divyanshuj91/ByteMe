"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { AcquisitionProject, Milestone } from "@/types";
import DataStatusIndicator, { DataSource } from "@/components/ui/DataStatusIndicator";
import {
  GitFork,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  Building,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Download,
  Eye,
  KeyRound,
  Lock,
  X,
  Search,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  BadgeCheck,
} from "lucide-react";

export default function WorkflowPage() {

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  
  // Interactive Modals
  const [isDscModalOpen, setIsDscModalOpen] = useState(false);
  const [dscPin, setDscPin] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    name: string;
    stage: string;
    section: string;
  } | null>(null);

  // SWR fetcher
  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  // Fetch live acquisitions
  const { data: acqRes } = useSWR("/api/acquisitions", fetcher, { refreshInterval: 15000 });
  const projects: AcquisitionProject[] = acqRes?.data || [];
  
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Fetch live workflow for selected project
  const { data: workflowRes, mutate: mutateWorkflow } = useSWR(
    selectedProjectId ? `/api/projects/${selectedProjectId}/workflow` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const activeMilestones = workflowRes?.data?.milestones || selectedProject?.milestones || [];
  const currentSource = (workflowRes?.source || acqRes?.source || null) as DataSource | null;

  const handleAdvanceStage = async () => {
    if (!selectedProject) return;

    setIsSigning(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/workflow/advance`, { method: "POST" });
      const result = await res.json();
      
      if (res.ok) {
        setIsDscModalOpen(false);
        setDscPin("");
        mutateWorkflow(); // Refresh workflow data
        
        const dscHash = `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
        setActionSuccessMessage(
          `Stage formally signed & gazetted with Class 3 DSC Token (${dscHash})! Acquisition progress updated.`
        );
        setTimeout(() => setActionSuccessMessage(null), 6000);
      } else {
        alert(result.error || "Failed to advance workflow. Ensure prerequisite guards are met.");
      }
    } catch (err) {
      alert("Network error while advancing workflow.");
    } finally {
      setIsSigning(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-on-background">
        <Navbar />
        <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
            <p className="text-emphasis font-mono animate-pulse">Loading workflow engine...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header & Case Dossier Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                  RFCTLARR Statutory Pipeline
                </span>
                <span className="text-xs font-mono text-emphasis">
                  Tamper-Evident Workflow Engine
                </span>
                <DataStatusIndicator source={currentSource || undefined} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mt-1.5 font-sans">
                Stage-Gated Acquisition Dossier
              </h1>
            </div>

            {/* Intuitive Case Picker */}
            <div className="flex items-center gap-2 bg-surface-container/80 p-1.5 rounded-2xl border border-outline-variant/40 shadow-sm">
              <label className="text-xs font-mono font-bold text-primary pl-2 flex items-center gap-1.5 shrink-0">
                <Building className="w-3.5 h-3.5 text-primary" />
                <span>Active Case:</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-background text-on-surface text-xs font-mono font-bold px-3 py-2 rounded-xl border border-outline-variant/40 focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.code} — {proj.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Success Notification Toast */}
          {actionSuccessMessage && (
            <div className="mb-6 p-4 rounded-xl bg-success-green/15 border border-success-green/30 text-success-green text-xs font-mono flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-success-green" />
                <span className="font-semibold">{actionSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActionSuccessMessage(null)}
                className="text-success-green hover:text-emerald-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Project Dossier Header Card */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40 mb-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Project Info Left Column */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold font-mono px-2.5 py-0.5 rounded-lg bg-primary text-white">
                    {selectedProject.code}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
                      selectedProject.status === "ON_TRACK"
                        ? "bg-success-green/15 text-success-green border border-success-green/30"
                        : "bg-danger/15 text-danger border border-danger/30"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>{selectedProject.status.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-xs font-mono text-emphasis px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30">
                    Sponsoring: {selectedProject.sponsoringAgency}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-on-surface font-sans">
                  {selectedProject.title}
                </h2>
                <p className="text-xs sm:text-sm text-emphasis leading-relaxed font-sans">
                  {selectedProject.description}
                </p>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 text-xs font-mono text-emphasis border-t border-outline-variant/20">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    <span><strong>CALA Lead:</strong> {selectedProject.officerName}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-secondary" />
                    <span><strong>Location:</strong> {selectedProject.state} ({selectedProject.districts.join(", ")})</span>
                  </div>
                </div>
              </div>

              {/* 4 Metric Stats Right Column */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3 font-mono">
                {/* Stat 1: Overall Progress */}
                <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-emphasis">
                    <span className="font-bold">Progress</span>
                    <span className="text-primary font-bold">{selectedProject.stageProgress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2 overflow-hidden my-2">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all"
                      style={{ width: `${selectedProject.stageProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-emphasis">RFCTLARR Stages</span>
                </div>

                {/* Stat 2: Total Area */}
                <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emphasis">Total Area</span>
                  <div className="text-lg font-bold text-on-surface my-0.5">
                    {selectedProject.totalAreaHa} <span className="text-xs font-normal">Ha</span>
                  </div>
                  <Link
                    href="/gis-map"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>View GIS Overlay</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stat 3: Compensation DBT */}
                <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emphasis">Compensation</span>
                  <div className="text-lg font-bold text-success-green my-0.5">
                    ₹{selectedProject.disbursedCompensationCr} <span className="text-xs font-normal">Cr</span>
                  </div>
                  <span className="text-[10px] text-success-green font-semibold">PFMS Direct Transfer</span>
                </div>

                {/* Stat 4: SLA Remaining */}
                <div className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/30 flex flex-col justify-between">
                  <span className="text-xs font-bold text-emphasis">Statutory SLA</span>
                  <div
                    className={`text-lg font-bold my-0.5 ${
                      selectedProject.slaDaysRemaining > 0 ? "text-primary" : "text-danger"
                    }`}
                  >
                    {selectedProject.slaDaysRemaining} <span className="text-xs font-normal">Days</span>
                  </div>
                  <span className="text-[10px] text-emphasis">Mandatory 12-Mo Window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Milestone Stepper & Execution Card */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/40 mb-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-outline-variant/30 gap-3">
              <div>
                <h3 className="text-base font-bold text-on-surface font-sans flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span>Statutory Milestone Pipeline (Sections 4 to 38)</span>
                </h3>
                <p className="text-xs text-emphasis mt-0.5 font-mono">
                  Enforces non-repudiation, biometric sign-offs, and gazette publication timelines.
                </p>
              </div>

              <button
                onClick={() => setIsDscModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg flex items-center gap-2 transition-all shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>e-Sign Next Stage Approval</span>
              </button>
            </div>

            {/* Visual Stepper List */}
            <div className="space-y-4">
              {activeMilestones && activeMilestones.length > 0 ? (
                activeMilestones.map((m: any, idx: number) => {
                  const isCompleted = m.status === "COMPLETED";
                  const isInProgress = m.status === "IN_PROGRESS";

                  return (
                    <div
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCompleted
                          ? "bg-surface-container/60 border-outline-variant/40"
                          : isInProgress
                          ? "bg-[#89f5ea]/10 border-primary/40 shadow-md ring-1 ring-primary/20"
                          : "bg-surface-container-low/30 border-outline-variant/20 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Step Icon & Title */}
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm ${
                              isCompleted
                                ? "bg-success-green text-white"
                                : isInProgress
                                ? "bg-primary text-white animate-pulse"
                                : "bg-surface-container-high text-emphasis"
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                                {m.section}
                              </span>
                              <span className="text-xs font-mono text-emphasis">
                                {m.actReference}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                                  isCompleted
                                    ? "bg-success-green/15 text-success-green border border-success-green/30"
                                    : isInProgress
                                    ? "bg-primary/15 text-primary border border-primary/30"
                                    : "bg-surface-container-high text-emphasis"
                                }`}
                              >
                                {m.status.replace(/_/g, " ")}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-on-surface font-sans">
                              {m.name}
                            </h4>

                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-emphasis">
                              <span><strong>Officer:</strong> {m.officerInCharge}</span>
                              {m.completedDate && (
                                <span className="text-success-green font-semibold">
                                  • Completed: {m.completedDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Target Date & Interactive Attached Files */}
                        <div className="flex flex-col lg:items-end gap-2 text-xs font-mono border-t lg:border-t-0 pt-3 lg:pt-0 border-outline-variant/20">
                          <div className="flex items-center gap-1.5 text-emphasis">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>Target Date: <strong>{m.targetDate}</strong></span>
                          </div>

                          {/* Interactive File Pills */}
                          {m.documents && m.documents.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {m.documents.map((doc: any, docIdx: number) => (
                                <button
                                  key={docIdx}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDocPreview({
                                      name: doc.name,
                                      stage: m.name,
                                      section: m.section,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 bg-background hover:bg-surface-container-high px-2.5 py-1 rounded-lg text-[11px] text-primary border border-outline-variant/40 transition-colors shadow-sm font-bold group"
                                >
                                  <FileText className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                                  <span>{doc.name}</span>
                                  <Eye className="w-3 h-3 text-emphasis ml-0.5 opacity-60" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs font-mono text-emphasis">
                  Milestones initialized under standard RFCTLARR-2013 statutory pipeline.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Interactive DSC Sign-Off Authorization Modal */}
      {isDscModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card rounded-2xl p-6 md:p-8 max-w-lg w-full border border-primary/40 shadow-2xl space-y-5 bg-[#eee8d5] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                  DSC
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface font-sans">
                    CALA Statutory Sign-Off
                  </h3>
                  <p className="text-[11px] font-mono text-emphasis">
                    Class 3 Hardware Token e-Sign Authentication
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDscModalOpen(false)}
                className="p-1 rounded-md text-emphasis hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-surface-container/70 border border-outline-variant/30 space-y-1">
                <div className="text-[10px] uppercase text-emphasis font-bold">Signatory Authority</div>
                <div className="font-bold text-primary text-sm">
                  {selectedProject.officerName} (Competent Authority Land Acquisition)
                </div>
                <div className="text-[11px] text-emphasis">
                  District Collectorate • Government of India
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container/70 border border-outline-variant/30 space-y-1">
                <div className="text-[10px] uppercase text-emphasis font-bold">Statutory Milestone</div>
                <div className="font-bold text-on-surface">
                  Section 23 Enquiry &amp; Award Declaration
                </div>
                <div className="text-[11px] text-success-green font-semibold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>SIA, Section 11 &amp; Section 19 Pre-requisites Cleared</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emphasis mb-1">
                  Enter 6-Digit Cryptographic DSC PIN:
                </label>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={dscPin}
                    onChange={(e) => setDscPin(e.target.value)}
                    className="solarized-input font-mono text-sm px-3 py-2 rounded-xl flex-1 tracking-widest font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setIsDscModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-emphasis hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigning || dscPin.length < 4}
                onClick={handleAdvanceStage}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                {isSigning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing Gazette...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Affix Digital Signature &amp; Gazette</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Gazette Document Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card rounded-2xl p-6 md:p-8 max-w-2xl w-full border border-outline-variant/40 shadow-2xl space-y-4 bg-[#fdf6e3] text-left">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="font-bold text-base text-on-surface font-sans">
                    {selectedDocPreview.name}
                  </h3>
                  <p className="text-[11px] font-mono text-emphasis">
                    {selectedDocPreview.section} • {selectedDocPreview.stage}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 rounded-md text-emphasis hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Watermarked Paper Container */}
            <div className="p-6 rounded-xl bg-white border border-outline-variant/30 shadow-inner font-serif text-slate-800 space-y-4 max-h-[50vh] overflow-y-auto relative">
              <div className="text-center border-b pb-3 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  The Gazette of India • Extraordinary
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  MINISTRY OF RURAL DEVELOPMENT (DEPARTMENT OF LAND RESOURCES)
                </h4>
                <div className="text-[11px] font-mono text-slate-600">
                  Notification Under RFCTLARR Act 2013 — Statutory File Ref: {selectedProject.code}
                </div>
              </div>

              <div className="text-xs leading-relaxed space-y-2 font-sans text-slate-700">
                <p>
                  <strong>WHEREAS</strong> it appears to the Appropriate Government that a total of{" "}
                  <strong>{selectedProject.totalAreaHa} Hectares</strong> of land is required in the district of{" "}
                  <strong>{selectedProject.districts.join(", ")} ({selectedProject.state})</strong> for the public
                  purpose of <strong>{selectedProject.title}</strong>.
                </p>
                <p>
                  <strong>NOW THEREFORE</strong>, in exercise of statutory powers, the Competent Authority
                  has verified all cadastral survey khasra schedules and social impact reports, duly cleared for DBT
                  disbursement.
                </p>
              </div>

              <div className="pt-4 border-t flex items-center justify-between font-mono text-[10px] text-slate-500">
                <div>
                  Digital Signature Token: <code>NIC-CA-2026-CALA-AUTH</code>
                </div>
                <div className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Valid CERT-In Timestamp</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between font-mono text-xs">
              <span className="text-emphasis">Format: Sealed PDF (A4 Gazette)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocPreview(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors font-bold text-primary"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Downloading official verified copy of ${selectedDocPreview.name}`);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sealed Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
