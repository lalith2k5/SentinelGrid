import React from 'react';
import { BookOpen, Search, Filter, FileText, CheckCircle2, HardDrive } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState.tsx';

export const KnowledgeBasePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Emergency Knowledge & RAG Library
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Future Roadmap
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Offline triage manuals, HazMat protocols, and incident management standards
          </p>
        </div>
      </div>

      {/* RAG Specification & Metadata Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Index State</div>
          <div className="text-lg font-bold font-mono text-slate-200">Pending Indexing</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Vector DB: Future Phase</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Registered Documents</div>
          <div className="text-2xl font-bold font-mono text-slate-200">0</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Local markdown/PDF store</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Standard Categories</div>
          <div className="text-sm font-semibold text-slate-300 mt-1">
            First Aid • HazMat • Triage
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">FEMA & ICS compatible</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg">
          <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">Inference Engine</div>
          <div className="text-sm font-semibold text-slate-300 mt-1">Local Ollama / CPU</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Zero cloud embedding fees</div>
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            disabled
            placeholder="Search emergency manual corpus (Future Phase)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-400 placeholder-slate-600 cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            disabled
            className="bg-slate-950 border border-slate-800 text-slate-500 text-xs rounded px-2.5 py-2 cursor-not-allowed"
          >
            <option>Category: All</option>
            <option>FIRST_AID</option>
            <option>TRIAGE_PROTOCOLS</option>
            <option>HAZMAT</option>
            <option>SHELTER_SPECS</option>
            <option>COMMUNICATION_CODES</option>
          </select>
        </div>
      </div>

      {/* Empty State Showing Required Schema Fields */}
      <EmptyState
        icon={BookOpen}
        title="Local Emergency Knowledge / RAG System — Future Phase"
        description="The knowledge base will store emergency field manuals, triage protocols, hazardous chemical mitigation steps, and search indexes locally on disk for retrieval without internet access."
        badge="Planned Future Phase"
      />
    </div>
  );
};
