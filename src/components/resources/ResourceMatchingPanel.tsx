import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Truck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Clock,
  Navigation,
  Check,
  XCircle,
  RefreshCw,
  Zap,
  Info,
  Send
} from 'lucide-react';
import {
  Incident,
  IncidentResourceMatchingResult,
  ResourceMatchRecommendation,
  RouteFeasibility
} from '../../types/index.ts';

interface ResourceMatchingPanelProps {
  token: string | null;
  userRole?: string;
  onAllocationChanged?: () => void;
  initialIncidentId?: string;
}

export const ResourceMatchingPanel: React.FC<ResourceMatchingPanelProps> = ({
  token,
  userRole,
  onAllocationChanged,
  initialIncidentId
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId || '');
  const [matchingResult, setMatchingResult] = useState<IncidentResourceMatchingResult | null>(null);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase 6: Dispatch States
  const [dispatchingResourceId, setDispatchingResourceId] = useState<string | null>(null);
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  const canAllocate = ['ADMIN', 'DISPATCHER', 'OPERATOR'].includes(userRole || '');

  // Fetch active incidents
  const fetchIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const res = await fetch('/api/incidents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const activeList = (data.incidents || []).filter(
          (i: Incident) => i.status !== 'RESOLVED'
        );
        setIncidents(activeList);
        if (!selectedIncidentId && activeList.length > 0) {
          setSelectedIncidentId(activeList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load incidents for resource matching', err);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  // Fetch matches when selectedIncidentId changes
  const fetchMatches = async (incId: string) => {
    if (!incId) {
      setMatchingResult(null);
      return;
    }
    setIsLoadingMatches(true);
    setError(null);
    try {
      const res = await fetch(`/api/resources/match/${incId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate resource matches');
      }
      setMatchingResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate resource matches');
      setMatchingResult(null);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [token]);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchMatches(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const handleDispatch = async (resourceId: string) => {
    if (!selectedIncidentId) return;
    setActionLoadingId(resourceId);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          incidentId: selectedIncidentId,
          resourceId,
          dispatchNotes: dispatchNotes.trim() || undefined,
          priority: 'HIGH' // Default priority
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch resource');
      }

      setSuccessMessage(`Tactical dispatch order created successfully! Resource ${data.dispatch.resourceId} status: PENDING.`);
      setDispatchingResourceId(null);
      setDispatchNotes('');
      fetchMatches(selectedIncidentId);
      if (onAllocationChanged) onAllocationChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch resource');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAllocate = async (resourceId: string) => {
    if (!selectedIncidentId) return;
    setActionLoadingId(resourceId);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/resources/${resourceId}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ incidentId: selectedIncidentId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to allocate resource');
      }

      setSuccessMessage(data.message || 'Resource allocated successfully');
      fetchMatches(selectedIncidentId);
      if (onAllocationChanged) onAllocationChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to allocate resource');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRelease = async (resourceId: string) => {
    setActionLoadingId(resourceId);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/resources/${resourceId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to release resource');
      }

      setSuccessMessage(data.message || 'Resource released successfully');
      fetchMatches(selectedIncidentId);
      if (onAllocationChanged) onAllocationChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to release resource');
    } finally {
      setActionLoadingId(null);
    }
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const renderFeasibilityBadge = (feasibility: RouteFeasibility) => {
    switch (feasibility) {
      case 'REACHABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            REACHABLE
          </span>
        );
      case 'REACHABLE_WITH_HAZARD_WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            HAZARD WARNING ON ROUTE
          </span>
        );
      case 'NO_SAFE_ROUTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-950/80 text-red-300 border border-red-800">
            <XCircle className="w-3 h-3 text-red-400" />
            NO SAFE ROUTE
          </span>
        );
      case 'OUTSIDE_OFFLINE_MAP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-orange-950/80 text-orange-300 border border-orange-800">
            <Navigation className="w-3 h-3 text-orange-400" />
            OUTSIDE OFFLINE MAP
          </span>
        );
      case 'LOCATION_UNAVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <MapPin className="w-3 h-3 text-slate-400" />
            LOCATION UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Incident Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                Resource Matching & Allocation Engine (Phase 5)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic multi-factor matching linking incident capability requirements with offline route feasibility and unit status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchIncidents();
                if (selectedIncidentId) fetchMatches(selectedIncidentId);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalculate Matches
            </button>
          </div>
        </div>

        {/* Incident Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Select Target Incident for Resource Matching *
            </label>
            <select
              value={selectedIncidentId}
              onChange={e => setSelectedIncidentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 focus:outline-hidden focus:border-emerald-500 font-mono"
            >
              <option value="">-- Select Active Incident --</option>
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>
                  [{inc.incidentNumber}] {inc.title} ({inc.severity} — Priority Score: {inc.priorityScore})
                </option>
              ))}
            </select>
          </div>

          {selectedIncident && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 uppercase">Required Caps:</span>
                <span className="font-semibold text-emerald-400">
                  {matchingResult?.requiredCapabilities?.join(', ') || 'Evaluating...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 uppercase">Triage Category:</span>
                <span className="text-slate-200">
                  {matchingResult?.extractedRequirements?.category || 'General Emergency'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-400 uppercase">GIS Location:</span>
                <span className={selectedIncident.location?.latitude != null ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedIncident.location?.latitude != null
                    ? `${selectedIncident.location.latitude.toFixed(4)}, ${selectedIncident.location.longitude?.toFixed(4)}`
                    : 'Location Coordinates Missing'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-lg text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Matching Results List */}
      {isLoadingMatches ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-lg text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400 uppercase">
            Evaluating capability compatibility & offline GIS route feasibility...
          </p>
        </div>
      ) : matchingResult ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Evaluated Candidate Resources ({matchingResult.matches.length})
            </h4>
            <span className="text-xs font-mono text-slate-500">
              Evaluated at {new Date(matchingResult.evaluatedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-3">
            {matchingResult.matches.map((match: ResourceMatchRecommendation, index: number) => {
              const isAllocatedToThis = match.currentIncidentId === matchingResult.incidentId;
              const isAvailable = match.status === 'AVAILABLE';

              return (
                <div
                  key={match.resourceId}
                  className={`bg-slate-900 border rounded-lg p-5 transition-all ${
                    match.recommendedMatch
                      ? 'border-emerald-500/80 shadow-lg shadow-emerald-950/20 bg-slate-900/90'
                      : isAllocatedToThis
                      ? 'border-blue-500/80 bg-blue-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700">
                          {match.resourceCode}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">
                          {match.name}
                        </h4>

                        {match.recommendedMatch && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            RECOMMENDED MATCH
                          </span>
                        )}

                        {isAllocatedToThis && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/50">
                            ALLOCATED TO THIS INCIDENT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400">
                        <span className="font-mono text-slate-300">{match.type}</span>
                        <span>•</span>
                        <span>Staging: {match.location || 'Unspecified'}</span>
                        {match.capacity && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">Cap: {match.capacity}</span>
                          </>
                        )}
                      </div>

                      {/* Capabilities pills */}
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <span className="text-2xs font-mono uppercase text-slate-500">Capabilities:</span>
                        {match.capabilities.map(cap => (
                          <span
                            key={cap}
                            className={`px-2 py-0.5 text-2xs font-mono rounded ${
                              matchingResult.requiredCapabilities.includes(cap)
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Score pill & Route status */}
                    <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xs font-mono text-slate-400 uppercase">Match Score</div>
                          <div
                            className={`text-lg font-mono font-bold ${
                              match.matchScore >= 80
                                ? 'text-emerald-400'
                                : match.matchScore >= 50
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {match.matchScore}%
                          </div>
                        </div>

                        {renderFeasibilityBadge(match.routeFeasibility)}
                      </div>

                      {/* Route Details */}
                      {match.routeInfo && (
                        <div className="text-2xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-2">
                          <Navigation className="w-3 h-3 text-emerald-400" />
                          <span>{match.routeInfo.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reasons & Warnings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-2xs font-mono uppercase text-slate-400 block mb-1">
                        Matching Strengths:
                      </span>
                      {match.reasons.map((reason, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-1.5 text-emerald-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      {match.warnings.length > 0 && (
                        <>
                          <span className="text-2xs font-mono uppercase text-amber-400 block mb-1">
                            Operational Constraints / Warnings:
                          </span>
                          {match.warnings.map((warn, wIdx) => (
                            <div key={wIdx} className="flex items-start gap-1.5 text-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{warn}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Dispatch Notes Form */}
                  {dispatchingResourceId === match.resourceId && (
                    <div className="mt-4 p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 uppercase mb-1">
                          Operational Dispatch Notes (Optional, max 500 chars)
                        </label>
                        <textarea
                          value={dispatchNotes}
                          onChange={e => setDispatchNotes(e.target.value.slice(0, 500))}
                          placeholder="Provide tactical instructions, offline routing, hazard cautions..."
                          rows={2}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 font-sans"
                        />
                        <div className="text-right text-[10px] font-mono text-slate-500 mt-1">
                          {dispatchNotes.length}/500
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchingResourceId(null);
                            setDispatchNotes('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-mono uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDispatch(match.resourceId)}
                          disabled={actionLoadingId === match.resourceId}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{actionLoadingId === match.resourceId ? 'Mobilizing...' : 'Confirm Dispatch'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800">
                    <span className="text-2xs font-mono text-slate-500 uppercase">
                      Decision Support — Human Operator Confirmation Required
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isAllocatedToThis ? (
                        <button
                          onClick={() => handleRelease(match.resourceId)}
                          disabled={actionLoadingId === match.resourceId || !canAllocate}
                          className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoadingId === match.resourceId ? 'Releasing...' : 'Release Resource'}
                        </button>
                      ) : isAvailable ? (
                        dispatchingResourceId !== match.resourceId ? (
                          <>
                            <button
                              onClick={() => handleAllocate(match.resourceId)}
                              disabled={actionLoadingId === match.resourceId || !canAllocate}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {actionLoadingId === match.resourceId ? 'Allocating...' : 'Allocate Only'}
                            </button>
                            <button
                              onClick={() => {
                                setDispatchingResourceId(match.resourceId);
                                setDispatchNotes('');
                              }}
                              disabled={actionLoadingId === match.resourceId || !canAllocate}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Dispatch Unit</span>
                            </button>
                          </>
                        ) : null
                      ) : (
                        <button
                          disabled
                          className="px-3.5 py-1.5 bg-slate-800 text-slate-500 border border-slate-700 rounded text-xs font-semibold uppercase tracking-wider cursor-not-allowed opacity-60"
                        >
                          Resource {match.status}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-lg text-center text-slate-400 text-xs font-mono">
          Select an active incident above to view capability matching and offline route recommendations.
        </div>
      )}
    </div>
  );
};
