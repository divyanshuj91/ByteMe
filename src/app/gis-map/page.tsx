"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { MOCK_PARCELS } from "@/lib/data/cadastral-parcels";
import { CadastralParcel } from "@/types";
import { getStoredParcels, saveStoredParcels } from "@/lib/storage";
import {
  Layers,
  Search,
  MapPin,
  ShieldAlert,
  CheckCircle,
  Eye,
  Ruler,
  FileCheck2,
  TreeDeciduous,
  Home,
  X,
  ExternalLink,
  UploadCloud,
  Download,
  FileJson,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const DynamicCadastralMap = dynamic(
  () => import("@/components/gis/CadastralMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] flex items-center justify-center font-mono text-xs text-primary bg-surface-container-low/40">
        Loading High-Precision Spatial Cadastral Engine...
      </div>
    ),
  }
);

// Sample Corridor Presets
const CORRIDOR_PRESETS: Record<string, CadastralParcel[]> = {
  "DAUSA_PKG1": MOCK_PARCELS,
  "VARANASI_PKG2": [
    {
      id: "var-101",
      khasraNo: "Plot 101/A",
      village: "Chandauli North Sector",
      tehsil: "Mughalsarai",
      district: "Chandauli",
      state: "Uttar Pradesh",
      areaHa: 3.1,
      landUse: "AGRICULTURAL",
      soilClassification: "IRRIGATED",
      ownerName: "Sudhir Kumar Tripathi",
      aadhaarLinked: true,
      panNo: "TRIPK1102A",
      circleRatePerHa: 2800000,
      saleDeedAvgRatePerHa: 3200000,
      surveyStatus: "VERIFIED",
      structuresCount: 1,
      treesCount: 20,
      coordinates: [
        [25.272, 83.111],
        [25.278, 83.115],
        [25.276, 83.123],
        [25.270, 83.119],
        [25.272, 83.111],
      ],
      center: [25.274, 83.117],
      acquisitionStage: "SECTION_19_DECLARATION",
      compensationStatus: "AWARD_PUBLISHED",
      awardedAmountLakhs: 88.4,
    },
    {
      id: "var-102",
      khasraNo: "Plot 102/B",
      village: "Chandauli North Sector",
      tehsil: "Mughalsarai",
      district: "Chandauli",
      state: "Uttar Pradesh",
      areaHa: 2.8,
      landUse: "COMMERCIAL",
      soilClassification: "UNIRRIGATED",
      ownerName: "Ganga Infrastructure Ltd",
      aadhaarLinked: true,
      panNo: "GINFR8912P",
      circleRatePerHa: 4500000,
      saleDeedAvgRatePerHa: 5200000,
      surveyStatus: "DISPUTED",
      disputeNotes: "Section 64 litigation hold: Ownership objection before High Court.",
      structuresCount: 2,
      treesCount: 0,
      coordinates: [
        [25.278, 83.115],
        [25.284, 83.119],
        [25.282, 83.127],
        [25.276, 83.123],
        [25.278, 83.115],
      ],
      center: [25.280, 83.121],
      acquisitionStage: "SECTION_19_DECLARATION",
      compensationStatus: "ESCROW_LITIGATION",
      awardedAmountLakhs: 145.6,
    },
  ],
};

