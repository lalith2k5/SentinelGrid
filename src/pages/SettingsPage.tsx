import React, { useState, useEffect } from 'react';
import {
  Settings,
  User as UserIcon,
  Shield,
  HardDrive,
  Cpu,
  Radio,
  CheckCircle2,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Failed to load settings status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
            System Settings & Node Diagnostics
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Local instance configuration, operator profile, and air-gapped guarantees
          </p>
        </div>

        <button
          onClick={fetchStatus}
          type="button"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Prominent Visible System Mode Indicator Required by Spec */}
      <div className="p-5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-900/60 border border-emerald-700/80 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
              Operating Mode
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 tracking-wide">
              OFFLINE-FIRST
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Zero Cloud Dependency Enforced
          </span>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Operator Profile
            </h2>
          </div>
          {user && <StatusBadge type="role" value={user.role} />}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Operator Name</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.name || 'Local Administrator'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Email / Identifier</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.email || 'operator@sentinelgrid.local'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Badge / Callsign</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.badgeNumber || 'SG-FIELD-01'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Assigned Department</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.department || 'Incident Management Command'}
            </div>
          </div>
        </div>
      </div>

      {/* Local Database & Persistence Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
            Local Database Engine & Offline Storage
          </h2>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Engine Type</div>
              <div className="text-xs text-emerald-400 font-mono font-semibold mt-0.5">
                Local File Atomic JSON
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Zero cloud database required</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">File Location</div>
              <div className="text-xs text-slate-300 font-mono truncate mt-0.5" title="./data/sentinelgrid.json">
                ./data/sentinelgrid.json
              </div>
              <div className="text-[10px] text-slate-500 mt-1">On-disk durable storage</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Total Entities Logged</div>
              <div className="text-xs text-slate-300 font-mono font-semibold mt-0.5">
                {(dbStatus?.counts?.activeIncidents ?? 0) + (dbStatus?.counts?.availableResources ?? 0)} records
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Incidents & staged assets</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center gap-2 text-slate-400 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              The database schema provides extensible structural models for User, Incident, IncidentLocation, Resource, Responder, Message, MeshNode, KnowledgeDocument, and AuditLog.
            </span>
          </div>
        </div>
      </div>

      {/* AI Provider Architecture & Mac M2 Zero-Budget Commitment */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
            AI Provider Abstraction Layer
          </h2>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-400">
          <p className="leading-relaxed">
            SentinelGrid implements the <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">AIProvider</code> interface abstraction. In Phase 3, you can switch between a cloud model or a 100% free local model (via Ollama or llama.cpp directly on Apple Silicon Mac M2) without changing application business logic.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-xs font-mono font-semibold text-slate-200">LocalModelProvider</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Local Ollama / Apple Silicon M2 • Zero API costs • 100% offline
              </div>
              <div className="mt-2 text-[10px] font-mono text-amber-400">Status: Ready for Phase 3</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-xs font-mono font-semibold text-slate-200">GeminiProvider</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Optional cloud fallback when high-bandwidth internet connectivity is available
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-500">Status: Optional / Non-blocking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Information */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-slate-200 font-bold">SentinelGrid Phase 1 Foundation</span> • Built with React 19, TypeScript, Vite & Express
        </div>
        <div className="text-slate-500">
          Mac M2 / Linux Standalone Ready
        </div>
      </div>
    </div>
  );
};
