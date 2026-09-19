import React from 'react';
import { SendHorizontal, CheckCircle2, Radio, Navigation, Clock, ShieldCheck } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';

export const DispatchPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Tactical Dispatch & Tasking
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80">
              Phase 8 Foundation
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Unit mobilization orders, responder acknowledgment, and field check-ins
          </p>
        </div>
      </div>

      {/* Architecture overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs uppercase mb-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <span>Mesh Relayed Dispatch</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Broadcast dispatch orders over local LoRa packet channels. Responders receive call details without cellular or internet data coverage.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs uppercase mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic ACK</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Two-way signed acknowledgment packets confirm that the dispatched squad has received and accepted the mission task.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs uppercase mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Status Transition Logs</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Audit-compliant tracking of STANDBY, EN_ROUTE, ON_SCENE, and RESOLVED status milestones recorded to local storage.
          </p>
        </div>
      </div>

      {/* Empty State / Coming Soon */}
      <EmptyState
        icon={SendHorizontal}
        title="Dispatch Engine — Coming in Phase 8"
        description="The tactical dispatch system is scheduled for Phase 8. In Phase 1, incident registration and resource staging provide the core database foundation."
        badge="Phase 8 Foundation Ready"
      />
    </div>
  );
};
