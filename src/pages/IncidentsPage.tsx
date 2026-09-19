import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  Clock,
  MapPin,
  ShieldAlert,
  Trash2,
  Database
} from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, IncidentVerification } from '../types/index.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';

interface IncidentsPageProps {
  token: string | null;
  onOpenReportModal: () => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ token, onOpenReportModal }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<string>('ALL');

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);
      if (selectedVerification !== 'ALL') params.append('verificationStatus', selectedVerification);

      const res = await fetch(`/api/incidents?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [selectedStatus, selectedSeverity, selectedVerification, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  const handlePopulateDemo = async () => {
    try {
      const res = await fetch('/api/incidents/demo/populate', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to load demo incidents', err);
    }
  };

  const handleClearDemo = async () => {
    try {
      const res = await fetch('/api/incidents/demo/clear', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to clear demo incidents', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: IncidentStatus) => {
    try {
      const res = await fetch(`/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to update incident status', err);
    }
  };

  const hasDemoItems = incidents.some(i => i.isDemoData);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
              Incident Management Log
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {incidents.length} recorded
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Operational triage and tracking log • Local persistence
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
              <span>Clear Demo Data</span>
            </button>
          ) : (
            <button
              onClick={handlePopulateDemo}
              type="button"
              title="Populate test emergency records clearly labeled as [DEMO/TEST DATA]"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Test Demo Data</span>
            </button>
          )}

          <button
            onClick={fetchIncidents}
            type="button"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenReportModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search incidents by number, title, description, or landmark..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition-colors cursor-pointer"
          >
            Filter Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span>FILTERS:</span>
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Severity: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFORMATIONAL">Informational</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Status: All</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="CONTAINED">Contained</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Verification Filter */}
          <select
            value={selectedVerification}
            onChange={e => setSelectedVerification(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-hidden focus:border-emerald-500"
          >
            <option value="ALL">Verification: All</option>
            <option value="OFFICIAL_VERIFIED">Official Verified</option>
            <option value="COMMUNITY_REPORTED">Community Reported</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="FALSE_ALARM">False Alarm</option>
          </select>

          {(selectedSeverity !== 'ALL' || selectedStatus !== 'ALL' || selectedVerification !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                setSelectedStatus('ALL');
                setSelectedVerification('ALL');
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

      {/* Incidents Table / List */}
      {incidents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Emergency Incidents Active"
          description="The local incident registry currently has no active or reported emergencies matching your filter criteria. The operational area is clear."
          actionText="Report New Incident"
          onAction={onOpenReportModal}
          secondaryActionText="Load Clearly Labeled Demo Data"
          onSecondaryAction={handlePopulateDemo}
          badge="Zero Active Events"
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Location / Sector</th>
                  <th className="py-3 px-4">Created Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {incidents.map(incident => (
                  <tr key={incident.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                      {incident.incidentNumber}
                      {incident.isDemoData && (
                        <span className="block text-[9px] font-mono text-amber-400 uppercase font-normal">
                          [DEMO DATA]
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                      <div className="font-semibold text-slate-100 text-sm">{incident.title}</div>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {incident.description}
                      </p>
                      {incident.reportedByName && (
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Reported by: {incident.reportedByName}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge type="severity" value={incident.severity} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge type="status" value={incident.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge type="verification" value={incident.verificationStatus} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{incident.location?.address || 'Grid Sector Alpha'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {incident.location?.zone} • {incident.location?.gridSquare}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        {new Date(incident.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <select
                        value={incident.status}
                        onChange={e => handleStatusChange(incident.id, e.target.value as IncidentStatus)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="OPEN">Set Open</option>
                        <option value="INVESTIGATING">Set Investigating</option>
                        <option value="DISPATCHED">Set Dispatched</option>
                        <option value="CONTAINED">Set Contained</option>
                        <option value="RESOLVED">Set Resolved</option>
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
