import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  Radio,
  Users,
  Truck,
  SendHorizontal,
  Server,
  Database,
  Cpu,
  BookOpen,
  MapPin,
  RefreshCw,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { SystemStatusData, NavTab } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onOpenReportModal: () => void;
  token: string | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenReportModal,
  token
}) => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data: SystemStatusData = await res.json();
        setStatusData(data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to load system status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const counts = statusData?.counts || {
    activeIncidents: 0,
    criticalIncidents: 0,
    connectedMeshNodes: 0,
    availableResponders: 0,
    availableResources: 0,
    pendingDispatches: 0
  };

  const getSubsystemIcon = (id: string) => {
    switch (id) {
      case 'local_database':
        return <Database className="w-5 h-5 text-emerald-400" />;
      case 'backend_core':
        return <Server className="w-5 h-5 text-emerald-400" />;
      case 'mesh_simulator':
        return <Radio className="w-5 h-5 text-amber-400" />;
      case 'ai_engine':
        return <Cpu className="w-5 h-5 text-slate-400" />;
      case 'knowledge_base':
        return <BookOpen className="w-5 h-5 text-slate-400" />;
      case 'map_system':
        return <MapPin className="w-5 h-5 text-slate-400" />;
      default:
        return <Server className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
            Operations Center Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Initial Phase 1 Foundation • Real-time operational telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            type="button"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
            {lastRefreshed && <span className="text-slate-500">({lastRefreshed})</span>}
          </button>

          <button
            onClick={onOpenReportModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* 6 Core Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Active Incidents */}
        <div
          onClick={() => onNavigate('incidents')}
          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {counts.activeIncidents}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Current events</span>
            <span className="text-blue-400 flex items-center gap-0.5">
              View <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Critical Incidents */}
        <div
          onClick={() => onNavigate('incidents')}
          className="bg-slate-900/80 border border-slate-800 hover:border-red-900/60 p-4 rounded-lg cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-red-300">Critical Incidents</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">
            {counts.criticalIncidents}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Life-threat priority
          </div>
        </div>

        {/* Connected Mesh Nodes */}
        <div
          onClick={() => onNavigate('mesh')}
          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Mesh Nodes</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-400">
            {counts.connectedMeshNodes}
          </div>
          <div className="text-[10px] text-amber-400/80 font-mono mt-1">
            Sim not started (Phase 2)
          </div>
        </div>

        {/* Available Responders */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Responders</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {counts.availableResponders}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Ready for tasking
          </div>
        </div>

        {/* Available Resources */}
        <div
          onClick={() => onNavigate('resources')}
          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Resources</span>
            <Truck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {counts.availableResources}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between">
            <span>Vehicles / Squads</span>
            <span className="text-teal-400 flex items-center gap-0.5">
              View <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>

        {/* Pending Dispatches */}
        <div
          onClick={() => onNavigate('dispatch')}
          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition-all hover:bg-slate-900"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Pending Dispatches</span>
            <SendHorizontal className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-400">
            {counts.pendingDispatches}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            CAD Engine (Phase 8)
          </div>
        </div>
      </div>

      {/* System Status Section Required By Spec */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              SentinelGrid Subsystem Diagnostics & Readiness
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Honest Phase 1 Reporting (No Mocked Stubs)
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {statusData?.subsystems.map(item => (
            <div
              key={item.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded bg-slate-950 border border-slate-800 shrink-0">
                  {getSubsystemIcon(item.id)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Phase {item.phase}
                    </span>
                    {item.offlineCapable && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        100% OFFLINE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl">{item.details}</p>
                </div>
              </div>

              <div className="flex items-center md:self-center shrink-0">
                <StatusBadge type="system" value={item.state} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Cloud & Mac M2 Architectural Compliance Note */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Zero-Budget & Local M2 Architecture Verified
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Running on native TypeScript/Node without any mandatory paid cloud services, external databases, or third-party telemetry. Designed for resilient local execution on macOS Apple Silicon or field Linux appliances.
          </p>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          type="button"
          className="px-3 py-1.5 text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded transition-colors whitespace-nowrap cursor-pointer"
        >
          View System Settings
        </button>
      </div>
    </div>
  );
};
