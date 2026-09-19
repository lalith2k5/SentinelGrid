import React, { useState, useEffect } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Activity,
  Trash2,
  Database
} from 'lucide-react';
import { Resource, ResourceType, ResourceAvailability } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';

interface ResourcesPageProps {
  token: string | null;
  onOpenAddModal: () => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ token, onOpenAddModal }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('ALL');

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedAvailability !== 'ALL') params.append('availability', selectedAvailability);

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
  }, [selectedType, selectedAvailability, token]);

  const handleStatusChange = async (id: string, newAvailability: ResourceAvailability) => {
    try {
      const res = await fetch(`/api/resources/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ availability: newAvailability })
      });
      if (res.ok) {
        fetchResources();
      }
    } catch (err) {
      console.error('Failed to update resource status', err);
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
            Fleet, rescue teams, field clinics, and emergency shelters
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {hasDemoItems ? (
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
          )}

          <button
            onClick={fetchResources}
            type="button"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenAddModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Resource</span>
          </button>
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
              placeholder="Filter resources by callsign, staging location, or capabilities..."
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
            <option value="RESCUE_TEAM">Rescue Team</option>
            <option value="MEDICAL_TEAM">Medical Team</option>
            <option value="SHELTER">Shelter</option>
            <option value="EMERGENCY_EQUIPMENT">Emergency Equipment</option>
          </select>

          <select
            value={selectedAvailability}
            onChange={e => setSelectedAvailability(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Availability: All</option>
            <option value="AVAILABLE">Available</option>
            <option value="DEPLOYED">Deployed</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OFFLINE">Offline</option>
          </select>

          {(selectedType !== 'ALL' || selectedAvailability !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedAvailability('ALL');
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
                  <th className="py-3 px-4">Resource Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Capacity / Specs</th>
                  <th className="py-3 px-4">Status Details</th>
                  <th className="py-3 px-4 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {resources.map(resource => (
                  <tr key={resource.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-100 whitespace-nowrap">
                      {resource.name}
                      {resource.isDemoData && (
                        <span className="block text-[9px] font-mono text-amber-400 uppercase font-normal">
                          [DEMO UNIT]
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {resource.type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge type="availability" value={resource.availability} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{resource.location}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {resource.capacity || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-sm">
                      {resource.statusDetails || 'Standard operational readiness'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <select
                        value={resource.availability}
                        onChange={e => handleStatusChange(resource.id, e.target.value as ResourceAvailability)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="DEPLOYED">Deployed</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="OFFLINE">Offline</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
