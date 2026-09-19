import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Radio,
  Truck,
  MapPin,
  BookOpen,
  BarChart3,
  Settings,
  SendHorizontal
} from 'lucide-react';
import { NavTab } from '../../types/index.ts';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isComingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'dispatch', label: 'Dispatch', icon: SendHorizontal, badge: 'Phase 8', isComingSoon: true },
  { id: 'mesh', label: 'Mesh Network', icon: Radio, badge: 'Phase 2', isComingSoon: true },
  { id: 'resources', label: 'Resources', icon: Truck },
  { id: 'map', label: 'Map', icon: MapPin, badge: 'Phase 7', isComingSoon: true },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, badge: 'Phase 4', isComingSoon: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'Phase 10', isComingSoon: true },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Operations Console
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium tracking-wide transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                        item.isComingSoon
                          ? 'bg-slate-900 text-slate-500 border-slate-800'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom system status indicator */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between mb-1.5">
            <span>NETWORK STATE</span>
            <span className="text-emerald-400 font-semibold">AIR-GAPPED / LOCAL</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full rounded-full"></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 leading-tight">
            Operating in autonomous local node mode. Zero internet dependencies.
          </p>
        </div>
      </aside>
    </>
  );
};
