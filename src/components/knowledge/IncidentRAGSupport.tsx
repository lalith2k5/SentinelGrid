import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Info,
  Clock,
  Layers,
  AlertOctagon,
  FileCheck,
  Building2,
  Compass
} from 'lucide-react';
import {
  Incident,
  AIIncidentTriageRecord,
  RAGQueryResult,
  RetrievedEvidenceItem,
  KnowledgeDocument
} from '../../types/index.ts';

interface IncidentRAGSupportProps {
  incident: Incident;
  latestTriage?: AIIncidentTriageRecord | null;
  token?: string | null;
  onSelectDocument?: (docId: string) => void;
}

export const IncidentRAGSupport: React.FC<IncidentRAGSupportProps> = ({
  incident,
  latestTriage,
  token,
  onSelectDocument
}) => {
  const [ragResult, setRagResult] = useState<RAGQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<RetrievedEvidenceItem | null>(null);
  const [selectedFullDoc, setSelectedFullDoc] = useState<KnowledgeDocument | null>(null);
  const [isViewingFullDoc, setIsViewingFullDoc] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    checklist: boolean;
    safety: boolean;
    contraindications: boolean;
    sources: boolean;
    diagnostics: boolean;
  }>({
    checklist: true,
    safety: true,
    contraindications: true,
    sources: true,
    diagnostics: false
  });

  const fetchRAGGuidance = async (overrideQuery?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const payload = {
        incidentId: incident.id,
        incidentNumber: incident.incidentNumber,
        query: overrideQuery !== undefined ? overrideQuery : (customQuery || `${incident.title}. ${incident.description}`),
        category: latestTriage?.category || (incident as any).category || undefined,
        hazards: latestTriage?.hazards || (incident as any).hazards || [],
        symptomsOrConditions: latestTriage?.symptomsOrConditions || [],
        severity: latestTriage?.severity || incident.severity,
        locationAddress: incident.location?.address
      };

      const res = await fetch('/api/knowledge/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to retrieve decision support guidance');
      }

      const data = await res.json();
      setRagResult(data);
    } catch (err: any) {
      console.error('RAG query error:', err);
      setError(err.message || 'Error communicating with local knowledge base');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch RAG evidence when incident or triage is present
    fetchRAGGuidance();
  }, [incident.id, latestTriage?.id]);

  const handleOpenFullDocument = async (docId: string) => {
    if (onSelectDocument) {
      onSelectDocument(docId);
      return;
    }
    try {
      setIsViewingFullDoc(true);
      const res = await fetch(`/api/knowledge/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFullDoc(data.document);
        setShowDocModal(true);
      }
    } catch (e) {
      console.error('Failed to load document detail', e);
    } finally {
      setIsViewingFullDoc(false);
    }
  };

  const getConfidenceBadge = (confidence: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'MEDIUM':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'LOW':
        return 'bg-red-950/80 text-red-300 border-red-700/60';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4 font-sans text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-950/80 border border-blue-700/60 rounded text-blue-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-100 tracking-wide uppercase">
                Emergency Protocol Decision Support
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                Offline Local RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Deterministic protocol retrieval • Verifiable source citations • Human-in-the-loop review
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchRAGGuidance()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-mono text-[11px] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
          <span>{isLoading ? 'Querying...' : 'Refresh Evidence'}</span>
        </button>
      </div>

      {/* Interactive Search Bar for targeted protocol search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchRAGGuidance();
            }}
            placeholder="Search specific emergency protocols, symptoms, chemical tags, or procedures..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => fetchRAGGuidance()}
          disabled={isLoading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
        >
          Query
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !ragResult && (
        <div className="py-6 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
          <span>Scanning offline knowledge corpus...</span>
        </div>
      )}

      {ragResult && (
        <div className="space-y-3.5">
          {/* Status & Review Gate Banner */}
          {ragResult.status === 'INSUFFICIENT_LOCAL_EVIDENCE' ? (
            <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>INSUFFICIENT_LOCAL_EVIDENCE</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                No matching field manuals or protocols in the local offline corpus achieved the confidence threshold (20%).
                Commander / Dispatcher must size up the scene manually or consult certified medical/HazMat specialists.
              </p>
            </div>
          ) : ragResult.hasConflicts ? (
            <div className="p-3 bg-red-950/50 border border-red-700 rounded-lg space-y-1.5">
              <div className="flex items-center gap-2 text-red-200 font-mono font-bold text-xs uppercase">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                <span>CONFLICTING PROCEDURAL GUIDANCE DETECTED</span>
              </div>
              <p className="text-red-300 text-[11px] leading-relaxed">
                {ragResult.conflictingDetails?.description || 'Contradictory actions identified across retrieved documents.'}
              </p>
              <div className="text-[10px] font-mono text-red-400">
                Conflicting: {ragResult.conflictingDetails?.conflictingDocuments.join(' vs ')}
              </div>
            </div>
          ) : null}

          {/* Human Review Gate Notice */}
          {ragResult.requiresHumanReview && (
            <div className="p-2.5 bg-slate-900 border border-amber-800/60 rounded flex items-start gap-2 text-amber-300 font-mono text-[11px]">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold uppercase tracking-wider block">Mandatory Human Review Required</span>
                <ul className="list-disc list-inside text-[10px] text-slate-300 space-y-0.5 font-sans">
                  {ragResult.humanReviewReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Evidence Summary & Confidence Badges */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Retrieval Confidence:
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${getConfidenceBadge(ragResult.retrievalConfidence)}`}>
                  {ragResult.retrievalConfidence} ({ragResult.diagnostics.topScore}/100)
                </span>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span>Corpus: <strong className="text-slate-200">v{ragResult.corpusVersion}</strong></span>
                <span>Matches: <strong className="text-slate-200">{ragResult.retrievedDocuments.length}</strong></span>
                <span>Latency: <strong className="text-slate-200">{ragResult.diagnostics.executionTimeMs}ms</strong></span>
              </div>
            </div>

            <p className="text-slate-200 text-xs leading-relaxed font-sans">
              {ragResult.evidenceSummary}
            </p>
          </div>

          {/* Action Steps Checklist */}
          {ragResult.actionChecklist.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSections(s => ({ ...s, checklist: !s.checklist }))}
                className="w-full px-3 py-2 bg-slate-900/90 flex items-center justify-between text-slate-200 font-mono text-xs font-semibold cursor-pointer border-b border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  <span>ACTION PROTOCOL CHECKLIST ({ragResult.actionChecklist.length} Steps)</span>
                </div>
                {expandedSections.checklist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {expandedSections.checklist && (
                <div className="p-3 space-y-2">
                  {ragResult.actionChecklist.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-sans">
                      <div className="w-4 h-4 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Safety Warnings & Contraindications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Safety Warnings */}
            {ragResult.safetyWarnings.length > 0 && (
              <div className="bg-slate-900/60 border border-amber-900/40 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-amber-950/40 border-b border-amber-900/40 flex items-center gap-2 text-amber-300 font-mono text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>SCENE SAFETY PRECAUTIONS</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {ragResult.safetyWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-amber-200 font-sans">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contraindications (What NOT to do) */}
            {ragResult.contraindications.length > 0 && (
              <div className="bg-slate-900/60 border border-red-900/40 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-red-950/40 border-b border-red-900/40 flex items-center gap-2 text-red-300 font-mono text-xs font-semibold">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                  <span>CONTRAINDICATIONS (PROHIBITED ACTIONS)</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {ragResult.contraindications.map((contra, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-red-200 font-sans">
                      <span className="text-red-500 font-bold">✕</span>
                      <span>{contra}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Missing Context Warnings */}
          {ragResult.missingContextWarnings.length > 0 && (
            <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded flex items-start gap-2 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-mono font-semibold text-slate-300">Contextual Notes:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                  {ragResult.missingContextWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Retrieved Evidence Documents (Auditable Citations) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSections(s => ({ ...s, sources: !s.sources }))}
              className="w-full px-3 py-2 bg-slate-900/90 flex items-center justify-between text-slate-200 font-mono text-xs font-semibold cursor-pointer border-b border-slate-800"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>RETRIEVED PROTOCOL CITATIONS ({ragResult.retrievedDocuments.length})</span>
              </div>
              {expandedSections.sources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandedSections.sources && (
              <div className="p-3 space-y-2.5">
                {ragResult.retrievedDocuments.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200 text-xs">
                          {doc.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          v{doc.version}
                        </span>
                        {doc.isOutdated && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                            Review Due (&gt;365d)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          Score: {doc.relevanceScore}/100
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenFullDocument(doc.documentId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 rounded text-[10px] font-mono transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Full Text</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 italic font-sans">
                      "{doc.relevantSnippet}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        <span>Source: <strong>{doc.sourceOrganization || doc.source}</strong></span>
                        <span>•</span>
                        <span>Provenance: <strong>{doc.provenanceType}</strong></span>
                      </div>
                      <div className="text-slate-400">
                        {doc.matchReasons.join(' | ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legal / Operational Medical Disclaimer */}
          <div className="p-2.5 bg-slate-900/30 border border-slate-800/80 rounded text-[10px] text-slate-400 font-mono leading-relaxed">
            <strong>OFFLINE DECISION SUPPORT DISCLAIMER:</strong> {ragResult.medicalDisclaimer}
          </div>
        </div>
      )}

      {/* Modal for viewing full knowledge document */}
      {showDocModal && selectedFullDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden font-sans text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-100 text-sm">{selectedFullDoc.title}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                    v{selectedFullDoc.version}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                    {selectedFullDoc.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Source: {selectedFullDoc.sourceOrganization || selectedFullDoc.source} • Reviewed: {selectedFullDoc.lastReviewed || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-slate-200">
              {/* Summary */}
              <div className="bg-slate-900/80 border border-slate-800 rounded p-3">
                <span className="font-mono font-semibold text-slate-400 text-[10px] uppercase block mb-1">Executive Summary</span>
                <p className="text-xs leading-relaxed">{selectedFullDoc.summary}</p>
              </div>

              {/* Action Steps */}
              {selectedFullDoc.actionSteps && selectedFullDoc.actionSteps.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-mono font-semibold text-emerald-400 text-[11px] uppercase block flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>Operational Action Steps</span>
                  </span>
                  <div className="space-y-1 bg-slate-900/40 p-2.5 rounded border border-slate-800">
                    {selectedFullDoc.actionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="font-mono font-bold text-emerald-400">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Precautions & Contraindications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedFullDoc.safetyPrecautions && selectedFullDoc.safetyPrecautions.length > 0 && (
                  <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded space-y-1">
                    <span className="font-mono font-bold text-amber-300 text-[10px] uppercase block">Safety Precautions</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90">
                      {selectedFullDoc.safetyPrecautions.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedFullDoc.contraindications && selectedFullDoc.contraindications.length > 0 && (
                  <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded space-y-1">
                    <span className="font-mono font-bold text-red-300 text-[10px] uppercase block">Contraindications</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-red-200/90">
                      {selectedFullDoc.contraindications.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Markdown / Plaintext Full Document Content */}
              <div className="space-y-1.5">
                <span className="font-mono font-semibold text-slate-400 text-[10px] uppercase block">Complete Manual Content</span>
                <pre className="bg-slate-900/90 border border-slate-800 rounded p-3 text-[11px] font-mono whitespace-pre-wrap leading-relaxed text-slate-300 overflow-x-auto">
                  {selectedFullDoc.content}
                </pre>
              </div>

              {/* Version History */}
              {selectedFullDoc.versionHistory && selectedFullDoc.versionHistory.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="font-mono font-semibold text-slate-400 text-[10px] uppercase block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Version History</span>
                  </span>
                  <div className="space-y-1 font-mono text-[10px] text-slate-400">
                    {selectedFullDoc.versionHistory.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-1 bg-slate-900 rounded">
                        <span>v{v.version} — {v.changeLog}</span>
                        <span className="text-slate-500">{new Date(v.modifiedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Doc ID: {selectedFullDoc.id}</span>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
