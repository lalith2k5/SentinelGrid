import React, { useState, useEffect } from 'react';
import {
  Settings,
  User as UserIcon,
  Shield,
  HardDrive,
  Cpu,
  Radio,
  CheckCircle2,
  Lock,
  RefreshCw,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { UserRole } from '../types/index.ts';

export const SettingsPage: React.FC = () => {
  const { user, token } = useAuth();
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userAdminMsg, setUserAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Failed to load settings status', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'ADMIN' || !token) return;
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users list', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!token) return;
    setUserAdminMsg(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role');
      }
      setUserAdminMsg({ type: 'success', text: `Role updated to ${newRole} for ${data.user.name}` });
      fetchUsers();
    } catch (err: any) {
      setUserAdminMsg({ type: 'error', text: err.message || 'Failed to update role' });
    }
  };

  useEffect(() => {
    fetchStatus();
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [user?.role, token]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-wide text-slate-100 uppercase">
            System Settings & Node Diagnostics
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Local instance configuration, operator profile, and air-gapped guarantees
          </p>
        </div>

        <button
          onClick={fetchStatus}
          type="button"
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Prominent Visible System Mode Indicator Required by Spec */}
      <div className="p-5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-900/60 border border-emerald-700/80 flex items-center justify-center text-emerald-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider">
              Operating Mode
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 tracking-wide">
              OFFLINE-FIRST
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Zero Cloud Dependency Enforced
          </span>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Operator Profile
            </h2>
          </div>
          {user && <StatusBadge type="role" value={user.role} />}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Operator Name</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.name || 'Local Administrator'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Email / Identifier</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.email || 'operator@sentinelgrid.local'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Badge / Callsign</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.badgeNumber || 'SG-FIELD-01'}
            </div>
          </div>

          <div>
            <label className="text-slate-500 uppercase block text-[10px] mb-1">Assigned Department</label>
            <div className="text-slate-200 bg-slate-950 px-3 py-2 rounded border border-slate-800">
              {user?.department || 'Incident Management Command'}
            </div>
          </div>
        </div>
      </div>

      {/* Admin-only User & Role Administration Panel */}
      {user?.role === 'ADMIN' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
                User & Role Administration (Incident Commander Access)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80">
              {allUsers.length} Registered Personnel
            </span>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              New accounts register as OPERATOR by default. As an Administrator, you can assign elevated tactical roles below.
            </p>

            {userAdminMsg && (
              <div
                className={`p-3 rounded text-xs font-mono border ${
                  userAdminMsg.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border-red-800 text-red-300'
                }`}
              >
                {userAdminMsg.text}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Name & Email</th>
                    <th className="py-2.5 px-3">Badge / Dept</th>
                    <th className="py-2.5 px-3">Current Role</th>
                    <th className="py-2.5 px-3 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        <div>{u.badgeNumber || '—'}</div>
                        <div className="text-slate-500 text-[10px]">{u.department || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge type="role" value={u.role} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <select
                          value={u.role}
                          disabled={u.id === user.id}
                          onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 focus:outline-hidden focus:border-purple-500 disabled:opacity-40 cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="DISPATCHER">DISPATCHER</option>
                          <option value="RESPONDER">RESPONDER</option>
                          <option value="OPERATOR">OPERATOR</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Local Database & Persistence Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
            Local Database Engine & Offline Storage
          </h2>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Engine Type</div>
              <div className="text-xs text-emerald-400 font-mono font-semibold mt-0.5">
                Local File Atomic JSON
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Zero cloud database required</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">File Location</div>
              <div className="text-xs text-slate-300 font-mono truncate mt-0.5" title="./data/sentinelgrid.json">
                ./data/sentinelgrid.json
              </div>
              <div className="text-[10px] text-slate-500 mt-1">On-disk durable storage</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Total Entities Logged</div>
              <div className="text-xs text-slate-300 font-mono font-semibold mt-0.5">
                {(dbStatus?.counts?.activeIncidents ?? 0) + (dbStatus?.counts?.availableResources ?? 0)} records
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Incidents & staged assets</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center gap-2 text-slate-400 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              The database schema provides extensible structural models for User, Incident, IncidentLocation, Resource, Responder, Message, MeshNode, KnowledgeDocument, and AuditLog.
            </span>
          </div>
        </div>
      </div>

      {/* AI Provider Architecture & Mac M2 Zero-Budget Commitment */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
            AI Provider Abstraction Layer
          </h2>
        </div>

        <div className="p-5 space-y-3 text-xs text-slate-400">
          <p className="leading-relaxed">
            SentinelGrid implements the <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">AIProvider</code> interface abstraction. In Phase 3, you can switch between a cloud model or a 100% free local model (via Ollama or llama.cpp directly on Apple Silicon Mac M2) without changing application business logic.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-xs font-mono font-semibold text-slate-200">LocalModelProvider</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Local Ollama / Apple Silicon M2 • Zero API costs • 100% offline
              </div>
              <div className="mt-2 text-[10px] font-mono text-emerald-400">Status: Phase 3 Completed (Local Heuristic Engine Active)</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded">
              <div className="text-xs font-mono font-semibold text-slate-200">GeminiProvider</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Optional cloud fallback when high-bandwidth internet connectivity is available
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-500">Status: Optional / Non-blocking</div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Information */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-slate-200 font-bold">SentinelGrid Operations Platform (Phases 1–7)</span> • Built with React 19, TypeScript, Vite & Express
        </div>
        <div className="text-slate-500">
          Mac M2 / Linux Standalone Ready
        </div>
      </div>
    </div>
  );
};
