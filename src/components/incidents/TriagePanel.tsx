import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Shield,
  History,
  FileText,
  HelpCircle,
  Hash,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Incident, AIIncidentTriageRecord } from '../../types/index.ts';

interface TriagePanelProps {
  incident: Incident;
  token: string | null;
  canRunTriage: boolean;
  onTriageCompleted?: (record: AIIncidentTriageRecord) => void;
}

export const TriagePanel: React.FC<TriagePanelProps> = ({
  incident,
  token,
  canRunTriage,
  onTriageCompleted
}) => {
  const [latestTriage, setLatestTriage] = useState<AIIncidentTriageRecord | null>(null);
  const [history, setHistory] = useState<AIIncidentTriageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTriageData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [triageRes, historyRes] = await Promise.all([
        fetch(`/api/incidents/${incident.id}/triage`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`/api/incidents/${incident.id}/triage/history`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (triageRes.ok) {
        const data = await triageRes.json();
        setLatestTriage(data.triage);
      }
      if (historyRes.ok) {
        const histData = await historyRes.json();
        setHistory(histData.history || []);
      }
    } catch (err: any) {
      console.error('Failed to load triage data', err);
      setError('Unable to load AI triage records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTriageData();
  }, [incident.id, token]);

  const handleRunTriage = async () => {
    if (!canRunTriage || isExecuting) return;
    try {
      setIsExecuting(true);
      setError(null);
      const res = await fetch(`/api/incidents/${incident.id}/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setLatestTriage(data.triage);
        fetchTriageData();
        if (onTriageCompleted) {
          onTriageCompleted(data.triage);
        }
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to complete AI triage.');
      }
    } catch (err: any) {
      console.error('Failed to run AI triage', err);
      setError(err.message || 'Network error during AI triage execution.');
    } finally {
      setIsExecuting(false);
    }
  };

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity) {
      case 'P1':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'P2':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'P3':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'P4':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-600/50';
    }
  };

  const getUrgencyBadgeClass = (urgency?: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'bg-red-950 text-red-300 border-red-800';
      case 'URGENT':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'SOON':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'ROUTINE':
        return 'bg-slate-900 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4 font-sans text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded text-emerald-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-100 tracking-wide uppercase">
                AI-Assisted Triage
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                Offline Heuristic 1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Structured operational intelligence • Non-medical advisory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-[11px] font-mono transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History ({history.length})</span>
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {canRunTriage && (
            <button
              type="button"
              onClick={handleRunTriage}
              disabled={isExecuting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                latestTriage
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
              <span>{isExecuting ? 'Evaluating...' : latestTriage ? 'Re-run Triage' : 'Run AI Triage'}</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !latestTriage && (
        <div className="py-6 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Checking triage repository...</span>
        </div>
      )}

      {!isLoading && !latestTriage && (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-lg p-5 text-center space-y-2">
          <Brain className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="font-semibold text-slate-300">No AI Triage Executed Yet</div>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Extract operational intelligence, estimated victim counts, hazards, and priority indicators deterministically using the local offline heuristic engine.
          </p>
          {canRunTriage && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunTriage}
                disabled={isExecuting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Execute Local Triage</span>
              </button>
            </div>
          )}
        </div>
      )}

      {latestTriage && (
        <div className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Severity Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded p-2.5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Triage Severity
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${getSeverityBadgeClass(latestTriage.severity)}`}>
                  {latestTriage.severity}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getUrgencyBadgeClass(latestTriage.urgency)}`}>
                  {latestTriage.urgency}
                </span>
              </div>
            </div>

            {/* Category Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded p-2.5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Category
              </span>
              <div className="font-mono font-semibold text-slate-200 text-xs truncate">
                {latestTriage.category}
              </div>
            </div>

            {/* Victim Counts Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded p-2.5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Victim Count
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-200 font-mono">
                  Est: <strong className="text-amber-300">{latestTriage.estimatedVictimCount ?? 'None detected'}</strong>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Ver: {latestTriage.verifiedVictimCount ?? 'Not verified'}
                </span>
              </div>
            </div>

            {/* Confidence & Review Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded p-2.5 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                AI Confidence
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  {Math.round(latestTriage.confidence * 100)}%
                </span>
                {latestTriage.requiresHumanReview ? (
                  <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[9px] font-mono uppercase">
                    Review Req.
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[9px] font-mono uppercase">
                    Passed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Indicator Lists */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Hazards Detected */}
            <div className="bg-slate-900/50 border border-slate-800 rounded p-3 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Detected Hazards ({latestTriage.hazards.length})</span>
              </span>
              {latestTriage.hazards.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">No specific hazards tagged</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {latestTriage.hazards.map(h => (
                    <span
                      key={h}
                      className="px-2 py-0.5 bg-red-950/40 border border-red-800/60 rounded text-red-300 font-mono text-[10px]"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Symptoms or Conditions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded p-3 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span>Operational Conditions ({latestTriage.symptomsOrConditions.length})</span>
              </span>
              {latestTriage.symptomsOrConditions.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">No specific symptoms detected</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {latestTriage.symptomsOrConditions.map(s => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-blue-950/40 border border-blue-800/60 rounded text-blue-300 font-mono text-[10px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Location Clues */}
            <div className="bg-slate-900/50 border border-slate-800 rounded p-3 space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>Location Clues ({latestTriage.locationClues.length})</span>
              </span>
              {latestTriage.locationClues.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">No text location clues identified</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {latestTriage.locationClues.map((c, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-slate-300 font-mono text-[10px]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reasoning Explanation Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono font-semibold text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WHY THIS TRIAGE?</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              {latestTriage.reasoningSummary}
            </p>
          </div>

          {/* Provenance & Audit Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span>Provider: <strong className="text-slate-400">{latestTriage.provider} v{latestTriage.providerVersion}</strong></span>
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span title={`SHA-256: ${latestTriage.sourceTextHash}`}>
                  Hash: {latestTriage.sourceTextHash.substring(0, 10)}...
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Triaged: {new Date(latestTriage.createdAt).toLocaleTimeString()} ({new Date(latestTriage.createdAt).toLocaleDateString()})</span>
            </div>
          </div>

          {/* Advisory Notice */}
          <div className="p-2 bg-slate-900/30 border border-slate-800/60 rounded text-[10px] text-slate-400 font-mono">
            <strong>NOTICE:</strong> SentinelGrid AI is an advisory operational triage assistant. It extracts indicators from incident reports and does NOT perform autonomous medical diagnosis or prescribe clinical care.
          </div>
        </div>
      )}

      {/* Triage History Drawer/Section */}
      {showHistory && history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historical Triage Runs ({history.length})</span>
            </span>
            <span className="text-[10px] text-slate-500">Newest first</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {history.map((rec, idx) => (
              <div
                key={rec.id}
                className={`p-2.5 rounded border text-xs font-mono space-y-1 ${
                  idx === 0
                    ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Run #{history.length - idx}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] border ${getSeverityBadgeClass(rec.severity)}`}>
                      {rec.severity}
                    </span>
                    <span className="text-slate-300 text-[11px]">{rec.category}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(rec.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {rec.reasoningSummary}
                </div>
                <div className="text-[9px] text-slate-500 flex items-center gap-3">
                  <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                  <span>Est. Victims: {rec.estimatedVictimCount ?? 'None'}</span>
                  <span>Review: {rec.requiresHumanReview ? 'REQUIRED' : 'NO'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
