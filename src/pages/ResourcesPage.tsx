import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Activity,
  Trash2,
  Database,
  Sparkles,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Resource, ResourceType, ResourceAvailability, ResourceStatus } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { ResourceMatchingPanel } from '../components/resources/ResourceMatchingPanel.tsx';

interface ResourcesPageProps {
  token: string | null;
  onOpenAddModal: () => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ token, onOpenAddModal }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'MATCHING'>('INVENTORY');
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const canManageResources = ['ADMIN', 'DISPATCHER', 'OPERATOR'].includes(user?.role || '');
  const canManageDemo = user?.role === 'ADMIN';

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await fetch(`/api/resources?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to load resources', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedType, selectedStatus, token]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/resources/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, availability: newStatus })
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to update resource status', err);
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const res = await fetch(`/api/resources/${id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to release resource', err);
    }
  };

  const handlePopulateDemo = async () => {
    try {
      const res = await fetch('/api/resources/demo/populate', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to populate demo resources', err);
    }
  };

  const handleClearDemo = async () => {
    try {
      const res = await fetch('/api/resources/demo/clear', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to clear demo resources', err);
    }
  };

  const hasDemoItems = resources.some(r => r.isDemoData);

  const totalCount = resources.length;
  const availableCount = resources.filter(r => (r.status || r.availability) === 'AVAILABLE').length;
  const assignedCount = resources.filter(r => (r.status || r.availability) === 'ASSIGNED' || r.availability === 'DEPLOYED').length;
  const unavailableCount = resources.filter(r => (r.status || r.availability) === 'UNAVAILABLE' || r.availability === 'MAINTENANCE' || r.availability === 'OFFLINE').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Emergency Resource Staging
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {resources.length} units listed
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Fleet, rescue teams, HAZMAT units, field clinics, and emergency supply assets
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canManageDemo && (
            hasDemoItems ? (
              <button
                onClick={handleClearDemo}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 rounded text-xs font-mono transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Demo Resources</span>
              </button>
            ) : (
              <button
                onClick={handlePopulateDemo}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Load Test Demo Units</span>
              </button>
            )
          )}

          <button
            onClick={fetchResources}
            type="button"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canManageResources && (
            <button
              onClick={onOpenAddModal}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'INVENTORY'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Resource Inventory ({totalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('MATCHING')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
            activeTab === 'MATCHING'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Resource Matching & Allocation (Phase 5)</span>
        </button>
      </div>

      {activeTab === 'MATCHING' ? (
        <ResourceMatchingPanel
          token={token}
          userRole={user?.role}
          onAllocationChanged={fetchResources}
        />
      ) : (
        <>
          {/* Status Counts Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-2xs font-mono text-slate-400 uppercase">Available Units</span>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">{availableCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-2xs font-mono text-slate-400 uppercase">Assigned / Deployed</span>
              <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">{assignedCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-2xs font-mono text-slate-400 uppercase">Unavailable / Maint</span>
              <div className="text-lg font-mono font-bold text-red-400 mt-0.5">{unavailableCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-2xs font-mono text-slate-400 uppercase">Total Staged Assets</span>
              <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">{totalCount}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter resources by code, name, staging location, or capabilities..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <button
                onClick={fetchResources}
                type="button"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition-colors cursor-pointer"
              >
                Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <Filter className="w-3.5 h-3.5" />
                <span>FILTERS:</span>
              </div>

              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">Type: All</option>
                <option value="AMBULANCE">Ambulance</option>
                <option value="MEDICAL_TEAM">Medical Team</option>
                <option value="FIRE_UNIT">Fire Unit</option>
                <option value="RESCUE_TEAM">Rescue Team</option>
                <option value="HAZMAT_UNIT">HAZMAT Unit</option>
                <option value="SEARCH_TEAM">Search & Recon</option>
                <option value="EVACUATION_UNIT">Evacuation Unit</option>
                <option value="SHELTER">Emergency Shelter</option>
                <option value="SUPPLY_UNIT">Supply Transport</option>
                <option value="EMERGENCY_EQUIPMENT">Emergency Equipment</option>
                <option value="OTHER">Other Unit</option>
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">Status: All</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="EN_ROUTE">En Route</option>
                <option value="ON_SCENE">On Scene</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>

              {(selectedType !== 'ALL' || selectedStatus !== 'ALL' || search) && (
                <button
                  onClick={() => {
                    setSelectedType('ALL');
                    setSelectedStatus('ALL');
                    setSearch('');
                  }}
                  type="button"
                  className="text-xs text-emerald-400 hover:underline font-mono"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Table / Empty state */}
          {resources.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No Emergency Resources Registered"
              description="There are currently no registered emergency response assets, medical teams, shelters, or ambulances logged in the local database."
              actionText="Register Resource"
              onAction={onOpenAddModal}
              secondaryActionText="Load Clearly Labeled Demo Units"
              onSecondaryAction={handlePopulateDemo}
              badge="Zero Staged Units"
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Code / Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Capabilities</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Staging Location</th>
                      <th className="py-3 px-4">Capacity / Assignment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {resources.map(resource => {
                      const resStatus = resource.status || (resource.availability as ResourceStatus) || 'AVAILABLE';
                      const isAssigned = resStatus === 'ASSIGNED' || resource.availability === 'DEPLOYED';

                      return (
                        <tr key={resource.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                                {resource.resourceCode || `RES-${resource.id.slice(-4).toUpperCase()}`}
                              </span>
                              <span>{resource.name}</span>
                            </div>
                            {resource.isDemoData && (
                              <span className="block text-[9px] font-mono text-amber-400 uppercase font-normal mt-0.5">
                                [DEMO UNIT]
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                              {resource.type.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center flex-wrap gap-1">
                              {(resource.capabilities || []).map(cap => (
                                <span
                                  key={cap}
                                  className="px-1.5 py-0.5 text-2xs font-mono bg-slate-950 text-emerald-400 rounded border border-slate-800"
                                >
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge type="availability" value={resStatus} />
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{resource.location}</span>
                            </div>
                            {resource.latitude != null && resource.longitude != null && (
                              <div className="text-2xs font-mono text-slate-500 pl-5">
                                ({resource.latitude.toFixed(4)}, {resource.longitude.toFixed(4)})
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 max-w-xs">
                            <div>{resource.capacity || '—'}</div>
                            {resource.assignedIncidentNumber && (
                              <div className="text-2xs font-mono text-blue-400 font-semibold mt-0.5">
                                Assigned to Inc #{resource.assignedIncidentNumber}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            {canManageResources ? (
                              <div className="flex items-center justify-end gap-2">
                                {isAssigned && (
                                  <button
                                    onClick={() => handleRelease(resource.id)}
                                    type="button"
                                    className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-200 rounded text-2xs font-mono border border-red-800 transition-colors cursor-pointer"
                                  >
                                    Release
                                  </button>
                                )}
                                <select
                                  value={resStatus}
                                  onChange={e => handleStatusChange(resource.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                                >
                                  <option value="AVAILABLE">Available</option>
                                  <option value="ASSIGNED">Assigned</option>
                                  <option value="EN_ROUTE">En Route</option>
                                  <option value="ON_SCENE">On Scene</option>
                                  <option value="UNAVAILABLE">Unavailable</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px] italic">
                                Read-only
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

