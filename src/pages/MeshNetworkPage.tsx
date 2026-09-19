import React, { useState, useEffect } from 'react';
import {
  Radio,
  WifiOff,
  Signal,
  ArrowRightLeft,
  Layers,
  Cpu,
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';

export const MeshNetworkPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMeshMetrics = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/mesh-metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch mesh metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeshMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Mesh Telemetry & LoRa Gateway
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/80">
              Phase 2 Foundation
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Decentralized ad-hoc packet communication infrastructure (LoRa / Meshtastic)
          </p>
        </div>

        <button
          onClick={fetchMeshMetrics}
          type="button"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Transparent Hardware & Phase Disclosure Notice */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-slate-200 font-mono uppercase">
            Hardware & Simulation Disclosure
          </div>
          <p className="text-slate-400 leading-relaxed">
            No physical LoRa transceiver hardware (e.g. SX1262, Heltec V3, T-Beam) is currently attached. The Phase 2 roadmap introduces an offline peer-to-peer virtual packet router allowing multiple local browser tabs or local network instances to simulate mesh packet relaying with realistic SNR, RSSI, and hop counts.
          </p>
        </div>
      </div>

      {/* 7 Required Mesh Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mesh Status */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Mesh Status</div>
          <div className="text-lg font-bold font-mono text-amber-400 flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>{metrics?.meshStatus || 'Simulation not started'}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Radio State: Idle (Not configured)
          </div>
        </div>

        {/* Number of Nodes */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Number of Nodes</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.numberOfNodes ?? '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Status: Simulation not started
          </div>
        </div>

        {/* Connected Nodes */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Connected Nodes</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.connectedNodes ?? '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Within 1-hop RF range
          </div>
        </div>

        {/* Average Hop Count */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Average Hop Count</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.averageHopCount ?? '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Max TTL configured: 7 hops
          </div>
        </div>

        {/* Packets Received */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Packets Received</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.packetsReceived ?? '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            CRC Verified incoming packets
          </div>
        </div>

        {/* Packets Sent */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Packets Sent</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.packetsSent ?? '0'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Outbound broadcasts
          </div>
        </div>

        {/* Packet Delivery Rate */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-lg sm:col-span-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Packet Delivery Rate</div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {metrics?.packetDeliveryRate ?? '0.0%'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Not configured — Simulation pending Phase 2 initialization
          </div>
        </div>
      </div>

      {/* Empty State / Coming Soon View */}
      <EmptyState
        icon={Radio}
        title="LoRa / Meshtastic Mesh Engine — Coming in Phase 2"
        description="The Phase 2 communication module will enable offline emergency messaging across battery-powered LoRa radios and an interactive in-browser packet router simulation with multi-hop flood routing."
        badge="Phase 2 Foundation Ready"
      />
    </div>
  );
};
