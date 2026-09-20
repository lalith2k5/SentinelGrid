import React, { useState, useMemo, useRef } from 'react';
import {
  MapNode,
  MapEdge,
  Hazard,
  BlockedRoad,
  RouteResult,
  IncidentOverlay,
  ResourceOverlay,
  ResponderOverlay,
  MapLayerId
} from '../../../server/gis/types.ts';
import {
  AlertTriangle,
  Ban,
  Building,
  Crosshair,
  Hospital,
  Shield,
  Navigation,
  CheckCircle,
  MapPin,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Truck,
  User,
  Activity,
  Layers,
  Flame,
  Info
} from 'lucide-react';

export interface SelectedMapObject {
  type: 'NODE' | 'EDGE' | 'HAZARD' | 'BLOCKED_ROAD' | 'INCIDENT' | 'RESOURCE' | 'RESPONDER';
  id: string;
  data: any;
}

interface GisMapCanvasProps {
  nodes: MapNode[];
  edges: MapEdge[];
  hazards: Hazard[];
  blockedRoads: BlockedRoad[];
  incidents?: IncidentOverlay[];
  resources?: ResourceOverlay[];
  responders?: ResponderOverlay[];
  selectedOriginNodeId?: string;
  selectedDestinationNodeId?: string;
  activeRoute?: RouteResult | null;
  comparisonRoutes?: {
    FASTEST?: RouteResult | null;
    SAFEST?: RouteResult | null;
    BALANCED?: RouteResult | null;
  } | null;
  selectedMode?: 'FASTEST' | 'SAFEST' | 'BALANCED';
  visibleLayers?: Record<string, boolean>;
  selectedObject?: SelectedMapObject | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectEdge?: (edgeId: string) => void;
  onSelectObject?: (obj: SelectedMapObject | null) => void;
}

