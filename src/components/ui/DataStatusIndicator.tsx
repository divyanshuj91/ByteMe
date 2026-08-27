import React from "react";
import { Database, DatabaseZap } from "lucide-react";

export type DataSource = "LIVE_DATABASE" | "DYNAMIC_CACHE" | "CACHED_FALLBACK";

interface DataStatusIndicatorProps {
  source?: DataSource;
  className?: string;
}

export default function DataStatusIndicator({ source, className = "" }: DataStatusIndicatorProps) {
  if (!source) return null;

  const isLive = source === "LIVE_DATABASE";

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shadow-sm transition-all duration-300 ${
        isLive
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-700 border-amber-500/20"
      } ${className}`}
      title={isLive ? "Connected to live backend database" : "Displaying cached or simulated fallback data"}
    >
      {isLive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <DatabaseZap className="w-3 h-3 ml-0.5" />
          <span>Live Data</span>
        </>
      ) : (
        <>
          <Database className="w-3 h-3 opacity-70" />
          <span>Cached / Offline</span>
        </>
      )}
    </div>
  );
}
