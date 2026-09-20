import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  MapNode,
  MapEdge,
  Hazard,
  BlockedRoad,
  RouteMode,
  RouteResult,
  HazardType,
  HazardSeverity,
  IncidentOverlay,
  ResourceOverlay,
  ResponderOverlay,
  RouteComparisonResult,
  MapDiagnostics,
  MapLayerConfig
} from '../../server/gis/types.ts';
import { GisMapCanvas, SelectedMapObject } from '../components/gis/GisMapCanvas.tsx';
import { HazardModal } from '../components/gis/HazardModal.tsx';
import { BlockedRoadModal } from '../components/gis/BlockedRoadModal.tsx';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Ban,
  ShieldAlert,
  Info,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle,
  AlertOctagon,
  Clock,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Radio,
  Sliders,
  Eye,
  EyeOff,
  Activity,
  FileCheck,
  TrendingUp,
  Cpu,
  Truck,
  User,
  X
} from 'lucide-react';

interface IncidentSimple {
  id: string;
  incidentNumber: string;
  title: string;
  severity: string;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
    zone?: string;
  };
}

export const MapPage: React.FC = () => {
  const { user, token } = useAuth();

  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [blockedRoads, setBlockedRoads] = useState<BlockedRoad[]>([]);
  const [incidents, setIncidents] = useState<IncidentOverlay[]>([]);
  const [resources, setResources] = useState<ResourceOverlay[]>([]);
  const [responders, setResponders] = useState<ResponderOverlay[]>([]);
  const [diagnostics, setDiagnostics] = useState<MapDiagnostics | null>(null);

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [originNodeId, setOriginNodeId] = useState<string>('N-01');
  const [destinationNodeId, setDestinationNodeId] = useState<string>('N-05');
  const [routeMode, setRouteMode] = useState<RouteMode>('BALANCED');

  // Route calculation & comparison
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<RouteComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Panels
  const [isHazardModalOpen, setIsHazardModalOpen] = useState<boolean>(false);
  const [isBlockedRoadModalOpen, setIsBlockedRoadModalOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [selectedObject, setSelectedObject] = useState<SelectedMapObject | null>(null);

  // Layer Visibility State
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    BASE_MAP: true,
    ROADS: true,
    INCIDENTS: true,
    RESOURCES: true,
    RESPONDERS: true,
    HAZARDS: true,
    BLOCKED_ROADS: true,
    ACTIVE_ROUTE: true
  });

  const canManageHazards =
    user?.role === 'ADMIN' || user?.role === 'DISPATCHER' || user?.role === 'OPERATOR';
  const canManageBlockedRoads = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';

  // Toggle Layer Visibility
  const toggleLayer = (layerId: string) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  // Load Operational Map Data
  const loadData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/map/data', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load operational map: HTTP ${res.status}`);
      }

      const mapData = await res.json();
      setNodes(mapData.nodes || []);
      setEdges(mapData.edges || []);
      setHazards(mapData.hazards || []);
      setBlockedRoads(mapData.blockedRoads || []);
      setIncidents(mapData.overlays?.incidents || []);
      setResources(mapData.overlays?.resources || []);
      setResponders(mapData.overlays?.responders || []);
      setDiagnostics(mapData.diagnostics || null);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to offline GIS engine.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Trigger route calculation
  const handleCalculateRoute = async (modeToUse: RouteMode = routeMode) => {
    if (!token) return;
    try {
      setIsCalculating(true);
      setError(null);

      const payload: any = {
        mode: modeToUse
      };

      if (selectedIncidentId) {
        payload.incidentId = selectedIncidentId;
        payload.originNodeId = originNodeId;
      } else {
        payload.originNodeId = originNodeId;
        payload.destinationNodeId = destinationNodeId;
      }

      const res = await fetch('/api/routing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Route calculation request failed.');
      }

      const result: RouteResult = await res.json();
      setActiveRoute(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate safe route.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Trigger Multi-Mode Route Comparison
  const handleCompareRoutes = async () => {
    if (!token) return;
    try {
      setIsComparing(true);
      setError(null);

      const payload: any = {};
      if (selectedIncidentId) {
        payload.incidentId = selectedIncidentId;
        payload.originNodeId = originNodeId;
      } else {
        payload.originNodeId = originNodeId;
        payload.destinationNodeId = destinationNodeId;
      }

      const res = await fetch('/api/map/compare-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Route comparison request failed.');
      }

      const compData: RouteComparisonResult = await res.json();
      setComparisonResult(compData);
      if (compData.routes[routeMode]) {
        setActiveRoute(compData.routes[routeMode]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to compare route modes.');
    } finally {
      setIsComparing(false);
    }
  };

  // Add Hazard
  const handleAddHazard = async (data: {
    type: HazardType;
    severity: HazardSeverity;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    description: string;
  }) => {
    if (!token) return;
    const res = await fetch('/api/map/hazards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create hazard');
    }

    await loadData();
  };

  // Delete Hazard
  const handleDeleteHazard = async (hazardId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/map/hazards/${hazardId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete hazard');
      }
      if (selectedObject?.type === 'HAZARD' && selectedObject.id === hazardId) {
        setSelectedObject(null);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete hazard');
    }
  };

  // Add Blocked Road
  const handleAddBlockedRoad = async (data: { edgeId: string; reason: string }) => {
    if (!token) return;
    const res = await fetch('/api/map/blocked-roads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to mark road blocked');
    }

    await loadData();
  };

  // Delete Blocked Road
  const handleDeleteBlockedRoad = async (blockedRoadId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/map/blocked-roads/${blockedRoadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to remove road blockage');
      }
      if (selectedObject?.type === 'BLOCKED_ROAD' && selectedObject.id === blockedRoadId) {
        setSelectedObject(null);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove road blockage');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Offline Operational GIS & Map Environment
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase font-bold">
              PHASE 7 ● OPERATIONAL GIS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            100% Offline GIS Engine • Multi-layer Overlays • Side-by-side Route Comparison • Zero Internet Dependency
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 font-mono text-xs flex items-center gap-1.5 border border-slate-800 hover:border-cyan-700 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Map Diagnostics</span>
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs flex items-start gap-2 shadow-lg">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase mb-0.5">GIS Alert</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Layer Visibility Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Operational Layers:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'BASE_MAP', label: 'Base Grid' },
            { id: 'ROADS', label: `Roads (${edges.length})` },
            { id: 'INCIDENTS', label: `Incidents (${incidents.length})` },
            { id: 'RESOURCES', label: `Resources (${resources.length})` },
            { id: 'RESPONDERS', label: `Responders (${responders.length})` },
            { id: 'HAZARDS', label: `Hazards (${hazards.filter(h => h.active).length})` },
            { id: 'BLOCKED_ROADS', label: `Blockages (${blockedRoads.filter(b => b.active).length})` },
            { id: 'ACTIVE_ROUTE', label: 'Active Route' }
          ].map(layer => {
            const isVisible = visibleLayers[layer.id] !== false;
            return (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                  isVisible
                    ? 'bg-slate-800 border-cyan-700/70 text-cyan-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-400'
                }`}
              >
                {isVisible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-600" />}
                <span>{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Calculator Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Controls Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wide pb-2 border-b border-slate-800">
              <Navigation className="w-4 h-4" />
              <span>Offline Navigation Engine</span>
            </div>

            {/* Quick Incident Selection */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Destination: Active Incident
              </label>
              <select
                value={selectedIncidentId}
                onChange={e => setSelectedIncidentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Use Custom Node Destination --</option>
                {incidents.map(inc => (
                  <option key={inc.incidentId} value={inc.incidentId}>
                    {inc.incidentId} • {inc.category} [{inc.severity}]
                    {inc.isLocationUnavailable ? ' (UNMAPPED)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Origin & Destination Nodes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Origin Node
                </label>
                <select
                  value={originNodeId}
                  onChange={e => setOriginNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {nodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.nodeId} ({n.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                  Destination Node
                </label>
                <select
                  disabled={!!selectedIncidentId}
                  value={destinationNodeId}
                  onChange={e => setDestinationNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  {nodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>
                      {n.nodeId} ({n.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Routing Mode */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Active Optimization Mode
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                {(['FASTEST', 'SAFEST', 'BALANCED'] as RouteMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setRouteMode(mode);
                      if (comparisonResult && comparisonResult.routes[mode]) {
                        setActiveRoute(comparisonResult.routes[mode]);
                      }
                    }}
                    className={`py-1.5 px-2 rounded border text-center transition-colors ${
                      routeMode === mode
                        ? mode === 'SAFEST'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                          : mode === 'FASTEST'
                          ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                          : 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleCalculateRoute()}
                disabled={isCalculating}
                className="w-full py-2.5 px-4 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Navigation className="w-4 h-4" />
                <span>{isCalculating ? 'Calculating...' : 'Calculate Safe Route'}</span>
              </button>

              <button
                onClick={handleCompareRoutes}
                disabled={isComparing}
                className="w-full py-2 px-4 rounded bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-cyan-400 border border-slate-700 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span>{isComparing ? 'Comparing Modes...' : 'Compare All 3 Modes'}</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Mode Comparison Table */}
          {comparisonResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-mono text-xs font-bold text-slate-200 uppercase">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Mode Trade-Off Analysis</span>
                </div>
                <button
                  onClick={() => setComparisonResult(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {comparisonResult.metrics.map(m => (
                  <div
                    key={m.mode}
                    onClick={() => {
                      setRouteMode(m.mode);
                      if (comparisonResult.routes[m.mode]) {
                        setActiveRoute(comparisonResult.routes[m.mode]);
                      }
                    }}
                    className={`p-2.5 rounded border text-xs font-mono cursor-pointer transition-colors ${
                      routeMode === m.mode
                        ? 'bg-slate-950 border-cyan-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span
                        className={
                          m.mode === 'SAFEST'
                            ? 'text-emerald-400'
                            : m.mode === 'FASTEST'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }
                      >
                        {m.mode} MODE
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          m.feasible
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {m.routeStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500">Duration: </span>
                        {Math.round(m.estimatedTravelSeconds)}s
                      </div>
                      <div>
                        <span className="text-slate-500">Distance: </span>
                        {m.distanceMeters}m
                      </div>
                      <div>
                        <span className="text-slate-500">Hazards Avoided: </span>
                        {m.avoidedHazards}
                      </div>
                      <div>
                        <span className="text-slate-500">Blocked Avoided: </span>
                        {m.blockedEdgesAvoided}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] font-mono text-slate-400 italic pt-1 border-t border-slate-800">
                {comparisonResult.tradeoffSummary}
              </p>
            </div>
          )}

          {/* Active Route Telemetry Card */}
          {activeRoute && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-xl space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-200">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Route Telemetry</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    activeRoute.routeStatus === 'FOUND'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {activeRoute.routeStatus}
                </span>
              </div>

              {activeRoute.routeStatus === 'FOUND' ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-slate-950 border border-slate-800">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Distance</div>
                      <div className="text-sm font-bold text-slate-100">
                        {activeRoute.distanceMeters.toLocaleString()} m
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Est. Time</div>
                      <div className="text-sm font-bold text-cyan-400">
                        {Math.round(activeRoute.estimatedTravelSeconds / 60)} min{' '}
                        <span className="text-xs text-slate-400">
                          ({activeRoute.estimatedTravelSeconds}s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500">Path: </span>
                    {activeRoute.nodePath.join(' → ')}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                  <div className="font-bold uppercase mb-1">Route Feasibility Warning</div>
                  <div>{activeRoute.explanation}</div>
                </div>
              )}
            </div>
          )}

          {/* Operational Map Inspector Panel */}
          {selectedObject && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold text-slate-200 uppercase">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Info className="w-4 h-4" />
                  <span>Inspector: {selectedObject.type}</span>
                </div>
                <button
                  onClick={() => setSelectedObject(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="font-bold text-slate-100">{selectedObject.id}</div>
                {selectedObject.type === 'NODE' && (
                  <>
                    <div>Name: {selectedObject.data.name}</div>
                    <div>
                      Lat/Lng: {selectedObject.data.latitude?.toFixed(4)},{' '}
                      {selectedObject.data.longitude?.toFixed(4)}
                    </div>
                    <div>Type: {selectedObject.data.type || 'INTERSECTION'}</div>
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => setOriginNodeId(selectedObject.id)}
                        className="px-2 py-1 rounded bg-cyan-900 hover:bg-cyan-800 text-cyan-200 text-[10px]"
                      >
                        Set as Origin
                      </button>
                      <button
                        onClick={() => setDestinationNodeId(selectedObject.id)}
                        className="px-2 py-1 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-[10px]"
                      >
                        Set as Destination
                      </button>
                    </div>
                  </>
                )}
                {selectedObject.type === 'EDGE' && (
                  <>
                    <div>Road: {selectedObject.data.roadName || selectedObject.id}</div>
                    <div>Type: {selectedObject.data.roadType}</div>
                    <div>Distance: {selectedObject.data.distanceMeters} m</div>
                    <div>Est. Travel: {selectedObject.data.estimatedTravelSeconds} s</div>
                    <div>Direction: {selectedObject.data.direction}</div>
                    <div>Speed Limit: {selectedObject.data.speedLimitKmh || 40} km/h</div>
                  </>
                )}
                {selectedObject.type === 'HAZARD' && (
                  <>
                    <div>Hazard Type: {selectedObject.data.type}</div>
                    <div>Severity: {selectedObject.data.severity}</div>
                    <div>Radius: {selectedObject.data.radiusMeters} m</div>
                    <div>Description: {selectedObject.data.description || 'None'}</div>
                    {canManageHazards && (
                      <button
                        onClick={() => handleDeleteHazard(selectedObject.id)}
                        className="mt-2 px-2.5 py-1 rounded bg-rose-900 hover:bg-rose-800 text-rose-200 text-[10px] flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Hazard</span>
                      </button>
                    )}
                  </>
                )}
                {selectedObject.type === 'INCIDENT' && (
                  <>
                    <div>Category: {selectedObject.data.category}</div>
                    <div>Severity: {selectedObject.data.severity}</div>
                    <div>Status: {selectedObject.data.status}</div>
                    <div>
                      Coordinates:{' '}
                      {selectedObject.data.isLocationUnavailable
                        ? 'UNAVAILABLE'
                        : `${selectedObject.data.latitude?.toFixed(4)}, ${selectedObject.data.longitude?.toFixed(4)}`}
                    </div>
                    {selectedObject.data.nearestNodeId && (
                      <div>
                        Nearest Node: {selectedObject.data.nearestNodeId} (
                        {Math.round(selectedObject.data.nearestDistanceMeters)}m away)
                      </div>
                    )}
                  </>
                )}
                {selectedObject.type === 'RESOURCE' && (
                  <>
                    <div>Name: {selectedObject.data.name}</div>
                    <div>Type: {selectedObject.data.type}</div>
                    <div>Status: {selectedObject.data.status}</div>
                    <div>Capabilities: {selectedObject.data.capabilities?.join(', ')}</div>
                    <div>Capacity: {selectedObject.data.capacity}</div>
                  </>
                )}
                {selectedObject.type === 'RESPONDER' && (
                  <>
                    <div>Callsign: {selectedObject.data.callsign}</div>
                    <div>Role: {selectedObject.data.role}</div>
                    <div>Status: {selectedObject.data.status}</div>
                    <div className="text-amber-400 font-bold text-[10px] mt-1 bg-amber-950/40 p-1 rounded border border-amber-900">
                      LOCATION: SIMULATED OFFLINE POSITION
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hazard & Blocked Road Creation Buttons */}
          {(canManageHazards || canManageBlockedRoads) && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl space-y-3">
              <div className="font-mono text-xs font-bold text-slate-300 uppercase">
                Hazard & Road Blockage Controls
              </div>
              <div className="grid grid-cols-2 gap-2">
                {canManageHazards && (
                  <button
                    onClick={() => setIsHazardModalOpen(true)}
                    className="py-2 px-3 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Hazard</span>
                  </button>
                )}
                {canManageBlockedRoads && (
                  <button
                    onClick={() => setIsBlockedRoadModalOpen(true)}
                    className="py-2 px-3 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block Road</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Map Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <GisMapCanvas
            nodes={nodes}
            edges={edges}
            hazards={hazards}
            blockedRoads={blockedRoads}
            incidents={incidents}
            resources={resources}
            responders={responders}
            selectedOriginNodeId={originNodeId}
            selectedDestinationNodeId={selectedIncidentId ? undefined : destinationNodeId}
            activeRoute={activeRoute}
            comparisonRoutes={comparisonResult?.routes}
            selectedMode={routeMode}
            visibleLayers={visibleLayers}
            selectedObject={selectedObject}
            onSelectNode={nodeId => {
              const node = nodes.find(n => n.nodeId === nodeId);
              if (node) {
                setSelectedObject({ type: 'NODE', id: nodeId, data: node });
              }
            }}
            onSelectEdge={edgeId => {
              const edge = edges.find(e => e.edgeId === edgeId);
              if (edge) {
                setSelectedObject({ type: 'EDGE', id: edgeId, data: edge });
              }
            }}
            onSelectObject={obj => setSelectedObject(obj)}
          />
        </div>
      </div>

      {/* Diagnostics Modal */}
      {isDiagnosticsOpen && diagnostics && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-100 uppercase text-sm">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Offline GIS Map Diagnostics</span>
              </div>
              <button
                onClick={() => setIsDiagnosticsOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Operational Status</div>
                <div className="text-emerald-400 font-bold text-sm">{diagnostics.status}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Internet Dependency</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {diagnostics.internetDependency}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Dataset Version</div>
                <div className="text-cyan-400 font-bold text-sm">{diagnostics.version}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Nodes / Intersections</div>
                <div className="text-slate-200 font-bold text-sm">{diagnostics.nodeCount}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Road Edges</div>
                <div className="text-slate-200 font-bold text-sm">{diagnostics.roadCount}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Active Hazards</div>
                <div className="text-amber-400 font-bold text-sm">{diagnostics.hazardCount}</div>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-slate-300 uppercase">Coordinate Reference System</div>
              <div className="text-slate-400">
                <div>Datum: {diagnostics.coordinateSystem.datum}</div>
                <div>Projection: {diagnostics.coordinateSystem.projection}</div>
                <div>Notice: {diagnostics.offlineNotice}</div>
              </div>
            </div>

            <div className="space-y-2 p-3 rounded bg-slate-950 border border-slate-800">
              <div className="font-bold text-slate-300 uppercase">Validation Integrity Report</div>
              <div className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Dataset Structure Validated (Zero Orphan Edges, Valid Geometry)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDiagnosticsOpen(false)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hazard Creation Modal */}
      {isHazardModalOpen && (
        <HazardModal
          isOpen={isHazardModalOpen}
          onClose={() => setIsHazardModalOpen(false)}
          onSubmit={handleAddHazard}
        />
      )}

      {/* Blocked Road Modal */}
      {isBlockedRoadModalOpen && (
        <BlockedRoadModal
          isOpen={isBlockedRoadModalOpen}
          edges={edges}
          onClose={() => setIsBlockedRoadModalOpen(false)}
          onSubmit={handleAddBlockedRoad}
        />
      )}
    </div>
  );
};
