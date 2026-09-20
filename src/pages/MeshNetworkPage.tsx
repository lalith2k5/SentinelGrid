import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Radio,
  Signal,
  ArrowRightLeft,
  Layers,
  Cpu,
  RefreshCw,
  Info,
  ShieldCheck,
  Play,
  RotateCcw,
  PlusCircle,
  Power,
  Battery,
  Send,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Activity,
  GitBranch,
  Clock,
  MapPin,
  ChevronRight,
  Server,
  Zap
} from 'lucide-react';
import {
  SimulatedMeshNode,
  SimulatedMeshPacket,
  SimulatedMeshEvent,
  MeshSimulationConfig,
  MeshMetricsData,
  Incident,
  NodeType
} from '../types/index.ts';

export const MeshNetworkPage: React.FC = () => {
  const { user, token } = useAuth();
  const [nodes, setNodes] = useState<SimulatedMeshNode[]>([]);
  const [packets, setPackets] = useState<SimulatedMeshPacket[]>([]);
  const [events, setEvents] = useState<SimulatedMeshEvent[]>([]);
  const [metrics, setMetrics] = useState<MeshMetricsData | null>(null);
  const [config, setConfig] = useState<MeshSimulationConfig | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Active view tabs: 'topology' | 'packets' | 'events' | 'config'
  const [activeTab, setActiveTab] = useState<'topology' | 'packets' | 'events' | 'config'>('topology');

  // Selected packet for detailed inspector
  const [selectedPacket, setSelectedPacket] = useState<SimulatedMeshPacket | null>(null);

  // Transmission form state
  const [sourceNodeId, setSourceNodeId] = useState('FIELD-01');
  const [destNodeId, setDestNodeId] = useState('COMMAND-01');
  const [customPacketId, setCustomPacketId] = useState('');
  const [messageType, setMessageType] = useState<string>('INCIDENT_REPORT');
  const [packetPayloadText, setPacketPayloadText] = useState('');
  const [customTtl, setCustomTtl] = useState(7);
  const [requestAck, setRequestAck] = useState(true);

  // Quick incident broadcast state
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  // Add node modal state
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('RELAY');
  const [newNodeNeighbors, setNewNodeNeighbors] = useState<string[]>([]);

  // Simulation status banner / toast
  const [simulationAlert, setSimulationAlert] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const canSimulate = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';
  const canAdmin = user?.role === 'ADMIN';

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [nodesRes, packetsRes, eventsRes, metricsRes, configRes, incidentsRes] = await Promise.all([
        fetch('/api/mesh/nodes', { headers: authHeaders }),
        fetch('/api/mesh/packets?limit=50', { headers: authHeaders }),
        fetch('/api/mesh/events?limit=100', { headers: authHeaders }),
        fetch('/api/mesh/metrics', { headers: authHeaders }),
        fetch('/api/mesh/config', { headers: authHeaders }),
        fetch('/api/incidents', { headers: authHeaders })
      ]);

      if (nodesRes.ok) {
        const data = await nodesRes.json();
        setNodes(data.nodes || []);
      }
      if (packetsRes.ok) {
        const data = await packetsRes.json();
        setPackets(data.packets || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
        if (data.config?.initialTtl) setCustomTtl(data.config.initialTtl);
      }
      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to load mesh simulation data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Toggle Node Online / Offline
  const handleToggleNodeStatus = async (node: SimulatedMeshNode) => {
    if (!canSimulate) return;
    try {
      const nextStatus = node.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      const res = await fetch(`/api/mesh/nodes/${node.nodeId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchAllData();
        setSimulationAlert({
          type: nextStatus === 'ONLINE' ? 'success' : 'warning',
          message: `Node ${node.nodeId} is now ${nextStatus}`
        });
      }
    } catch (err) {
      console.error('Failed to toggle node status', err);
    }
  };

  // Run Test Packet Simulation
  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSimulate) return;
    try {
      setIsSimulating(true);
      setSimulationAlert(null);
      const res = await fetch('/api/mesh/simulate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceNodeId,
          destinationNodeId: destNodeId,
          packetId: customPacketId ? customPacketId.trim() : undefined,
          messageType,
          initialTtl: customTtl,
          ackRequested: requestAck,
          payload: {
            title: `${messageType} Broadcast`,
            summary: packetPayloadText || `Simulated ${messageType} dispatched via virtual mesh routing.`
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedPacket(data.packet);
        await fetchAllData();
        setSimulationAlert({
          type: data.packet.status === 'DELIVERED' || data.packet.status === 'ACKNOWLEDGED' ? 'success' : 'warning',
          message: `Simulation Completed: Packet ${data.packet.packetId} finished with status ${data.packet.status} (${data.packet.hopCount} hops, ${data.packet.totalLatencyMs || data.packet.latencyMs || 0}ms)`
        });
      } else {
        const err = await res.json();
        setSimulationAlert({ type: 'error', message: err.error || 'Simulation failed' });
      }
    } catch (err: any) {
      setSimulationAlert({ type: 'error', message: err.message || 'Simulation network error' });
    } finally {
      setIsSimulating(false);
    }
  };

  // Run Incident Mesh Broadcast
  const handleBroadcastIncident = async () => {
    if (!canSimulate || !selectedIncidentId) return;
    try {
      setIsSimulating(true);
      setSimulationAlert(null);
      const res = await fetch(`/api/mesh/simulate/incident/${selectedIncidentId}`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sourceNodeId,
          destinationNodeId: destNodeId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedPacket(data.packet);
        await fetchAllData();
        setSimulationAlert({
          type: data.packet.status === 'DELIVERED' || data.packet.status === 'ACKNOWLEDGED' ? 'success' : 'warning',
          message: `Incident ${data.incident.incidentNumber} broadcasted via Mesh: Status ${data.packet.status} (${data.packet.hopCount} hops)`
        });
      } else {
        const err = await res.json();
        setSimulationAlert({ type: 'error', message: err.error || 'Incident broadcast failed' });
      }
    } catch (err: any) {
      setSimulationAlert({ type: 'error', message: err.message || 'Incident broadcast error' });
    } finally {
      setIsSimulating(false);
    }
  };

  // Reset Simulation History
  const handleResetSimulation = async () => {
    if (!canAdmin) return;
    if (!window.confirm('Reset simulated packet history and events? (All user accounts, incidents, and resources will be kept safe).')) {
      return;
    }
    try {
      const res = await fetch('/api/mesh/reset', {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        setSelectedPacket(null);
        await fetchAllData();
        setSimulationAlert({
          type: 'success',
          message: 'Simulated packets and event telemetry have been reset.'
        });
      }
    } catch (err) {
      console.error('Failed to reset simulation', err);
    }
  };

  // Reset Topology to Default Nodes
  const handleResetTopology = async () => {
    if (!canAdmin) return;
    if (!window.confirm('Reset mesh topology to the 6 default simulated stations?')) {
      return;
    }
    try {
      const res = await fetch('/api/mesh/nodes/reset', {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        await fetchAllData();
        setSimulationAlert({
          type: 'success',
          message: 'Topology restored to standard 6-node emergency mesh configuration.'
        });
      }
    } catch (err) {
      console.error('Failed to reset topology', err);
    }
  };

  // Update Config
  const handleUpdateConfig = async (updates: Partial<MeshSimulationConfig>) => {
    if (!canAdmin) return;
    try {
      const res = await fetch('/api/mesh/config', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setSimulationAlert({
          type: 'success',
          message: 'Simulation configuration parameters updated.'
        });
      }
    } catch (err) {
      console.error('Failed to update config', err);
    }
  };

  // Add Custom Node
  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSimulate || !newNodeId.trim() || !newNodeName.trim()) return;
    try {
      const res = await fetch('/api/mesh/nodes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          nodeId: newNodeId.trim().toUpperCase(),
          nodeName: newNodeName.trim(),
          nodeType: newNodeType,
          status: 'ONLINE',
          batteryLevel: 100,
          signalQuality: 85,
          neighbors: newNodeNeighbors
        })
      });
      if (res.ok) {
        setIsAddNodeOpen(false);
        setNewNodeId('');
        setNewNodeName('');
        setNewNodeNeighbors([]);
        await fetchAllData();
        setSimulationAlert({
          type: 'success',
          message: `Simulated node ${newNodeId.toUpperCase()} created and linked into topology.`
        });
      } else {
        const err = await res.json();
        setSimulationAlert({ type: 'error', message: err.error || 'Failed to add node' });
      }
    } catch (err: any) {
      setSimulationAlert({ type: 'error', message: err.message || 'Error creating node' });
    }
  };

  const getNodeTypeBadge = (type: NodeType) => {
    switch (type) {
      case 'COMMAND':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'RELAY':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'RESPONDER':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'FIELD':
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
    }
  };

  const getPacketStatusBadge = (status: string) => {
    switch (status) {
      case 'ACKNOWLEDGED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'DELIVERED':
        return 'bg-blue-950/80 text-blue-300 border-blue-800';
      case 'IN_TRANSIT':
      case 'QUEUED':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'TTL_EXPIRED':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      case 'DUPLICATE_DROPPED':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'DROPPED':
      default:
        return 'bg-red-950/80 text-red-300 border-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Offline Mesh Network Simulation
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              SIMULATION MODE ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Multi-hop decentralized packet routing, TTL decrementing, duplicate suppression, and virtual ACK propagation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAdmin && (
            <button
              onClick={handleResetSimulation}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-900/60 rounded text-xs font-mono transition-colors cursor-pointer"
              title="Reset simulated packet history (Keeps accounts, incidents, and resources intact)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset History</span>
            </button>
          )}

          <button
            onClick={fetchAllData}
            type="button"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Mandatory Regulatory & Simulation Disclosure Banner */}
      <div className="p-4 bg-slate-900/90 border border-amber-900/50 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-slate-200 font-mono uppercase flex items-center gap-2">
            <span>Hardware & Indian Regulatory Compliance Disclosure</span>
            <span className="text-[10px] font-normal text-amber-400 font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800">
              100% Offline Simulation
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed font-sans">
            No physical LoRa or Meshtastic hardware transceiver is currently transmitting. All packet propagation, RF attenuation, hop counts, latencies, and node links operate purely within SentinelGrid's local deterministic virtual mesh engine. Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase. Operates with ₹0 cloud expenditure.
          </p>
        </div>
      </div>

      {/* Simulation Feedback Alert */}
      {simulationAlert && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            simulationAlert.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : simulationAlert.type === 'warning'
              ? 'bg-amber-950/60 border-amber-800 text-amber-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {simulationAlert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {simulationAlert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {simulationAlert.type === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{simulationAlert.message}</span>
          </div>
          <button
            onClick={() => setSimulationAlert(null)}
            className="text-slate-400 hover:text-slate-200 font-mono text-[11px] ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6 Real Derived Simulation Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Packet Delivery Ratio */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Delivery Ratio</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 truncate">
            {metrics?.packetDeliveryRate ?? 'No simulation data'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {metrics?.totalDelivered ?? 0} / {metrics?.totalTransmitted ?? 0} packets
          </div>
        </div>

        {/* Packet Loss Rate */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Packet Loss</span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 truncate">
            {metrics?.packetLossRate ?? 'No simulation data'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {metrics?.totalDropped ?? 0} dropped / expired
          </div>
        </div>

        {/* Average Hop Count */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-blue-400" />
            <span>Average Hops</span>
          </div>
          <div className="text-lg font-bold font-mono text-blue-400 truncate">
            {metrics?.averageHopCount ?? 'No simulation data'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Max TTL: {config?.initialTtl ?? 7} hops
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Avg Latency</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 truncate">
            {metrics?.averageLatencyMs ?? 'No simulation data'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Per-hop: {config?.minimumLatencyMs}-{config?.maximumLatencyMs}ms
          </div>
        </div>

        {/* Duplicate Rate */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>Duplicate Rate</span>
          </div>
          <div className="text-lg font-bold font-mono text-purple-400 truncate">
            {metrics?.duplicateRate ?? 'No simulation data'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {metrics?.totalDuplicates ?? 0} duplicates dropped
          </div>
        </div>

        {/* Active Nodes */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Active Nodes</span>
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {metrics?.activeNodeCount ?? 0} / {metrics?.totalNodeCount ?? 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Mesh stations online
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('topology')}
          className={`px-4 py-2 font-mono text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'topology'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Mesh Topology ({nodes.length} Nodes)</span>
        </button>

        <button
          onClick={() => setActiveTab('packets')}
          className={`px-4 py-2 font-mono text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'packets'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Packet Transmissions ({packets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 font-mono text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Telemetry Event Log ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-mono text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Simulation Parameters</span>
        </button>
      </div>

      {/* TAB 1: TOPOLOGY & TRANSMISSION CONSOLE */}
      {activeTab === 'topology' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Topology Grid & Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div>
                  <h2 className="text-sm font-bold font-mono text-slate-200 uppercase">
                    Virtual Mesh Stations
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Click "Power" to toggle node state and simulate network partition or repeater failure
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canSimulate && (
                    <button
                      onClick={() => setIsAddNodeOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add Station</span>
                    </button>
                  )}
                  {canAdmin && (
                    <button
                      onClick={handleResetTopology}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
                      title="Reset nodes to default 6-node topology"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Topology</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Node Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nodes.map(node => {
                  const isOnline = node.status === 'ONLINE';
                  const isPathTraversed = selectedPacket?.path?.includes(node.nodeId);
                  const isSource = selectedPacket?.sourceNodeId === node.nodeId;
                  const isDest = selectedPacket?.destinationNodeId === node.nodeId;

                  return (
                    <div
                      key={node.nodeId}
                      className={`p-3.5 rounded-lg border transition-all ${
                        !isOnline
                          ? 'bg-slate-950/60 border-slate-800/80 opacity-60'
                          : isPathTraversed
                          ? 'bg-slate-900 border-emerald-500/80 shadow-sm shadow-emerald-950/40'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-100">
                              {node.nodeId}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getNodeTypeBadge(node.nodeType)}`}>
                              {node.nodeType}
                            </span>
                            {isSource && (
                              <span className="text-[9px] font-mono px-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                                SOURCE
                              </span>
                            )}
                            {isDest && (
                              <span className="text-[9px] font-mono px-1 rounded bg-purple-900/60 text-purple-300 border border-purple-700">
                                DEST
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-300 font-medium">
                            {node.nodeName}
                          </div>
                        </div>

                        {/* Power Toggle Button */}
                        <button
                          onClick={() => handleToggleNodeStatus(node)}
                          disabled={!canSimulate}
                          type="button"
                          className={`p-1.5 rounded border transition-colors cursor-pointer ${
                            isOnline
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-emerald-950/60 hover:text-emerald-400 hover:border-emerald-800'
                          }`}
                          title={isOnline ? 'Click to toggle OFFLINE (Simulate node drop)' : 'Click to toggle ONLINE'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Telemetry row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Battery className={`w-3.5 h-3.5 ${node.batteryLevel < 30 ? 'text-rose-400' : 'text-emerald-400'}`} />
                          <span>{node.batteryLevel}% Battery</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Signal className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{node.signalQuality}% Signal</span>
                        </div>
                      </div>

                      {/* Neighbor Links */}
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        <span className="text-slate-500">Neighbors: </span>
                        {node.neighbors && node.neighbors.length > 0 ? (
                          node.neighbors.map((nbr, idx) => (
                            <span
                              key={nbr}
                              className={`inline-block mr-1 px-1 py-0.2 rounded ${
                                nodes.find(n => n.nodeId === nbr)?.status === 'ONLINE'
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-rose-950/40 text-rose-400 line-through'
                              }`}
                            >
                              {nbr}{idx < node.neighbors.length - 1 ? '' : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-rose-400">Isolated (No links)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Packet Path Visualization Strip */}
            {selectedPacket && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <div className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <span>Packet Hop Path Trace: {selectedPacket.packetId}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getPacketStatusBadge(selectedPacket.status)}`}>
                    {selectedPacket.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono py-2">
                  {selectedPacket.path && selectedPacket.path.map((stepNodeId, idx) => (
                    <React.Fragment key={`${stepNodeId}-${idx}`}>
                      <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-[10px]">#{idx}</span>
                        <span className="font-bold text-emerald-400">{stepNodeId}</span>
                      </div>
                      {idx < selectedPacket.path.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="mt-2 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                  <div>Hops: <span className="text-slate-200">{selectedPacket.hopCount}</span></div>
                  <div>Remaining TTL: <span className="text-slate-200">{selectedPacket.ttl} / {selectedPacket.initialTtl}</span></div>
                  <div>Latency: <span className="text-slate-200">{selectedPacket.latencyMs || 0} ms</span></div>
                  <div>Roundtrip ACK: <span className="text-slate-200">{selectedPacket.ackReceived ? `${selectedPacket.totalLatencyMs} ms` : 'None'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Simulation Transmitter & Broadcast Tools */}
          <div className="space-y-4">
            {/* Direct Packet Transmitter */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase">
                  Transmit Mesh Packet
                </h3>
              </div>

              <form onSubmit={handleRunSimulation} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Source Station</label>
                    <select
                      value={sourceNodeId}
                      onChange={e => setSourceNodeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {nodes.map(n => (
                        <option key={n.nodeId} value={n.nodeId}>
                          {n.nodeId} ({n.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Destination</label>
                    <select
                      value={destNodeId}
                      onChange={e => setDestNodeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {nodes.map(n => (
                        <option key={n.nodeId} value={n.nodeId}>
                          {n.nodeId} ({n.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Message Type</label>
                    <select
                      value={messageType}
                      onChange={e => setMessageType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="INCIDENT_REPORT">INCIDENT_REPORT (Emergency alert)</option>
                      <option value="STATUS_UPDATE">STATUS_UPDATE (Field telemetry)</option>
                      <option value="RESOURCE_REQUEST">RESOURCE_REQUEST (Logistics)</option>
                      <option value="EMERGENCY_BROADCAST">EMERGENCY_BROADCAST (Priority)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Packet ID (Optional)</label>
                    <input
                      type="text"
                      value={customPacketId}
                      onChange={e => setCustomPacketId(e.target.value)}
                      placeholder="Auto-generated or custom"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Payload Content / Summary</label>
                  <textarea
                    rows={2}
                    value={packetPayloadText}
                    onChange={e => setPacketPayloadText(e.target.value)}
                    placeholder="Enter message text or telemetry report..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Initial TTL (Hops)</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={customTtl}
                      onChange={e => setCustomTtl(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestAck}
                        onChange={e => setRequestAck(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                      />
                      <span className="text-[11px] font-mono text-slate-300">Request Virtual ACK</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSimulating || !canSimulate}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold font-mono text-xs rounded transition-colors cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>{isSimulating ? 'Propagating Hops...' : 'Transmit via Simulated Mesh'}</span>
                </button>
              </form>
            </div>

            {/* Quick Incident Broadcast Tool */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase">
                  Broadcast Real Incident
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mb-3">
                Encapsulate an existing incident record into a compact mesh payload and route to Command.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Select Incident</label>
                  <select
                    value={selectedIncidentId}
                    onChange={e => setSelectedIncidentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Incident --</option>
                    {incidents.map(inc => (
                      <option key={inc.id} value={inc.id}>
                        {inc.incidentNumber} - {inc.title.substring(0, 30)} ({inc.severity})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleBroadcastIncident}
                  disabled={!selectedIncidentId || isSimulating || !canSimulate}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-mono text-xs rounded transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send Incident via Mesh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PACKET TRANSMISSION HISTORY */}
      {activeTab === 'packets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase">
                Simulated Packet Transmissions
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Click any packet record to inspect headers, payload, hop path, and roundtrip ACK latency
              </p>
            </div>
          </div>

          {packets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No simulated packets recorded yet. Use the Transmission Console to dispatch test packets.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">Packet ID</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Route</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Hops</th>
                    <th className="pb-2">TTL</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2">ACK</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {packets.map(pkt => (
                    <tr
                      key={pkt.packetId}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        selectedPacket?.packetId === pkt.packetId ? 'bg-slate-800/80' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold text-slate-200">{pkt.packetId}</td>
                      <td className="py-2.5 text-slate-400">{pkt.messageType}</td>
                      <td className="py-2.5 text-slate-300">
                        {pkt.sourceNodeId} → {pkt.destinationNodeId}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${getPacketStatusBadge(pkt.status)}`}>
                          {pkt.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-300">{pkt.hopCount}</td>
                      <td className="py-2.5 text-slate-400">{pkt.ttl} / {pkt.initialTtl}</td>
                      <td className="py-2.5 text-slate-300">{pkt.latencyMs ? `${pkt.latencyMs}ms` : '—'}</td>
                      <td className="py-2.5">
                        {pkt.ackReceived ? (
                          <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{pkt.totalLatencyMs}ms</span>
                          </span>
                        ) : pkt.ackRequested ? (
                          <span className="text-slate-500 text-[10px]">Pending</span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">N/A</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedPacket(pkt);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TELEMETRY EVENT LOG */}
      {activeTab === 'events' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase">
                Simulated Mesh Telemetry Events
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Granular step-by-step hop events, duplicate packet drops, and RF loss events
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No telemetry events recorded yet. Run a packet simulation to generate event streams.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Event Type</th>
                    <th className="pb-2">Node</th>
                    <th className="pb-2">Packet ID</th>
                    <th className="pb-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map(evt => (
                    <tr key={evt.eventId} className="hover:bg-slate-800/40">
                      <td className="py-2 text-slate-500 text-[10px] whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] border ${
                          evt.eventType === 'PACKET_DELIVERED' || evt.eventType === 'ACK_RECEIVED'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : evt.eventType === 'PACKET_FORWARDED' || evt.eventType === 'ACK_FORWARDED'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                            : evt.eventType === 'DUPLICATE_DROPPED'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : evt.eventType === 'PACKET_DROPPED' || evt.eventType === 'TTL_EXPIRED'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="py-2 font-bold text-slate-200">{evt.nodeId}</td>
                      <td className="py-2 text-slate-400">{evt.packetId}</td>
                      <td className="py-2 text-slate-300">{evt.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SIMULATION CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl">
          <div className="pb-3 border-b border-slate-800 mb-4">
            <h2 className="text-sm font-bold font-mono text-slate-200 uppercase">
              Simulation Parameters
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Adjust packet loss probability, simulated RF propagation latency, and flooding TTL constraints
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Simulated Forward Packet Loss Rate: <span className="text-emerald-400 font-bold">{Math.round((config?.packetLossRate || 0) * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.30"
                step="0.05"
                disabled={!canAdmin}
                value={config?.packetLossRate ?? 0.05}
                onChange={e => handleUpdateConfig({ packetLossRate: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0% (Ideal Link)</span>
                <span>10% (Moderate Noise)</span>
                <span>30% (Severe Terrain Loss)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Simulated ACK Return Loss Rate: <span className="text-emerald-400 font-bold">{Math.round((config?.ackPacketLossRate || 0) * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.30"
                step="0.05"
                disabled={!canAdmin}
                value={config?.ackPacketLossRate ?? 0.0}
                onChange={e => handleUpdateConfig({ ackPacketLossRate: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0% (Reliable ACK)</span>
                <span>10% (Occasional ACK Loss)</span>
                <span>30% (High Asymmetric Loss)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Min Hop Latency (ms)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  disabled={!canAdmin}
                  value={config?.minimumLatencyMs ?? 80}
                  onChange={e => handleUpdateConfig({ minimumLatencyMs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Max Hop Latency (ms)</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  disabled={!canAdmin}
                  value={config?.maximumLatencyMs ?? 240}
                  onChange={e => handleUpdateConfig({ maximumLatencyMs: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Default Packet TTL (Hops)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  disabled={!canAdmin}
                  value={config?.initialTtl ?? 7}
                  onChange={e => handleUpdateConfig({ initialTtl: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Max Hop Limit (Ceiling)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  disabled={!canAdmin}
                  value={config?.maxHops ?? 15}
                  onChange={e => handleUpdateConfig({ maxHops: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canAdmin}
                  checked={config?.autoAck ?? true}
                  onChange={e => handleUpdateConfig({ autoAck: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs font-mono text-slate-300">Enable Automatic Destination ACK Return</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canAdmin}
                  checked={config?.deterministicMode ?? false}
                  onChange={e => handleUpdateConfig({ deterministicMode: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
                <span className="text-xs font-mono text-slate-300">Deterministic Mode (Fixed Latency & Seeded RNG for Testing)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ADD STATION MODAL */}
      {isAddNodeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-slate-100 uppercase mb-4">
              Add Simulated Mesh Station
            </h3>
            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Node ID (e.g. RELAY-03)</label>
                <input
                  type="text"
                  required
                  value={newNodeId}
                  onChange={e => setNewNodeId(e.target.value)}
                  placeholder="RELAY-03"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Station Name</label>
                <input
                  type="text"
                  required
                  value={newNodeName}
                  onChange={e => setNewNodeName(e.target.value)}
                  placeholder="South Hill Repeater"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Node Role</label>
                <select
                  value={newNodeType}
                  onChange={e => setNewNodeType(e.target.value as NodeType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="COMMAND">COMMAND (Operations Center)</option>
                  <option value="RELAY">RELAY (Repeater)</option>
                  <option value="RESPONDER">RESPONDER (Mobile Unit)</option>
                  <option value="FIELD">FIELD (Sensor / Outpost)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Connect to Neighbors</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-950 rounded border border-slate-800">
                  {nodes.map(n => (
                    <label key={n.nodeId} className="inline-flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newNodeNeighbors.includes(n.nodeId)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewNodeNeighbors([...newNodeNeighbors, n.nodeId]);
                          } else {
                            setNewNodeNeighbors(newNodeNeighbors.filter(x => x !== n.nodeId));
                          }
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                      />
                      <span>{n.nodeId}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNodeOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs font-mono cursor-pointer"
                >
                  Save Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
