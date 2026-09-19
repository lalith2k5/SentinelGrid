import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NavTab } from './types/index.ts';
import { Header } from './components/common/Header.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { IncidentsPage } from './pages/IncidentsPage.tsx';
import { DispatchPage } from './pages/DispatchPage.tsx';
import { MeshNetworkPage } from './pages/MeshNetworkPage.tsx';
import { ResourcesPage } from './pages/ResourcesPage.tsx';
import { MapPage } from './pages/MapPage.tsx';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { CreateIncidentModal } from './components/incidents/CreateIncidentModal.tsx';
import { CreateResourceModal } from './components/resources/CreateResourceModal.tsx';
import { Shield } from 'lucide-react';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, token } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-400 mb-3 animate-pulse">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs font-mono tracking-widest uppercase text-slate-400">
          Initializing SentinelGrid Node...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-900 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => setActiveTab(tab)}
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage
                key={`dash-${refreshTrigger}`}
                onNavigate={tab => setActiveTab(tab)}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                token={token}
              />
            )}

            {activeTab === 'incidents' && (
              <IncidentsPage
                key={`inc-${refreshTrigger}`}
                token={token}
                onOpenReportModal={() => setIsReportModalOpen(true)}
              />
            )}

            {activeTab === 'dispatch' && <DispatchPage />}

            {activeTab === 'mesh' && <MeshNetworkPage />}

            {activeTab === 'resources' && (
              <ResourcesPage
                key={`res-${refreshTrigger}`}
                token={token}
                onOpenAddModal={() => setIsAddResourceModalOpen(true)}
              />
            )}

            {activeTab === 'map' && <MapPage />}

            {activeTab === 'knowledge' && <KnowledgeBasePage />}

            {activeTab === 'analytics' && <AnalyticsPage />}

            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Reusable Modals */}
      <CreateIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        token={token}
      />

      <CreateResourceModal
        isOpen={isAddResourceModalOpen}
        onClose={() => setIsAddResourceModalOpen(false)}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        token={token}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
