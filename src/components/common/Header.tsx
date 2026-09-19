import React from 'react';
import { Shield, Radio, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatusBadge } from './StatusBadge.tsx';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Brand & Mode */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded border border-slate-800"
          aria-label="Toggle navigation"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-950/80 border border-emerald-700/70 flex items-center justify-center text-emerald-400 shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base tracking-wider text-slate-100 uppercase font-mono">
                SentinelGrid
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v1.0-FND
              </span>
            </div>
          </div>
        </div>

        {/* Visible system mode indicator: OFFLINE-FIRST */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>OFFLINE-FIRST</span>
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {user && (
          <div className="flex items-center gap-2 md:gap-3 bg-slate-900/80 border border-slate-800/80 py-1.5 px-3 rounded">
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200 tracking-wide">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span>{user.email}</span>
                {user.department && <span className="text-slate-500">• {user.department}</span>}
              </div>
            </div>
            <StatusBadge type="role" value={user.role} />
          </div>
        )}

        <button
          onClick={() => logout()}
          type="button"
          title="Sign out of local SentinelGrid session"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded border border-slate-800 hover:border-red-900/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