export const GisMapCanvas: React.FC<GisMapCanvasProps> = ({
  nodes,
  edges,
  hazards,
  blockedRoads,
  incidents = [],
  resources = [],
  responders = [],
  selectedOriginNodeId,
  selectedDestinationNodeId,
  activeRoute,
  comparisonRoutes,
  selectedMode = 'BALANCED',
  visibleLayers = {
    BASE_MAP: true,
    ROADS: true,
    INCIDENTS: true,
    RESOURCES: true,
    RESPONDERS: true,
    HAZARDS: true,
    BLOCKED_ROADS: true,
    ACTIVE_ROUTE: true
  },
  selectedObject,
  onSelectNode,
  onSelectEdge,
  onSelectObject
}) => {
  const width = 840;
  const height = 540;
  const padding = 70;

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { minLat: 9.97, maxLat: 10.08, minLng: 9.97, maxLng: 10.08 };
    }
    let minA = Infinity,
      maxA = -Infinity,
      minO = Infinity,
      maxO = -Infinity;
    nodes.forEach(n => {
      if (n.latitude < minA) minA = n.latitude;
      if (n.latitude > maxA) maxA = n.latitude;
      if (n.longitude < minO) minO = n.longitude;
      if (n.longitude > maxO) maxO = n.longitude;
    });
    const latSpan = maxA - minA || 0.08;
    const lngSpan = maxO - minO || 0.08;
    return {
      minLat: minA - latSpan * 0.08,
      maxLat: maxA + latSpan * 0.08,
      minLng: minO - lngSpan * 0.08,
      maxLng: maxO + lngSpan * 0.08
    };
  }, [nodes]);

  const project = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * padding);
    const y = height - (padding + ((lat - minLat) / (maxLat - minLat)) * (height - 2 * padding));
    return { x: Math.round(x), y: Math.round(y) };
  };

  const nodePosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach(n => {
      map.set(n.nodeId, project(n.latitude, n.longitude));
    });
    return map;
  }, [nodes, minLat, maxLat, minLng, maxLng]);

  const activeBlockedEdgeSet = useMemo(() => {
    const set = new Set<string>();
    blockedRoads.forEach(b => {
      if (b.active) set.add(b.edgeId);
    });
    edges.forEach(e => {
      if (e.isBlocked) set.add(e.edgeId);
    });
    return set;
  }, [blockedRoads, edges]);

  const routeEdgeSet = useMemo(() => {
    if (!activeRoute || !activeRoute.edgePath) return new Set<string>();
    return new Set(activeRoute.edgePath);
  }, [activeRoute]);

  const routeNodeSet = useMemo(() => {
    if (!activeRoute || !activeRoute.nodePath) return new Set<string>();
    return new Set(activeRoute.nodePath);
  }, [activeRoute]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click if clicking background
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      // Clamp pan limits to keep map reasonably visible
      const maxPan = 400 * zoom;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(2.5, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.6, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl flex flex-col items-center">
      {/* Top Banner Tag */}
      <div className="w-full bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-200 tracking-wide uppercase">
            OFFLINE GIS • LOCAL OPERATIONAL MAP
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px]">
            SYNTHETIC DEMO v2.0.0
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
            NO INTERNET / NO EXTERNAL APIS
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-3">
          <span>NODES: {nodes.length}</span>
          <span>ROADS: {edges.length}</span>
          <span>HAZARDS: {hazards.filter(h => h.active).length}</span>
          <span>BLOCKED: {activeBlockedEdgeSet.size}</span>
          <span>OVERLAYS: {incidents.length + resources.length + responders.length}</span>
        </div>
      </div>

      {/* Floating Canvas Controls (Zoom & Reset) */}
      <div className="absolute top-12 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 shadow-xl backdrop-blur-sm">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="text-[9px] font-mono text-center text-slate-400 pt-1 border-t border-slate-800">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Offline Watermark */}
      <div className="absolute bottom-12 left-4 z-20 pointer-events-none bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
        OFFLINE MAP — NO EXTERNAL MAP SERVICE
      </div>

      {/* Interactive Canvas Area */}
      <div
        className="relative w-full overflow-hidden flex justify-center bg-slate-950 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={width}
          height={height}
          className="bg-slate-950 select-none transition-transform duration-75"
          style={{
            minWidth: `${width}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="opGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
            {/* One-Way Arrow Marker */}
            <marker
              id="oneWayArrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* LAYER 1: Base Map Grid */}
          {visibleLayers.BASE_MAP !== false && (
            <g id="layer-base-map">
              <rect width={width} height={height} fill="url(#opGrid)" opacity="0.6" />
              {/* Perimeter Boundary Indicator */}
              <rect
                x={padding - 20}
                y={padding - 20}
                width={width - 2 * padding + 40}
                height={height - 2 * padding + 40}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            </g>
          )}

          {/* LAYER 6: Hazard Zones (drawn under roads) */}
          {visibleLayers.HAZARDS !== false && (
            <g id="layer-hazards">
              {hazards
                .filter(h => h.active)
                .map(hazard => {
                  const pos = project(hazard.latitude, hazard.longitude);
                  const rPixel = Math.max(25, Math.min(110, (hazard.radiusMeters / 250) * 45));
                  const isCritical = hazard.severity === 'CRITICAL';
                  const isHigh = hazard.severity === 'HIGH';
                  const isSelected =
                    selectedObject?.type === 'HAZARD' && selectedObject.id === hazard.hazardId;

                  return (
                    <g
                      key={hazard.hazardId}
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectObject?.({ type: 'HAZARD', id: hazard.hazardId, data: hazard });
                      }}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={rPixel}
                        fill={isCritical ? '#ef4444' : isHigh ? '#f97316' : '#eab308'}
                        fillOpacity={isSelected ? 0.35 : 0.18}
                        stroke={isCritical ? '#dc2626' : isHigh ? '#ea580c' : '#ca8a04'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeDasharray="4,3"
                        className="animate-pulse"
                      />
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={7}
                        fill={isCritical ? '#ef4444' : '#f97316'}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={pos.x}
                        y={pos.y - rPixel - 4}
                        textAnchor="middle"
                        fill={isCritical ? '#fca5a5' : '#fdba74'}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ⚠️ {hazard.type} ({hazard.severity})
                      </text>
                    </g>
                  );
                })}
            </g>
          )}

          {/* LAYER 2: Road Network */}
          {visibleLayers.ROADS !== false && (
            <g id="layer-roads">
              {edges.map(edge => {
                const p1 = nodePosMap.get(edge.fromNodeId);
                const p2 = nodePosMap.get(edge.toNodeId);
                if (!p1 || !p2) return null;

                const isBlocked = activeBlockedEdgeSet.has(edge.edgeId);
                const isInRoute = routeEdgeSet.has(edge.edgeId);
                const isSelected =
                  selectedObject?.type === 'EDGE' && selectedObject.id === edge.edgeId;

                let strokeColor = '#334155'; // default slate-700
                let strokeWidth = 2.5;

                if (edge.roadType === 'HIGHWAY' || edge.roadType === 'PRIMARY') {
                  strokeWidth = 3.5;
                  strokeColor = '#475569';
                } else if (edge.roadType === 'BRIDGE' || edge.roadType === 'TUNNEL') {
                  strokeWidth = 3;
                  strokeColor = '#64748b';
                }

                if (isBlocked && visibleLayers.BLOCKED_ROADS !== false) {
                  strokeColor = '#ef4444';
                  strokeWidth = 3.5;
                }

                if (isInRoute && visibleLayers.ACTIVE_ROUTE !== false) {
                  strokeColor = '#06b6d4'; // bright cyan
                  strokeWidth = 5;
                }

                if (isSelected) {
                  strokeColor = '#facc15'; // yellow highlight
                  strokeWidth = 5;
                }

                return (
                  <g
                    key={edge.edgeId}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectEdge?.(edge.edgeId);
                      onSelectObject?.({ type: 'EDGE', id: edge.edgeId, data: edge });
                    }}
                    className="cursor-pointer group"
                  >
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={
                        isBlocked && visibleLayers.BLOCKED_ROADS !== false ? '6,4' : undefined
                      }
                      markerEnd={edge.direction === 'ONE_WAY' ? 'url(#oneWayArrow)' : undefined}
                      className="transition-all duration-150"
                    />

                    {/* Edge Label on Hover */}
                    <text
                      x={(p1.x + p2.x) / 2}
                      y={(p1.y + p2.y) / 2 - 5}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 pointer-events-none"
                    >
                      {edge.roadName || edge.edgeId} ({edge.distanceMeters}m)
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 8: Comparison Routes Paths */}
          {visibleLayers.ACTIVE_ROUTE !== false && comparisonRoutes && (
            <g id="layer-comparison-routes">
              {/* SAFEST Route in Emerald */}
              {comparisonRoutes.SAFEST?.routeStatus === 'FOUND' &&
                selectedMode !== 'SAFEST' && (
                  <path
                    d={comparisonRoutes.SAFEST.nodePath
                      .map((nId, idx) => {
                        const pos = nodePosMap.get(nId);
                        if (!pos) return '';
                        return `${idx === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray="6,4"
                    opacity="0.75"
                  />
                )}
              {/* FASTEST Route in Amber */}
              {comparisonRoutes.FASTEST?.routeStatus === 'FOUND' &&
                selectedMode !== 'FASTEST' && (
                  <path
                    d={comparisonRoutes.FASTEST.nodePath
                      .map((nId, idx) => {
                        const pos = nodePosMap.get(nId);
                        if (!pos) return '';
                        return `${idx === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeDasharray="6,4"
                    opacity="0.75"
                  />
                )}
            </g>
          )}

          {/* LAYER 8: Active Route Path Overlay */}
          {visibleLayers.ACTIVE_ROUTE !== false &&
            activeRoute &&
            activeRoute.routeStatus === 'FOUND' && (
              <path
                d={activeRoute.nodePath
                  .map((nId, idx) => {
                    const pos = nodePosMap.get(nId);
                    if (!pos) return '';
                    return `${idx === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={
                  selectedMode === 'SAFEST'
                    ? '#10b981'
                    : selectedMode === 'FASTEST'
                    ? '#f59e0b'
                    : '#06b6d4'
                }
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            )}

          {/* Road Network Nodes / Intersections */}
          {nodes.map(node => {
            const pos = nodePosMap.get(node.nodeId);
            if (!pos) return null;

            const isOrigin = selectedOriginNodeId === node.nodeId;
            const isDestination = selectedDestinationNodeId === node.nodeId;
            const isInRoute = routeNodeSet.has(node.nodeId);
            const isSelected =
              selectedObject?.type === 'NODE' && selectedObject.id === node.nodeId;

            let nodeFill = '#1e293b';
            let nodeStroke = '#475569';
            let radius = 11;

            if (isOrigin) {
              nodeFill = '#0e7490';
              nodeStroke = '#06b6d4';
              radius = 15;
            } else if (isDestination) {
              nodeFill = '#047857';
              nodeStroke = '#10b981';
              radius = 15;
            } else if (isInRoute && visibleLayers.ACTIVE_ROUTE !== false) {
              nodeFill = '#0f766e';
              nodeStroke = '#14b8a6';
              radius = 13;
            }

            if (isSelected) {
              nodeStroke = '#facc15';
              radius = 16;
            }

            return (
              <g
                key={node.nodeId}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={e => {
                  e.stopPropagation();
                  onSelectNode?.(node.nodeId);
                  onSelectObject?.({ type: 'NODE', id: node.nodeId, data: node });
                }}
                className="cursor-pointer group"
              >
                {(isOrigin || isDestination) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={isOrigin ? '#06b6d4' : '#10b981'}
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}

                <circle
                  r={radius}
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-125"
                />

                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#f8fafc"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.nodeId.replace('N-', '')}
                </text>

                <text
                  y={radius + 13}
                  textAnchor="middle"
                  fill={isOrigin ? '#67e8f9' : isDestination ? '#6ee7b7' : '#cbd5e1'}
                  fontSize="9.5"
                  fontFamily="sans-serif"
                  fontWeight={isOrigin || isDestination ? 'bold' : 'normal'}
                >
                  {node.name}
                </text>
              </g>
            );
          })}

          {/* LAYER 3: Incidents Overlay */}
          {visibleLayers.INCIDENTS !== false && (
            <g id="layer-incidents">
              {incidents.map(inc => {
                if (
                  inc.isLocationUnavailable ||
                  inc.latitude === null ||
                  inc.longitude === null ||
                  (inc.latitude === 0 && inc.longitude === 0)
                ) {
                  return null;
                }
                const pos = project(inc.latitude, inc.longitude);
                const isSelected =
                  selectedObject?.type === 'INCIDENT' && selectedObject.id === inc.incidentId;
                const isCritical = inc.severity === 'CRITICAL';
                const isHigh = inc.severity === 'HIGH';

                return (
                  <g
                    key={inc.incidentId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectObject?.({ type: 'INCIDENT', id: inc.incidentId, data: inc });
                    }}
                    className="cursor-pointer group"
                  >
                    <polygon
                      points="0,-12 11,8 -11,8"
                      fill={isCritical ? '#dc2626' : isHigh ? '#ea580c' : '#eab308'}
                      stroke={isSelected ? '#facc15' : '#ffffff'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="animate-bounce"
                    />
                    <text
                      textAnchor="middle"
                      dy="5"
                      fill="#fff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      !
                    </text>
                    <text
                      y="-16"
                      textAnchor="middle"
                      fill={isCritical ? '#fca5a5' : '#fdba74'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="bg-slate-900"
                    >
                      {inc.category}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 4: Resources Overlay */}
          {visibleLayers.RESOURCES !== false && (
            <g id="layer-resources">
              {resources.map(res => {
                if (
                  res.isLocationUnavailable ||
                  res.latitude === null ||
                  res.longitude === null ||
                  (res.latitude === 0 && res.longitude === 0)
                ) {
                  return null;
                }
                const pos = project(res.latitude, res.longitude);
                const isSelected =
                  selectedObject?.type === 'RESOURCE' && selectedObject.id === res.resourceId;
                const isAvailable = res.status === 'AVAILABLE';

                return (
                  <g
                    key={res.resourceId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectObject?.({ type: 'RESOURCE', id: res.resourceId, data: res });
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      x="-9"
                      y="-9"
                      width="18"
                      height="18"
                      rx="3"
                      fill={isAvailable ? '#059669' : '#475569'}
                      stroke={isSelected ? '#facc15' : '#10b981'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill="#fff"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      R
                    </text>
                    <text
                      y="18"
                      textAnchor="middle"
                      fill="#a7f3d0"
                      fontSize="8.5"
                      fontFamily="sans-serif"
                    >
                      {res.name.substring(0, 12)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* LAYER 5: Responders Overlay */}
          {visibleLayers.RESPONDERS !== false && (
            <g id="layer-responders">
              {responders.map(resp => {
                const pos = project(resp.latitude, resp.longitude);
                const isSelected =
                  selectedObject?.type === 'RESPONDER' && selectedObject.id === resp.responderId;

                return (
                  <g
                    key={resp.responderId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={e => {
                      e.stopPropagation();
                      onSelectObject?.({ type: 'RESPONDER', id: resp.responderId, data: resp });
                    }}
                    className="cursor-pointer group"
                  >
                    <circle
                      r="8"
                      fill="#0284c7"
                      stroke={isSelected ? '#facc15' : '#38bdf8'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="3.5"
                      fill="#fff"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      U
                    </text>
                    <text
                      y="-12"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {resp.callsign}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* Legend & Footnote */}
      <div className="w-full bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-600 border border-cyan-400" />
            <span>ORIGIN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400" />
            <span>DESTINATION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-cyan-400 rounded" />
            <span>ROUTE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-rose-500 stroke-dasharray rounded" />
            <span>BLOCKED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500" />
            <span>HAZARD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 transform rotate-45" />
            <span>INCIDENT</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-700 rounded-sm" />
            <span>RESOURCE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span>RESPONDER</span>
          </div>
        </div>
        <div className="text-slate-500 text-[10px]">
          DATUM: WGS-84 LOCAL GRID • PROJECTION: SPHERICAL HAVERSINE
        </div>
      </div>
    </div>
  );
};
