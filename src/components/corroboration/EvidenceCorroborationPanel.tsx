import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  MapPin,
  Clock,
  Layers,
  Users,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Scale,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  CorroborationResult,
  EvidenceItem,
  CorroborationVerificationStatus,
  UserRole
} from '../../types';

interface EvidenceCorroborationPanelProps {
  incidentId: string;
  currentUserRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  token?: string;
  onRefreshIncident?: () => void;
}

export const EvidenceCorroborationPanel: React.FC<EvidenceCorroborationPanelProps> = ({
  incidentId,
  currentUserRole,
  currentUserId,
  currentUserName,
  token,
  onRefreshIncident
}) => {
  const [result, setResult] = useState<CorroborationResult | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [showAddEvidenceModal, setShowAddEvidenceModal] = useState<boolean>(false);
  const [showResponderConfirmModal, setShowResponderConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form inputs
  const [evidenceType, setEvidenceType] = useState<string>('SECONDARY_INCIDENT_REPORT');
  const [evidenceContent, setEvidenceContent] = useState<string>('');
  const [evidenceLat, setEvidenceLat] = useState<string>('');
  const [evidenceLon, setEvidenceLon] = useState<string>('');
  const [evidenceCategory, setEvidenceCategory] = useState<string>('');
  const [evidenceSeverity, setEvidenceSeverity] = useState<string>('');
  const [evidenceVictims, setEvidenceVictims] = useState<string>('');

  // Responder confirm inputs
  const [responderNotes, setResponderNotes] = useState<string>('');
  const [responderVictims, setResponderVictims] = useState<string>('');
  const [responderLat, setResponderLat] = useState<string>('');
  const [responderLon, setResponderLon] = useState<string>('');

  const fetchCorroboration = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const storedToken = localStorage.getItem('sentinelgrid_token');
        if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const [resCorrob, resEv] = await Promise.all([
        fetch(`/api/corroboration/${incidentId}`, { headers }),
        fetch(`/api/corroboration/${incidentId}/evidence`, { headers })
      ]);

      if (!resCorrob.ok) {
        const errJson = await resCorrob.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resCorrob.status} loading corroboration`);
      }
      if (!resEv.ok) {
        const errJson = await resEv.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resEv.status} loading evidence`);
      }

      const corrobData = await resCorrob.json();
      const evData = await resEv.json();

      setResult(corrobData);
      setEvidenceItems(evData);
    } catch (err: any) {
      setError(err.message || 'Failed to load corroboration data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchCorroboration();
    }
  }, [incidentId]);

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceContent.trim()) return;

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const storedToken = token || localStorage.getItem('sentinelgrid_token');
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const payload: any = {
        type: evidenceType,
        content: evidenceContent.trim(),
        sourceDescription: currentUserName || 'Field Reporter'
      };

      if (evidenceLat.trim()) payload.latitude = parseFloat(evidenceLat);
      if (evidenceLon.trim()) payload.longitude = parseFloat(evidenceLon);
      if (evidenceCategory.trim()) payload.category = evidenceCategory.trim();
      if (evidenceSeverity.trim()) payload.severity = evidenceSeverity.trim();
      if (evidenceVictims.trim()) payload.victimCount = parseInt(evidenceVictims, 10);

      const res = await fetch(`/api/corroboration/${incidentId}/evidence`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to submit evidence');
      }

      setShowAddEvidenceModal(false);
      setEvidenceContent('');
      setEvidenceLat('');
      setEvidenceLon('');
      setEvidenceCategory('');
      setEvidenceSeverity('');
      setEvidenceVictims('');

      await fetchCorroboration();
      if (onRefreshIncident) onRefreshIncident();
    } catch (err: any) {
      alert(`Error submitting evidence: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResponderConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const storedToken = token || localStorage.getItem('sentinelgrid_token');
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const payload: any = {
        notes: responderNotes.trim() || 'Direct scene verification completed by responder.'
      };

      if (responderVictims.trim()) payload.verifiedVictimCount = parseInt(responderVictims, 10);
      if (responderLat.trim()) payload.latitude = parseFloat(responderLat);
      if (responderLon.trim()) payload.longitude = parseFloat(responderLon);

      const res = await fetch(`/api/corroboration/${incidentId}/respond-confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to confirm scene');
      }

      setShowResponderConfirmModal(false);
      setResponderNotes('');
      setResponderVictims('');
      setResponderLat('');
      setResponderLon('');

      await fetchCorroboration();
      if (onRefreshIncident) onRefreshIncident();
    } catch (err: any) {
      alert(`Error verifying scene: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualVerify = async (targetStatus: CorroborationVerificationStatus) => {
    if (!confirm(`Are you sure you want to manually set incident corroboration status to "${targetStatus}"?`)) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const storedToken = token || localStorage.getItem('sentinelgrid_token');
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

      const res = await fetch(`/api/corroboration/${incidentId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetStatus,
          notes: `Manually mutated by ${currentUserName || 'Commander'} (${currentUserRole})`
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update verification status');
      }

      await fetchCorroboration();
      if (onRefreshIncident) onRefreshIncident();
    } catch (err: any) {
      alert(`Error updating verification: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-slate-300 flex items-center justify-center space-x-3">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
        <span>Evaluating evidence corroboration & source graph...</span>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="bg-slate-900 border border-red-900/50 rounded-lg p-6 text-slate-200">
        <div className="flex items-center space-x-2 text-red-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Corroboration Engine Notice</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">{error || 'No corroboration data available.'}</p>
        <button
          onClick={fetchCorroboration}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition"
        >
          Retry Evaluation
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: CorroborationVerificationStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Official Confirmed</span>;
      case 'RESPONDER_VERIFIED':
        return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Responder Verified</span>;
      case 'CORROBORATED':
        return <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Corroborated</span>;
      case 'AI_TRIAGED':
        return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> AI Triaged</span>;
      case 'REPORTED':
        return <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Reported (Single Source)</span>;
      case 'CONFLICTING':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Conflicting Evidence</span>;
      case 'DISPUTED':
        return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Disputed</span>;
      default:
        return <span className="px-3 py-1 bg-slate-700/50 text-slate-400 border border-slate-600/30 rounded-full text-xs font-bold tracking-wider uppercase">Unverified</span>;
    }
  };

  const isResponderOrAdmin = currentUserRole === 'RESPONDER' || currentUserRole === 'ADMIN' || currentUserRole === 'DISPATCHER';
  const isAdminOrDispatcher = currentUserRole === 'ADMIN' || currentUserRole === 'DISPATCHER';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              EVIDENCE & CORROBORATION ENGINE
            </h2>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
              Phase 9
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Deterministic multi-source evidence fusion, location/temporal corroboration, independence grouping & conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchCorroboration}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
            title="Recalculate Corroboration"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowAddEvidenceModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            Add Evidence
          </button>

          {isResponderOrAdmin && (
            <button
              onClick={() => setShowResponderConfirmModal(true)}
              className="px-3 py-2 bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/60 text-blue-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Responder Scene Verify
            </button>
          )}

          {isAdminOrDispatcher && (
            <button
              onClick={() => handleManualVerify('CONFIRMED')}
              className="px-3 py-2 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 text-emerald-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Confirm Incident
            </button>
          )}
        </div>
      </div>

      {/* Main Score & Verification State Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1">
            Corroboration Score
          </span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-black ${
              result.corroborationScore >= 75 ? 'text-emerald-400' :
              result.corroborationScore >= 50 ? 'text-cyan-400' :
              result.corroborationScore >= 30 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {result.corroborationScore}
            </span>
            <span className="text-slate-500 font-mono text-sm">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                result.corroborationScore >= 75 ? 'bg-emerald-500' :
                result.corroborationScore >= 50 ? 'bg-cyan-500' :
                result.corroborationScore >= 30 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${result.corroborationScore}%` }}
            />
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1">
            Verification Status
          </span>
          <div className="my-1">
            {getStatusBadge(result.verificationStatus)}
          </div>
          <span className="text-[11px] text-slate-400 mt-2">
            Confidence: <strong className="text-white">{result.confidence}</strong>
          </span>
        </div>

        {/* Source Independence Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1">
            Source Independence
          </span>
          <div className="flex items-center gap-2 my-1">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="text-2xl font-bold text-white">
              {result.independentSourceCount}
            </span>
            <span className="text-xs text-slate-400">
              independent group(s)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Total evidence records: {result.totalEvidenceCount}
          </span>
        </div>

        {/* Evidence Strength Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1">
            Evidence Strength
          </span>
          <div className="my-1">
            <span className={`px-2.5 py-1 rounded text-xs font-bold ${
              result.evidenceStrength === 'STRONG' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' :
              result.evidenceStrength === 'MODERATE' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50' :
              result.evidenceStrength === 'WEAK' ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' :
              'bg-red-900/60 text-red-300 border border-red-700/50'
            }`}>
              {result.evidenceStrength} EVIDENCE
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Conflicts: {result.conflicts.length}
          </span>
        </div>
      </div>

      {/* Human Review Gate Warning Banner (If required) */}
      {result.requiresHumanReview && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Human Review Gate Triggered</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
            {result.humanReviewReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Evidence Conflicts List Banner */}
      {result.conflicts && result.conflicts.length > 0 && (
        <div className="bg-red-950/40 border border-red-700/60 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Active Evidence Conflicts ({result.conflicts.length})</span>
          </div>
          <div className="space-y-2 text-xs">
            {result.conflicts.map((conf) => (
              <div key={conf.id} className="bg-slate-950/80 border border-red-900/50 p-2.5 rounded text-slate-200">
                <div className="flex items-center justify-between font-bold text-red-300 mb-1">
                  <span>⚠ {conf.type.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-red-900/60 rounded uppercase">
                    {conf.severity}
                  </span>
                </div>
                <p className="text-slate-300">{conf.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Assessment */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Location Corroboration</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              result.locationAssessment.status === 'LOCATION_CONSISTENT' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
              result.locationAssessment.status === 'LOCATION_PARTIALLY_CONSISTENT' ? 'bg-cyan-950 text-cyan-400 border-cyan-800' :
              result.locationAssessment.status === 'LOCATION_INCONSISTENT' ? 'bg-red-950 text-red-400 border-red-800' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {result.locationAssessment.status}
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-1">{result.locationAssessment.explanation}</p>
          {result.locationAssessment.distanceMeters !== null && (
            <span className="text-[11px] font-mono text-cyan-400">
              Nearest evidence distance: {result.locationAssessment.distanceMeters} meters
            </span>
          )}
        </div>

        {/* Time Assessment */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Temporal Recency & Consistency</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              result.timeAssessment.status === 'TEMPORAL_CONSISTENT' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
              result.timeAssessment.status === 'TEMPORAL_PARTIALLY_CONSISTENT' ? 'bg-cyan-950 text-cyan-400 border-cyan-800' :
              result.timeAssessment.status === 'TEMPORAL_MISMATCH' ? 'bg-red-950 text-red-400 border-red-800' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {result.timeAssessment.status}
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-1">{result.timeAssessment.explanation}</p>
          {result.timeAssessment.timeDeltaMinutes !== null && (
            <span className="text-[11px] font-mono text-cyan-400">
              Max temporal span: {result.timeAssessment.timeDeltaMinutes} minutes
            </span>
          )}
        </div>

        {/* Victim Count Assessment */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Victim Count Separation (Estimated vs Verified)</span>
          </div>
          <p className="text-xs text-slate-300 mb-2">{result.victimCountAssessment.explanation}</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Estimated Consensus</span>
              <span className="text-amber-400 font-bold text-sm">
                {result.victimCountAssessment.estimatedConsensus !== null ? result.victimCountAssessment.estimatedConsensus : 'Unassessed'}
              </span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-sans">Responder Verified</span>
              <span className="text-emerald-400 font-bold text-sm">
                {result.victimCountAssessment.verifiedCount !== null ? result.victimCountAssessment.verifiedCount : 'Unverified on scene'}
              </span>
            </div>
          </div>
        </div>

        {/* Deterministic Score Breakdown */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Deterministic Score Factors</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
            <div>Reliability: <span className="text-white">{result.scoreBreakdown.sourceReliabilityScore}/25</span></div>
            <div>Directness: <span className="text-white">{result.scoreBreakdown.directnessScore}/15</span></div>
            <div>Independence: <span className="text-white">{result.scoreBreakdown.independenceScore}/20</span></div>
            <div>Location: <span className="text-white">{result.scoreBreakdown.locationConsistencyScore}/15</span></div>
            <div>Temporal: <span className="text-white">{result.scoreBreakdown.timeConsistencyScore}/10</span></div>
            <div>Facts: <span className="text-white">{result.scoreBreakdown.factConsistencyScore}/15</span></div>
            <div className="col-span-2 text-red-400 pt-1 border-t border-slate-800">
              Conflict Penalty: -{result.scoreBreakdown.conflictPenalty} pts
            </div>
          </div>
        </div>
      </div>

      {/* Reasoning & Supporting/Limiting Factors */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Evidence Fusion Rationale & Why This Incident Is Corroborated</span>
        </h4>
        <p className="text-xs text-slate-300">{result.reasoningSummary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          {result.supportingFactors.length > 0 && (
            <div>
              <span className="font-semibold text-emerald-400 block mb-1">Supporting Corroboration Factors:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {result.supportingFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {result.limitingFactors.length > 0 && (
            <div>
              <span className="font-semibold text-amber-400 block mb-1">Limiting / Risk Factors:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {result.limitingFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-cyan-400" />
          <span>Evidence Timeline ({evidenceItems.length} Records)</span>
        </h3>

        {evidenceItems.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No evidence items recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {evidenceItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                  item.isDuplicate ? 'bg-slate-950/40 border-slate-800 opacity-60' :
                  item.type === 'RESPONDER_CONFIRMATION' ? 'bg-blue-950/30 border-blue-800/60' :
                  item.type === 'AI_TRIAGE_EVIDENCE' ? 'bg-purple-950/30 border-purple-800/60' :
                  'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{item.type}</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                      {item.independenceGroup}
                    </span>
                    <span className="text-slate-400 text-[11px]">{item.sourceDescription}</span>
                    {item.isDuplicate && (
                      <span className="bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded text-[10px]">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300">{item.content}</p>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                  <div>{new Date(item.timestamp).toLocaleTimeString()}</div>
                  <div className="text-cyan-400">Reliability: {(item.reliability * 100).toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Boundary Disclaimer */}
      <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{result.disclaimer}</span>
      </div>

      {/* Modal: Add Evidence */}
      {showAddEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Submit Incident Evidence
            </h3>

            <form onSubmit={handleAddEvidence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Evidence Type</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                >
                  <option value="SECONDARY_INCIDENT_REPORT">SECONDARY_INCIDENT_REPORT (Witness)</option>
                  <option value="MESH_OBSERVATION">MESH_OBSERVATION (Mesh Packet)</option>
                  <option value="RESPONDER_OBSERVATION">RESPONDER_OBSERVATION (Field Patrol)</option>
                  <option value="RESOURCE_OBSERVATION">RESOURCE_OBSERVATION (Resource Vehicle)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Observation Content</label>
                <textarea
                  value={evidenceContent}
                  onChange={(e) => setEvidenceContent(e.target.value)}
                  placeholder="Describe field observations, smoke plume, victim status, road blockages..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Latitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={evidenceLat}
                    onChange={(e) => setEvidenceLat(e.target.value)}
                    placeholder="28.6139"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Longitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={evidenceLon}
                    onChange={(e) => setEvidenceLon(e.target.value)}
                    placeholder="77.2090"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    value={evidenceCategory}
                    onChange={(e) => setEvidenceCategory(e.target.value)}
                    placeholder="FIRE / FLOOD"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Severity</label>
                  <select
                    value={evidenceSeverity}
                    onChange={(e) => setEvidenceSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  >
                    <option value="">(Default)</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Est. Victims</label>
                  <input
                    type="number"
                    value={evidenceVictims}
                    onChange={(e) => setEvidenceVictims(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEvidenceModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Responder Scene Verify */}
      {showResponderConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-800 rounded-xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Responder Scene Verification
            </h3>

            <form onSubmit={handleResponderConfirm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Responder Field Notes</label>
                <textarea
                  value={responderNotes}
                  onChange={(e) => setResponderNotes(e.target.value)}
                  placeholder="On scene confirmation notes..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Verified Victim Count On Scene</label>
                <input
                  type="number"
                  value={responderVictims}
                  onChange={(e) => setResponderVictims(e.target.value)}
                  placeholder="Exact count verified on scene"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={responderLat}
                    onChange={(e) => setResponderLat(e.target.value)}
                    placeholder="28.6139"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={responderLon}
                    onChange={(e) => setResponderLon(e.target.value)}
                    placeholder="77.2090"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowResponderConfirmModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs transition"
                >
                  {submitting ? 'Verifying...' : 'Verify Scene'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
