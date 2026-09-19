import React from 'react';
import { MapPin, Layers, Compass, Eye, ShieldCheck, HardDrive } from 'lucide-react';

export const MapPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Offline Geospatial & Tactical Map
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Phase 7 Foundation
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            100% offline vector tiles, coordinate grids, and hazard routing
          </p>
        </div>
      </div>

      {/* Primary Placeholder Map Canvas View */}
      <div className="relative w-full h-[450px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col items-center justify-center text-center p-6 shadow-inner">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(to right, #334155 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Tactical Crosshairs & Compass Decorator */}
        <div className="absolute top-4 left-4 font-mono text-[10px] text-slate-500 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-500" />
          <span>DATUM: WGS84 • GRID: MGRS / MESH-SECTOR</span>
        </div>

        <div className="absolute top-4 right-4 font-mono text-[10px] text-slate-500">
          OFFLINE STORAGE: LOCAL TILE CACHE
        </div>

        <div className="relative z-10 max-w-lg bg-slate-900/90 border border-slate-800 p-8 rounded-lg shadow-2xl backdrop-blur-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mb-4 shadow-sm">
            <MapPin className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 mb-3">
            Offline Map Engine — Coming in Phase 7
          </div>

          <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide font-mono mb-2">
            Zero Cloud Map API Dependency
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            In compliance with SentinelGrid's zero-budget, air-gapped design, this module does not rely on Google Maps Platform, Mapbox, or external cloud tile servers. Phase 7 will integrate client-rendered vector tiles via local MBTiles/PMTiles loaded directly from the Mac M2 filesystem.
          </p>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mb-1">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                Local Tile Store
              </div>
              <div className="text-xs text-slate-300 font-mono">MBTiles / PMTiles</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Connectivity
              </div>
              <div className="text-xs text-slate-300 font-mono">100% Air-Gapped</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 font-mono text-[10px] text-slate-600">
          COORDINATES: UNCONFIGURED (AWAITING LOCAL HARDWARE SENSOR / MAP TILES)
        </div>
      </div>
    </div>
  );
};
