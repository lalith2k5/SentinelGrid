import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Send,
  CheckCircle2,
  Radio,
  Navigation,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  MapPin,
  User,
  FileText,
  X,
  ChevronRight,
  AlertCircle,
  Play,
  Check,
  RotateCcw,
  Activity
} from 'lucide-react';
import { Dispatch, DispatchStatus, Resource, Incident } from '../types/index.ts';

export const DispatchPage: React.FC = () => {
  const { user, token } = useAuth();

  // Mode Selection for testing/simulating different roles in the UI
  const [activeRoleMode, setActiveRoleMode] = useState<'DISPATCHER' | 'RESPONDER'>(
    user?.role === 'RESPONDER' ? 'RESPONDER' : 'DISPATCHER'
  );

  // Core Data State
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Interactive Form States
  const [declineReason, setDeclineReason] = useState<string>('');
  const [declineError, setDeclineError] = useState<string | null>(null);
  const [isDeclining, setIsDeclining] = useState<boolean>(false);

  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);

  // Reassignment States
  const [showReassignDialog, setShowReassignDialog] = useState<boolean>(false);
  const [reassignResourceId, setReassignResourceId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Field Report States (for ON_SCENE -> COMPLETED)
  const [verifiedVictims, setVerifiedVictims] = useState<number>(0);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  // Simulation State: which resource is the current Responder device representing
  const [simulatedResourceId, setSimulatedResourceId] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDispatcherMode = activeRoleMode === 'DISPATCHER';

  // Fetch all dispatches, resources, and incidents
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [dispRes, resRes, incRes] = await Promise.all([
        fetch('/api/dispatches', { headers }),
        fetch('/api/resources', { headers }),
        fetch('/api/incidents', { headers })
      ]);

      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDispatches(dispData.dispatches || []);
        if (dispData.dispatches?.length > 0 && !selectedDispatchId) {
          setSelectedDispatchId(dispData.dispatches[0].dispatchId);
        }
      }

      if (resRes.ok) {
        const resData = await resRes.json();
        const allResources = resData.resources || [];
        setResources(allResources);
        // Default simulated resource ID if not set
        if (allResources.length > 0 && !simulatedResourceId) {
          setSimulatedResourceId(allResources[0].id);
        }
      }

      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents || []);
      }
    } catch (err) {
      console.error('Failed to fetch dispatch system data', err);
      showNotification('error', 'Network error: Unable to load dispatch telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Status transitions
  const handleStatusUpdate = async (dispatchId: string, status: DispatchStatus, payload: any = {}) => {
    try {
      const res = await fetch(`/api/dispatches/${dispatchId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, ...payload })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update dispatch status');
      }

      showNotification('success', `Status successfully updated to ${status}`);
      await fetchAllData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Failed to update status');
    }
  };

  // Reassignment trigger
  const handleTriggerReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError(null);

    if (!selectedDispatchId) return;
    if (!reassignResourceId) {
      setReassignError('You must select a new alternative resource.');
      return;
    }
    if (reassignReason.trim().length < 4) {
      setReassignError('Reassignment justification must be at least 4 characters.');
      return;
    }

    setIsReassigning(true);
    try {
      const res = await fetch(`/api/dispatches/${selectedDispatchId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newResourceId: reassignResourceId,
          reason: reassignReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reassign resource');
      }

      showNotification('success', 'Tactical Reassignment Successful: previous unit stood down, new unit mobilized.');
      setShowReassignDialog(false);
      setReassignReason('');
      setReassignResourceId('');
      await fetchAllData();
    } catch (err: any) {
      setReassignError(err.message || 'Failed to complete reassignment');
    } finally {
      setIsReassigning(false);
    }
  };

  // Cancel Dispatch
  const handleTriggerCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);

    if (!selectedDispatchId) return;
    if (cancelReason.trim().length < 4) {
      setCancelError('Cancellation reason must be at least 4 characters.');
      return;
    }

    setIsCancelling(true);
    try {
      await handleStatusUpdate(selectedDispatchId, 'CANCELLED', { reason: cancelReason.trim() });
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel dispatch');
    } finally {
      setIsCancelling(false);
    }
  };

  // Decline Dispatch
  const handleTriggerDecline = async (dispatchId: string) => {
    setDeclineError(null);
    if (declineReason.trim().length < 4) {
      setDeclineError('Decline explanation must be at least 4 characters.');
      return;
    }

    setIsDeclining(true);
    try {
      await handleStatusUpdate(dispatchId, 'DECLINED', { reason: declineReason.trim() });
      setDeclineReason('');
    } catch (err: any) {
      setDeclineError(err.message || 'Decline failed');
    } finally {
      setIsDeclining(false);
    }
  };

  // Complete Dispatch (ON_SCENE -> COMPLETED)
  const handleCompleteDispatch = async (dispatchId: string) => {
    setIsCompleting(true);
    try {
      await handleStatusUpdate(dispatchId, 'COMPLETED', {
        verifiedVictimCount: verifiedVictims >= 0 ? verifiedVictims : undefined,
        notes: fieldNotes.trim() || undefined
      });
      setVerifiedVictims(0);
      setFieldNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  // Find specific resource or incident details
  const getResource = (id: string) => resources.find(r => r.id === id);
  const getIncident = (id: string) => incidents.find(i => i.id === id);

  // Filtering dispatches
  const filteredDispatches = dispatches.filter(disp => {
    const resourceObj = getResource(disp.resourceId);
    const incidentObj = getIncident(disp.incidentId);
    
    // Search filter
    const matchesSearch = 
      disp.incidentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resourceObj?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resourceObj?.resourceCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (incidentObj?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'ALL' || disp.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Selected dispatch object
  const selectedDispatch = dispatches.find(d => d.dispatchId === selectedDispatchId);
  const selectedResource = selectedDispatch ? getResource(selectedDispatch.resourceId) : null;
  const selectedIncident = selectedDispatch ? getIncident(selectedDispatch.incidentId) : null;

  // Responder view: list dispatches for currently selected simulated resource
  const responderActiveDispatch = dispatches.find(
    d => d.resourceId === simulatedResourceId && !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(d.status)
  );

  const getStatusBadgeColor = (status: DispatchStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/80';
      case 'DISPATCHED':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/80';
      case 'ACKNOWLEDGED':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/80';
      case 'EN_ROUTE':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80';
      case 'ARRIVED':
        return 'bg-teal-950/60 text-teal-300 border-teal-800/80';
      case 'ON_SCENE':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'COMPLETED':
        return 'bg-slate-900 text-slate-400 border-slate-700';
      case 'DECLINED':
        return 'bg-red-950/60 text-red-300 border-red-800/80';
      case 'CANCELLED':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // State machine sequence index for rendering
  const statesOrder: DispatchStatus[] = [
    'PENDING',
    'DISPATCHED',
    'ACKNOWLEDGED',
    'EN_ROUTE',
    'ARRIVED',
    'ON_SCENE',
    'COMPLETED'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Tactical Dispatch & Responder Workflow
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
              Phase 6 Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Unit mobilization, real-time responder terminal simulations, and route auditing
          </p>
        </div>

        {/* Role toggle button to easily simulate Dispatcher vs Responder */}
        <div className="flex items-center bg-slate-900/80 border border-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveRoleMode('DISPATCHER')}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
              isDispatcherMode
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dispatcher Board
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleMode('RESPONDER')}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
              !isDispatcherMode
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Responder Terminal
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 border rounded-lg text-xs font-mono flex items-center gap-3 shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <AlertCircle className={`w-5 h-5 shrink-0 ${notification.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Primary Panels */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/40 border border-slate-800 rounded-lg">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400 uppercase">Synchronizing local mesh dispatch repository...</p>
        </div>
      ) : isDispatcherMode ? (
        /* DISPATCHER BOARD VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SIDEBAR: Active Dispatches List */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[700px]">
            {/* Search & Filter Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search dispatch, squad..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-850 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-2 py-1 font-mono focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="DISPATCHED">Dispatched</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="EN_ROUTE">En Route</option>
                  <option value="ARRIVED">Arrived</option>
                  <option value="ON_SCENE">On Scene</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DECLINED">Declined</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
              {filteredDispatches.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  No dispatches match the active search filters.
                </div>
              ) : (
                filteredDispatches.map(disp => {
                  const resourceObj = getResource(disp.resourceId);
                  const incidentObj = getIncident(disp.incidentId);
                  const isSelected = disp.dispatchId === selectedDispatchId;

                  return (
                    <button
                      key={disp.dispatchId}
                      onClick={() => setSelectedDispatchId(disp.dispatchId)}
                      className={`w-full text-left p-4 hover:bg-slate-850/60 transition-colors flex flex-col gap-1.5 cursor-pointer ${
                        isSelected ? 'bg-slate-800/70 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono font-bold text-slate-200 text-xs">
                          {disp.incidentNumber}
                        </span>
                        <span className={`px-2 py-0.2 rounded font-mono text-[9px] border uppercase ${getStatusBadgeColor(disp.status)}`}>
                          {disp.status}
                        </span>
                      </div>
                      
                      <div className="text-slate-100 font-semibold text-xs truncate w-full">
                        {incidentObj?.title || 'Unknown Incident'}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 w-full">
                        <span>Squad: {resourceObj?.resourceCode || 'N/A'}</span>
                        <span>{new Date(disp.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Sync trigger button */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
              <button
                onClick={fetchAllData}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded font-mono text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Board</span>
              </button>
            </div>
          </div>

          {/* RIGHT PANELS: Dispatch Details & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDispatch && selectedIncident ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
                
                {/* Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700">
                        DISPATCH ORDER
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        ID: {selectedDispatch.dispatchId.substring(0, 8)}...
                      </span>
                    </div>
                    <h3 className="text-md font-bold text-slate-100 uppercase tracking-wide">
                      {selectedIncident.incidentNumber}: {selectedIncident.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded font-mono font-bold text-xs border uppercase ${getStatusBadgeColor(selectedDispatch.status)}`}>
                      {selectedDispatch.status}
                    </span>
                  </div>
                </div>

                {/* State Machine Step Progress Timeline */}
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-4 tracking-wider flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Resource State Progression Lifecycle</span>
                  </span>
                  
                  <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
                    {/* Horizontal connecting line in desktop, hidden in mobile */}
                    <div className="hidden md:block absolute left-2 right-2 top-3 h-0.5 bg-slate-800 -z-1" />

                    {statesOrder.map((st, sIdx) => {
                      const isActive = selectedDispatch.status === st;
                      const hasPassed = statesOrder.indexOf(selectedDispatch.status) >= sIdx;
                      const isCancelledState = selectedDispatch.status === 'CANCELLED' || selectedDispatch.status === 'DECLINED';

                      return (
                        <div key={st} className="flex md:flex-col items-center gap-3 md:gap-1.5 z-10 w-full md:w-auto">
                          <div
                            className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-emerald-600 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-900/30'
                                : hasPassed && !isCancelledState
                                ? 'bg-slate-800 border-emerald-600 text-emerald-400'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            {hasPassed && !isActive && !isCancelledState ? <Check className="w-3.5 h-3.5" /> : sIdx + 1}
                          </div>
                          
                          <div className="text-left md:text-center space-y-0.5">
                            <span
                              className={`block text-[10px] font-mono font-semibold transition-colors ${
                                isActive ? 'text-emerald-400 font-bold' : hasPassed && !isCancelledState ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {st}
                            </span>
                            
                            {/* Short timestamps under step */}
                            {st === 'PENDING' && selectedDispatch.createdAt && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.createdAt).toLocaleTimeString()}
                              </span>
                            )}
                            {st === 'ACKNOWLEDGED' && selectedDispatch.acknowledgementTimestamp && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.acknowledgementTimestamp).toLocaleTimeString()}
                              </span>
                            )}
                            {st === 'EN_ROUTE' && selectedDispatch.enRouteTimestamp && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.enRouteTimestamp).toLocaleTimeString()}
                              </span>
                            )}
                            {st === 'ARRIVED' && selectedDispatch.arrivedTimestamp && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.arrivedTimestamp).toLocaleTimeString()}
                              </span>
                            )}
                            {st === 'ON_SCENE' && selectedDispatch.onSceneTimestamp && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.onSceneTimestamp).toLocaleTimeString()}
                              </span>
                            )}
                            {st === 'COMPLETED' && selectedDispatch.completedTimestamp && (
                              <span className="block text-[8px] font-mono text-slate-500 md:mx-auto">
                                {new Date(selectedDispatch.completedTimestamp).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cancelled/Declined overlay badge in timeline */}
                  {(selectedDispatch.status === 'CANCELLED' || selectedDispatch.status === 'DECLINED') && (
                    <div className="mt-4 p-3 bg-red-950/40 border border-red-800 rounded flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div className="text-xs font-mono">
                        <span className="font-bold text-red-300 uppercase block">
                          Dispatch Process Aborted ({selectedDispatch.status})
                        </span>
                        <p className="text-red-200/80 mt-0.5">
                          Reason: {selectedDispatch.status === 'CANCELLED' 
                            ? selectedDispatch.cancellationReason 
                            : selectedDispatch.declineReason || 'Operator/Responder terminated mobilization.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dispatch briefing parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assigned Unit Details */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded p-4 space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      ASSIGNED FIELD FORCE
                    </span>
                    {selectedResource ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-200">
                          {selectedResource.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                          <div>Code: <strong className="text-slate-300">{selectedResource.resourceCode}</strong></div>
                          <div>Type: <strong className="text-slate-300">{selectedResource.type}</strong></div>
                          <div>Staging Location: <strong className="text-slate-300">{selectedResource.location || 'Local Grid'}</strong></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No resource assigned details found.</div>
                    )}
                  </div>

                  {/* Incident briefing parameters */}
                  <div className="bg-slate-950/40 border border-slate-800 rounded p-4 space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      TACTICAL INCIDENT LOG
                    </span>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {selectedIncident.title}
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                        {selectedIncident.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route Information telemetry */}
                {selectedDispatch.routeInfo && (
                  <div className="bg-slate-950/50 border border-slate-800 rounded p-4 space-y-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                      <span>OFFLINE LOCAL GIS ROUTE AUDIT</span>
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                      <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">Est. Distance</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {(selectedDispatch.routeInfo.distanceMeters / 1000).toFixed(2)} km
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">Est. Duration</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {Math.round(selectedDispatch.routeInfo.travelTimeSeconds / 60)} mins
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">Avoided Hazards</div>
                        <div className="font-bold text-emerald-400 mt-0.5">
                          {selectedDispatch.routeInfo.avoidedHazards ?? 0} active
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">Blocked Roads</div>
                        <div className="font-bold text-emerald-400 mt-0.5">
                          {selectedDispatch.routeInfo.blockedEdgesAvoided ?? 0} bypassed
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-850 rounded text-[11px] text-slate-300 font-mono">
                      <strong>Audit summary:</strong> {selectedDispatch.routeInfo.explanation}
                    </div>
                  </div>
                )}

                {/* Dispatcher action controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  {/* Reassign Button */}
                  <div>
                    {!['COMPLETED', 'CANCELLED', 'DECLINED'].includes(selectedDispatch.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setReassignResourceId('');
                          setReassignReason('');
                          setReassignError(null);
                          setShowReassignDialog(true);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono rounded text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                      >
                        Reassign Unit
                      </button>
                    )}
                  </div>

                  {/* Manual advances or Cancellation buttons */}
                  <div className="flex items-center gap-2">
                    {!['COMPLETED', 'CANCELLED', 'DECLINED'].includes(selectedDispatch.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelReason('');
                          setCancelError(null);
                          setShowCancelDialog(true);
                        }}
                        className="px-4 py-2 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 font-mono rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Cancel Dispatch
                      </button>
                    )}

                    {selectedDispatch.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(selectedDispatch.dispatchId, 'DISPATCHED')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer"
                      >
                        Mobilize Unit
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispatch Reassignment History logs if present */}
                {selectedDispatch.reassignmentHistory && selectedDispatch.reassignmentHistory.length > 0 && (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-4 space-y-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      DISPATCH REASSIGNMENT HISTORY ({selectedDispatch.reassignmentHistory.length})
                    </span>
                    <div className="space-y-2.5">
                      {selectedDispatch.reassignmentHistory.map((hist, hIdx) => {
                        const prevRes = getResource(hist.previousResourceId);
                        const newRes = getResource(hist.newResourceId);

                        return (
                          <div key={hIdx} className="text-xs font-mono border-b border-slate-850 pb-2 last:border-b-0 last:pb-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-emerald-400 font-bold">REASSIGNMENT ACTION</span>
                              <span className="text-slate-500 text-[10px]">{new Date(hist.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-300">
                              Unit swap: <strong className="text-slate-200">{prevRes?.resourceCode || 'Prev Unit'}</strong> stood down ➔ <strong className="text-slate-200">{newRes?.resourceCode || 'New Unit'}</strong> activated.
                            </p>
                            <p className="text-slate-400 text-[11px] italic">
                              Reason: "{hist.reason}"
                            </p>
                            <p className="text-slate-500 text-[10px]">
                              Authorized By: {hist.actorName} (Badge: {hist.actorId.substring(0, 8)})
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-lg text-center text-slate-400 font-mono text-xs">
                Select an active dispatch order in the left sidebar to audit telemetry, routes, and history logs.
              </div>
            )}
          </div>

          {/* REASSIGNMENT MODAL DIALOG */}
          {showReassignDialog && selectedDispatch && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-sm font-bold font-mono text-slate-100 uppercase">
                    Swapping Resource Assignments
                  </h4>
                  <button onClick={() => setShowReassignDialog(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleTriggerReassign} className="space-y-4">
                  {reassignError && (
                    <div className="p-2.5 bg-red-950/50 border border-red-800 text-red-200 text-xs font-mono rounded">
                      {reassignError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                      Choose Alternative Feasible Unit *
                    </label>
                    <select
                      value={reassignResourceId}
                      onChange={e => setReassignResourceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                    >
                      <option value="">-- Choose Available Alternative --</option>
                      {resources
                        .filter(r => r.status === 'AVAILABLE' && r.id !== selectedDispatch.resourceId)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.resourceCode}] {r.name} ({r.type} — Staging: {r.location})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                      Reason for Swap justification *
                    </label>
                    <textarea
                      value={reassignReason}
                      onChange={e => setReassignReason(e.target.value)}
                      rows={3}
                      placeholder="e.g. Assigned ambulance became incapacitated due to a blocked road. Swapping to available medic squad."
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                    />
                    <span className="text-[10px] font-mono text-slate-500">Min 4 characters</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReassignDialog(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isReassigning}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono uppercase font-bold cursor-pointer"
                    >
                      {isReassigning ? 'Reassigning...' : 'Confirm Swap'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CANCELLATION MODAL DIALOG */}
          {showCancelDialog && selectedDispatch && (
            <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-sm font-bold font-mono text-slate-100 uppercase">
                    Cancel Mobilization Orders
                  </h4>
                  <button onClick={() => setShowCancelDialog(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleTriggerCancel} className="space-y-4">
                  {cancelError && (
                    <div className="p-2.5 bg-red-950/50 border border-red-800 text-red-200 text-xs font-mono rounded">
                      {cancelError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                      Cancellation Reason *
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder="Describe why this dispatch order is being aborted..."
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                    />
                    <span className="text-[10px] font-mono text-slate-500">Min 4 characters required</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelDialog(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono uppercase cursor-pointer"
                    >
                      Keep Active
                    </button>
                    <button
                      type="submit"
                      disabled={isCancelling}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-mono uppercase font-bold cursor-pointer"
                    >
                      {isCancelling ? 'Processing...' : 'Abort Mobilization'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* RESPONDER TERMINAL VIEW */
        <div className="space-y-6">
          {/* Tactical identity simulation control */}
          <div className="bg-slate-900 border border-amber-950/40 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold mb-1">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>DEMO / SIMULATION CONTROL (Simulation Only)</span>
              </div>
              <p className="text-xs text-slate-400">
                Select a squad terminal identity to simulate receiving packets and testing UI state flows. Actual mutations are strictly validated on the server side using the authenticated user context.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-slate-400 uppercase">Active Unit:</span>
              <select
                value={simulatedResourceId}
                onChange={e => setSimulatedResourceId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono rounded px-3 py-1.5 focus:outline-hidden focus:border-emerald-500"
              >
                {resources.map(r => (
                  <option key={r.id} value={r.id}>
                    [{r.resourceCode}] {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Assigned Dispatch Card */}
          {responderActiveDispatch ? (
            (() => {
              const incidentObj = getIncident(responderActiveDispatch.incidentId);
              const resourceObj = getResource(responderActiveDispatch.resourceId);

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 max-w-3xl mx-auto shadow-md">
                  
                  {/* Briefing Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/80 animate-pulse">
                          TACTICAL DISPATCH RECEIVED
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {responderActiveDispatch.incidentNumber}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-100">
                        {incidentObj?.title || 'Tactical Incident Briefing'}
                      </h2>
                    </div>

                    <span className={`px-3 py-1 border rounded text-xs font-mono font-bold uppercase ${getStatusBadgeColor(responderActiveDispatch.status)}`}>
                      {responderActiveDispatch.status}
                    </span>
                  </div>

                  {/* Incident briefing details */}
                  <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-lg space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      INCIDENT BRIEFING SUMMARY
                    </span>
                    <p className="text-slate-200 text-xs leading-relaxed font-sans font-medium">
                      {incidentObj?.description}
                    </p>
                    
                    {responderActiveDispatch.dispatchNotes && (
                      <div className="mt-3 p-3 bg-slate-900/50 border border-slate-850 rounded text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-400 block mb-0.5">DISPATCH INSTRUCTIONS:</span>
                        "{responderActiveDispatch.dispatchNotes}"
                      </div>
                    )}
                  </div>

                  {/* Route Navigation for Field Crew */}
                  {responderActiveDispatch.routeInfo && (
                    <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-lg space-y-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>OFFLINE LANDMARK ROUTE GUIDANCE</span>
                      </span>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                        <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                          <span className="text-[9px] text-slate-500 uppercase">Distance</span>
                          <div className="font-bold text-slate-100 mt-0.5">
                            {(responderActiveDispatch.routeInfo.distanceMeters / 1000).toFixed(2)} km
                          </div>
                        </div>
                        <div className="p-2 bg-slate-900 border border-slate-850 rounded">
                          <span className="text-[9px] text-slate-500 uppercase">Est. Travel Time</span>
                          <div className="font-bold text-slate-100 mt-0.5">
                            {Math.round(responderActiveDispatch.routeInfo.travelTimeSeconds / 60)} mins
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900 border border-slate-850 rounded text-xs text-slate-200 font-mono flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Navigation Guidance:</strong>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">{responderActiveDispatch.routeInfo.explanation}</p>
                        </div>
                      </div>

                      {/* Warnings on route */}
                      {responderActiveDispatch.routeInfo.hazardPenalty > 0 && (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 text-amber-300 rounded text-[11px] font-mono flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Active hazards bypassed:</strong>
                            <p className="text-amber-300/80 mt-0.5">Route calculation bypassed {responderActiveDispatch.routeInfo.avoidedHazards} active hazard zones safely.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action states interface */}
                  <div className="border-t border-slate-850 pt-6">
                    {/* Status PENDING or DISPATCHED: requires ACK or DECLINE */}
                    {(responderActiveDispatch.status === 'PENDING' || responderActiveDispatch.status === 'DISPATCHED') && (
                      <div className="space-y-4">
                        <div className="text-center text-xs font-mono text-slate-400 uppercase">
                          Action Required: Confirm or Decline Mobilization
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(responderActiveDispatch.dispatchId, 'ACKNOWLEDGED')}
                            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded text-sm font-bold uppercase tracking-wider shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Acknowledge Mission</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeclineError(null);
                              setDeclineReason('');
                              // We just trigger decline inline below
                            }}
                            className="w-full sm:w-auto px-8 py-3 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-mono rounded text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Decline Orders
                          </button>
                        </div>

                        {/* Inline Decline notes justification */}
                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3 mt-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                            DECLINATION JUSTIFICATION FORM
                          </span>
                          {declineError && (
                            <div className="p-2 bg-red-950/50 border border-red-800 text-red-200 text-xs font-mono rounded">
                              {declineError}
                            </div>
                          )}
                          <textarea
                            value={declineReason}
                            onChange={e => setDeclineReason(e.target.value)}
                            placeholder="Provide operational reason for decline (e.g. Squad is currently attending an un-logged local emergency)..."
                            rows={2}
                            className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                          />
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>Min 4 characters</span>
                            <button
                              type="button"
                              onClick={() => handleTriggerDecline(responderActiveDispatch.dispatchId)}
                              disabled={isDeclining}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase cursor-pointer"
                            >
                              {isDeclining ? 'Declining...' : 'Confirm Decline'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status ACKNOWLEDGED: transition to EN_ROUTE */}
                    {responderActiveDispatch.status === 'ACKNOWLEDGED' && (
                      <div className="space-y-4 text-center">
                        <p className="text-xs font-mono text-slate-400 uppercase">Squad ready. Dispatch has been cryptographically confirmed.</p>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(responderActiveDispatch.dispatchId, 'EN_ROUTE')}
                          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono rounded text-sm font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2 mx-auto"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Mark En Route</span>
                        </button>
                      </div>
                    )}

                    {/* Status EN_ROUTE: transition to ARRIVED */}
                    {responderActiveDispatch.status === 'EN_ROUTE' && (
                      <div className="space-y-4 text-center">
                        <p className="text-xs font-mono text-slate-400 uppercase">Unit is en route. Follow offline GIS navigational steps.</p>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(responderActiveDispatch.dispatchId, 'ARRIVED')}
                          className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-mono rounded text-sm font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2 mx-auto"
                        >
                          <Check className="w-4 h-4" />
                          <span>Mark Arrived at Location</span>
                        </button>
                      </div>
                    )}

                    {/* Status ARRIVED: transition to ON_SCENE */}
                    {responderActiveDispatch.status === 'ARRIVED' && (
                      <div className="space-y-4 text-center">
                        <p className="text-xs font-mono text-slate-400 uppercase">Unit is on scene boundary. Establish local perimeter and commence triage.</p>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(responderActiveDispatch.dispatchId, 'ON_SCENE')}
                          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded text-sm font-bold uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2 mx-auto"
                        >
                          <Check className="w-4 h-4" />
                          <span>Mark Active On Scene</span>
                        </button>
                      </div>
                    )}

                    {/* Status ON_SCENE: input verified metrics and complete */}
                    {responderActiveDispatch.status === 'ON_SCENE' && (
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block text-center">
                          ACTIVE ON-SCENE REPORT & TERMINATION
                        </span>

                        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                                Verified Victim Count
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={verifiedVictims}
                                onChange={e => setVerifiedVictims(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                                Operational Completion Notes
                              </label>
                              <input
                                type="text"
                                placeholder="Specific containment coordinates, hazard resolution notes..."
                                value={fieldNotes}
                                onChange={e => setFieldNotes(e.target.value)}
                                className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCompleteDispatch(responderActiveDispatch.dispatchId)}
                            disabled={isCompleting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono rounded text-sm font-bold uppercase tracking-wider shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>{isCompleting ? 'Finishing...' : 'Resolve & Complete Mission'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              );
            })()
          ) : (
            <div className="py-20 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-lg max-w-xl mx-auto">
              <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="font-semibold text-slate-300 text-sm">No Tactical Orders Assigned</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Terminal ID [{simulatedResourceId ? getResource(simulatedResourceId)?.resourceCode : 'N/A'}] has no active dispatch mobilizations. System is in STANDBY.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