export default function GisMapPage() {
  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState("DAUSA_PKG1");
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeLayers, setActiveLayers] = useState({
    rowBuffer: true,
    cadastralBoundaries: true,
    disputedZones: true,
    forestZones: false,
  });

  // Initialize from live API or storage
  useEffect(() => {
    async function loadDynamicParcels() {
      try {
        const res = await fetch("/api/parcels");
        if (res.ok) {
          const result = await res.json();
          if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
            setParcels(result.data);
            setSelectedParcel(result.data[0] || null);
            return;
          }
        }
      } catch (err) {
        console.warn("Live GIS parcels fetch fallback:", err);
      }
      const stored = getStoredParcels();
      setParcels(stored);
      setSelectedParcel(stored[0] || null);
    }
    loadDynamicParcels();
  }, []);

  const handleCorridorChange = (corridorKey: string) => {
    setSelectedCorridor(corridorKey);
    const newParcels = CORRIDOR_PRESETS[corridorKey] || MOCK_PARCELS;
    setParcels(newParcels);
    setSelectedParcel(newParcels[0] || null);
    saveStoredParcels(newParcels);
    setImportNotification(`Loaded alignment: ${corridorKey.replace("_", " ")} (${newParcels.length} parcels)`);
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Live GeoJSON File Upload Ingestion Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        
        let newParcels: CadastralParcel[] = [];

        if (json.type === "FeatureCollection" && Array.isArray(json.features)) {
          newParcels = json.features.map((feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates?.[0] || [
              [26.892 + idx * 0.005, 76.331 + idx * 0.005],
              [26.897 + idx * 0.005, 76.335 + idx * 0.005],
              [26.895 + idx * 0.005, 76.342 + idx * 0.005],
              [26.892 + idx * 0.005, 76.331 + idx * 0.005],
            ];
            
            // Format to Leaflet [lat, lng]
            const formattedCoords: [number, number][] = coords.map((c: any) => 
              Array.isArray(c) && c.length >= 2 ? [c[1], c[0]] : [26.89, 76.33]
            );

            return {
              id: props.id || `imported-${Date.now()}-${idx}`,
              khasraNo: props.khasraNo || props.khasra_no || `Plot ${100 + idx}`,
              village: props.village || "Uploaded Revenue Ward",
              tehsil: props.tehsil || "Central Tehsil",
              district: props.district || "Project District",
              state: props.state || "State Jurisdiction",
              areaHa: Number(props.areaHa || props.area_ha || (2.5 + idx * 0.5)),
              landUse: props.landUse || "AGRICULTURAL",
              soilClassification: props.soilClassification || "IRRIGATED",
              ownerName: props.ownerName || props.owner_name || `Landowner ${idx + 1}`,
              aadhaarLinked: props.aadhaarLinked ?? true,
              panNo: props.panNo || "XXXXX0000X",
              circleRatePerHa: Number(props.circleRatePerHa || 2500000),
              saleDeedAvgRatePerHa: Number(props.saleDeedAvgRatePerHa || 2800000),
              surveyStatus: props.surveyStatus || (idx === 1 ? "DISPUTED" : "VERIFIED"),
              disputeNotes: props.disputeNotes,
              structuresCount: Number(props.structuresCount || 1),
              treesCount: Number(props.treesCount || 10),
              coordinates: formattedCoords,
              center: formattedCoords[0] || [26.89, 76.33],
              acquisitionStage: "SECTION_19_DECLARATION",
              compensationStatus: idx === 1 ? "ESCROW_LITIGATION" : "AWARD_PUBLISHED",
              awardedAmountLakhs: Number(props.awardedAmountLakhs || 65.0),
            };
          });
        } else if (Array.isArray(json)) {
          newParcels = json;
        }

        if (newParcels.length > 0) {
          setParcels(newParcels);
          setSelectedParcel(newParcels[0]);
          saveStoredParcels(newParcels);
          setImportNotification(`Successfully ingested ${newParcels.length} cadastral parcels from ${file.name}!`);
        } else {
          setImportNotification("No valid GeoJSON polygon features found in file.");
        }
      } catch (err) {
        setImportNotification("Error parsing GeoJSON file. Please check syntax.");
      }
      setTimeout(() => setImportNotification(null), 5000);
    };
    reader.readAsText(file);
  };

  // Export DILRMP OGC GeoJSON Package
  const handleExportDILRMP = () => {
    const featureCollection = {
      type: "FeatureCollection",
      crs: {
        type: "name",
        properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
      },
      metadata: {
        standard: "Digital India Land Records Modernization Programme (DILRMP)",
        act: "RFCTLARR Act 2013",
        generatedAt: new Date().toISOString(),
        totalParcels: parcels.length,
        totalAreaHa: parcels.reduce((acc, p) => acc + p.areaHa, 0),
      },
      features: parcels.map((p) => ({
        type: "Feature",
        properties: {
          id: p.id,
          khasraNo: p.khasraNo,
          village: p.village,
          tehsil: p.tehsil,
          district: p.district,
          state: p.state,
          areaHa: p.areaHa,
          ownerName: p.ownerName,
          aadhaarLinked: p.aadhaarLinked,
          circleRatePerHa: p.circleRatePerHa,
          saleDeedAvgRatePerHa: p.saleDeedAvgRatePerHa,
          surveyStatus: p.surveyStatus,
          disputeNotes: p.disputeNotes,
          awardedAmountLakhs: p.awardedAmountLakhs,
        },
        geometry: {
          type: "Polygon",
          coordinates: [p.coordinates.map((c) => [c[1], c[0]])], // [lng, lat]
        },
      })),
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DILRMP_Cadastral_Export_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredParcels = parcels.filter(
    (p) =>
      p.khasraNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        <Sidebar />

        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          {/* Top GIS Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase bg-surface-container-high px-2 py-0.5 rounded text-secondary border border-outline-variant/30">
                  Spatial Cadastral Core
                </span>
                <span className="text-xs font-mono text-success-green flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
                  DILRMP Federated Sync: Online
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-on-surface font-sans">
                Interactive Cadastral GIS & RoW Corridor
              </h1>
            </div>

            {/* Actions: Corridor Selector + File Import + DILRMP Export */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Corridor Preset Dropdown */}
              <select
                value={selectedCorridor}
                onChange={(e) => handleCorridorChange(e.target.value)}
                className="solarized-input px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-primary"
              >
                <option value="DAUSA_PKG1">Delhi-Mumbai Exp (Dausa)</option>
                <option value="VARANASI_PKG2">Varanasi-Kolkata (Chandauli)</option>
              </select>

              {/* GeoJSON File Ingestion Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.geojson"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-surface-container-high hover:bg-surface-container text-on-surface text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-outline-variant/40 flex items-center gap-1.5 shadow-sm transition-all"
                title="Upload custom GeoJSON dataset"
              >
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                <span>Import GeoJSON</span>
              </button>

              {/* DILRMP Export Button */}
              <button
                onClick={handleExportDILRMP}
                className="bg-primary hover:bg-primary/90 text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                title="Export standard DILRMP OGC Schema GeoJSON for State Bhulekh servers"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export DILRMP</span>
              </button>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-emphasis absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Khasra / Owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="solarized-input pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono w-48"
                />
              </div>
            </div>
          </div>

          {/* Import Notification Banner */}
          {importNotification && (
            <div className="mb-3 p-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>{importNotification}</span>
            </div>
          )}

          {/* GIS Map & Inspector Container */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[550px]">
            {/* GIS Map Canvas View */}
            <div className="lg:col-span-8 glass-card rounded-2xl p-4 border border-outline-variant/40 relative flex flex-col overflow-hidden min-h-[520px]">
              {/* Map Floating Layer Controls */}
              <div className="absolute top-6 left-6 z-20 glass-card p-3 rounded-xl border border-outline-variant/50 text-xs font-mono space-y-2 shadow-lg max-w-xs backdrop-blur-md">
                <div className="flex items-center gap-2 font-bold text-primary pb-1 border-b border-outline-variant/30">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Cadastral Spatial Layers</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={activeLayers.cadastralBoundaries}
                    onChange={(e) =>
                      setActiveLayers({
                        ...activeLayers,
                        cadastralBoundaries: e.target.checked,
                      })
                    }
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Revenue Boundaries (Khasras)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={activeLayers.rowBuffer}
                    onChange={(e) =>
                      setActiveLayers({
                        ...activeLayers,
                        rowBuffer: e.target.checked,
                      })
                    }
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>60m RoW Corridor Buffer (NHAI)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={activeLayers.disputedZones}
                    onChange={(e) =>
                      setActiveLayers({
                        ...activeLayers,
                        disputedZones: e.target.checked,
                      })
                    }
                    className="rounded text-danger focus:ring-danger"
                  />
                  <span>Disputed Khasras (Sec 64 Hold)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={activeLayers.forestZones}
                    onChange={(e) =>
                      setActiveLayers({
                        ...activeLayers,
                        forestZones: e.target.checked,
                      })
                    }
                    className="rounded text-success-green focus:ring-success-green"
                  />
                  <span>Forest Zones (Sec 10 Exemption)</span>
                </label>
              </div>

              {/* Live Spatial HUD Metric Bar */}
              <div className="absolute top-6 right-6 z-20 glass-card px-3 py-2 rounded-xl border border-outline-variant/50 text-[11px] font-mono shadow-lg flex items-center gap-3 backdrop-blur-md hidden sm:flex">
                <div>
                  <span className="text-emphasis">Parcels: </span>
                  <span className="font-bold text-primary">{filteredParcels.length}</span>
                </div>
                <span>•</span>
                <div>
                  <span className="text-emphasis">RoW Extent: </span>
                  <span className="font-bold text-secondary">
                    {filteredParcels.reduce((acc, p) => acc + p.areaHa, 0).toFixed(1)} Ha
                  </span>
                </div>
                <span>•</span>
                <div>
                  <span className="text-emphasis">Disputed: </span>
                  <span className="font-bold text-danger">
                    {filteredParcels.filter((p) => p.surveyStatus === "DISPUTED").length}
                  </span>
                </div>
              </div>

              {/* Dynamic Leaflet Cadastral Map */}
              <div className="flex-1 w-full h-full min-h-[480px] rounded-xl overflow-hidden relative border border-outline-variant/30">
                <DynamicCadastralMap
                  parcels={filteredParcels}
                  selectedParcel={selectedParcel}
                  onSelectParcel={(p) => setSelectedParcel(p)}
                  activeLayers={activeLayers}
                />
              </div>
            </div>

            {/* Cadastral Parcel Inspector Drawer */}
            <div className="lg:col-span-4 glass-card rounded-2xl p-5 border border-outline-variant/40 flex flex-col justify-between overflow-y-auto">
              {selectedParcel ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                    <div>
                      <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                        Khasra Dossier
                      </span>
                      <h3 className="text-xl font-bold text-on-surface font-mono mt-1">
                        {selectedParcel.khasraNo}
                      </h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        selectedParcel.surveyStatus === "VERIFIED"
                          ? "bg-success-green/15 text-success-green"
                          : "bg-danger/15 text-danger"
                      }`}
                    >
                      {selectedParcel.surveyStatus}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Revenue Village:</span>
                      <span className="font-semibold text-on-surface">{selectedParcel.village}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Land Owner:</span>
                      <span className="font-semibold text-primary">{selectedParcel.ownerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Aadhaar Linked:</span>
                      <span className={selectedParcel.aadhaarLinked ? "text-success-green font-bold" : "text-danger font-bold"}>
                        {selectedParcel.aadhaarLinked ? "Yes (e-KYC Verified)" : "Pending Verification"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Area Extent:</span>
                      <span className="font-bold text-on-surface">{selectedParcel.areaHa} Hectares</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Circle Rate:</span>
                      <span className="font-semibold text-on-surface">₹{(selectedParcel.circleRatePerHa / 100000).toFixed(1)} Lakh / Ha</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Land Use & Soil:</span>
                      <span className="font-semibold text-on-surface">{selectedParcel.landUse} ({selectedParcel.soilClassification})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Structures / Trees:</span>
                      <span className="font-semibold text-on-surface">{selectedParcel.structuresCount} Struct / {selectedParcel.treesCount} Trees</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-outline-variant/15">
                      <span className="text-emphasis">Award Amount:</span>
                      <span className="font-bold text-primary">₹{selectedParcel.awardedAmountLakhs} Lakhs</span>
                    </div>
                  </div>

                  {selectedParcel.disputeNotes && (
                    <div className="p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[11px] font-mono">
                      <p className="font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Litigation Flag:</span>
                      </p>
                      <p className="mt-1">{selectedParcel.disputeNotes}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <a
                      href={`/compensation?khasra=${encodeURIComponent(selectedParcel.khasraNo)}`}
                      className="w-full bg-primary hover:bg-primary/90 text-white text-xs font-mono uppercase tracking-wider py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <span>Load In Compensation Engine</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs font-mono text-emphasis">
                  Click on any cadastral parcel polygon to inspect ownership and survey records.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
