import React from 'react';
import { BarChart3, Radio, Cpu, Truck, SendHorizontal, AlertCircle } from 'lucide-react';

interface MetricItem {
  name: string;
  category: string;
  description: string;
  targetBenchmark: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PLANNED_METRICS: MetricItem[] = [
  {
    name: 'Packet Delivery Ratio',
    category: 'Mesh Telemetry',
    description: 'Proportion of generated LoRa packets successfully received by destination or cluster gateway.',
    targetBenchmark: '> 92% across 3 hops',
    icon: Radio
  },
  {
    name: 'End-to-End Latency',
    category: 'Mesh Telemetry',
    description: 'Time elapsed between initial field report broadcast and operational command reception.',
    targetBenchmark: '< 1,200 ms',
    icon: Radio
  },
  {
    name: 'Hop Count',
    category: 'Mesh Telemetry',
    description: 'Average repeater hops traversed across the local decentralized radio mesh.',
    targetBenchmark: '2.4 average hops',
    icon: Radio
  },
  {
    name: 'AI Triage Accuracy',
    category: 'Triage Engine',
    description: 'Concordance between automated offline triage severity ratings and verified clinical triage levels.',
    targetBenchmark: '> 88% concordance',
    icon: Cpu
  },
  {
    name: 'Severe-Event Recall',
    category: 'Triage Engine',
    description: 'Sensitivity metric ensuring zero false negatives on life-threatening CRITICAL incidents.',
    targetBenchmark: '> 99.5% recall',
    icon: Cpu
  },
  {
    name: 'Resource Matching Accuracy',
    category: 'Resource Logistics',
    description: 'Success rate pairing required extrication and medical capabilities with closest qualified squads.',
    targetBenchmark: '> 94% optimal fit',
    icon: Truck
  },
  {
    name: 'Dispatch Latency',
    category: 'Operations',
    description: 'Interval from incident creation to first unit mobilization acknowledgment.',
    targetBenchmark: '< 45 seconds',
    icon: SendHorizontal
  }
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Operational Research & Performance Metrics
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Phase 10 Foundation
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Empirical evaluation framework for decentralized disaster response systems
          </p>
        </div>
      </div>

      {/* Honest Empty Analytics Notice */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-200 font-mono uppercase">
            Empirical Research Standard — No Synthetic Mock Data
          </div>
          <p>
            In strict compliance with SentinelGrid's Phase 1 foundation principles, zero synthetic numbers or fabricated charts are generated. Real telemetry will populate as field mesh nodes and CAD dispatches log activity in subsequent phases.
          </p>
        </div>
      </div>

      {/* 7 Required Metrics Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANNED_METRICS.map(metric => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.name}
              className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                    {metric.category}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>

                <h3 className="text-sm font-semibold text-slate-200 mb-1">{metric.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {metric.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Current Observation
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    No data available
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">
                    Target Metric
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400/90">
                    {metric.targetBenchmark}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
