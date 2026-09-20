import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Plus,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  RefreshCw,
  Edit3,
  Trash2,
  Layers,
  Sparkles,
  Info,
  Building2,
  AlertOctagon,
  ListChecks,
  History,
  Archive,
  Eye,
  Sliders,
  Check,
  X
} from 'lucide-react';
import {
  KnowledgeDocument,
  KnowledgeCategory,
  KnowledgeStatus,
  RAGQueryResult,
  UserRole
} from '../../types/index.ts';

interface KnowledgeBaseViewProps {
  token: string | null;
  userRole?: UserRole | string;
  userName?: string;
  initialDocumentId?: string | null;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  token,
  userRole,
  userName,
  initialDocumentId
}) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number; activeCount: number }>>([]);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedHazard, setSelectedHazard] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Admin Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'SANDBOX' | 'VERSIONS'>('EXPLORE');

  // RAG Sandbox Testing State
  const [sandboxQuery, setSandboxQuery] = useState('Victim with severe arterial bleeding in thigh after building collapse');
  const [sandboxCategory, setSandboxCategory] = useState('TRAUMA_BLEEDING');
  const [sandboxSeverity, setSandboxSeverity] = useState('P1');
  const [sandboxHazards, setSandboxHazards] = useState<string[]>(['STRUCTURAL_COLLAPSE']);
  const [sandboxResult, setSandboxResult] = useState<RAGQueryResult | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<{
    id: string;
    title: string;
    category: string;
    version: string;
    source: string;
    sourceOrganization: string;
    summary: string;
    content: string;
    actionStepsText: string;
    safetyPrecautionsText: string;
    contraindicationsText: string;
    keywordsText: string;
    tagsText: string;
    hazardsText: string;
    status: KnowledgeStatus;
    priority: number;
  }>({
    id: '',
    title: '',
    category: 'MEDICAL_EMERGENCY',
    version: '1.0.0',
    source: 'Local Emergency SOP',
    sourceOrganization: 'Local Emergency Management Agency',
    summary: '',
    content: '',
    actionStepsText: '',
    safetyPrecautionsText: '',
    contraindicationsText: '',
    keywordsText: '',
    tagsText: '',
    hazardsText: '',
    status: 'ACTIVE',
    priority: 5
  });

  // Versioning Form State
  const [versionData, setVersionData] = useState({
    newVersion: '',
    changeLog: '',
    summary: '',
    actionStepsText: '',
    safetyPrecautionsText: '',
    contraindicationsText: '',
    content: ''
  });

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'DISPATCHER';

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedHazard !== 'ALL') params.append('hazard', selectedHazard);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const [docsRes, catsRes] = await Promise.all([
        fetch(`/api/knowledge?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch('/api/knowledge/categories', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);

        if (initialDocumentId && !selectedDoc) {
          const match = (data.documents || []).find((d: KnowledgeDocument) => d.id === initialDocumentId);
          if (match) setSelectedDoc(match);
        } else if (data.documents && data.documents.length > 0 && !selectedDoc) {
          setSelectedDoc(data.documents[0]);
        }
      }

      if (catsRes.ok) {
        const catData = await catsRes.json();
        setCategories(catData.categories || []);
      }
    } catch (err: any) {
      console.error('Failed to load knowledge documents', err);
      setError(err.message || 'Failed to fetch knowledge base.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [searchTerm, selectedCategory, selectedHazard, selectedStatus]);

  const handleRunSandbox = async () => {
    try {
      setIsSandboxRunning(true);
      setError(null);

      const res = await fetch('/api/knowledge/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query: sandboxQuery,
          category: sandboxCategory !== 'ALL' ? sandboxCategory : undefined,
          severity: sandboxSeverity,
          hazards: sandboxHazards
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to execute sandbox query');
      }

      const data = await res.json();
      setSandboxResult(data);
    } catch (err: any) {
      console.error('Sandbox query error', err);
      setError(err.message || 'Failed to execute RAG query in sandbox');
    } finally {
      setIsSandboxRunning(false);
    }
  };

  const handleToggleStatus = async (doc: KnowledgeDocument) => {
    if (!isAdmin) return;
    try {
      const nextStatus: KnowledgeStatus = doc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const res = await fetch(`/api/knowledge/${doc.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status');
      }

      const updated = await res.json();
      setSuccessMessage(`Document "${doc.title}" status changed to ${nextStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchDocuments();
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(updated.document);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      setError(null);
      const newDoc = {
        id: formData.id.trim().toUpperCase(),
        title: formData.title.trim(),
        category: formData.category,
        version: formData.version.trim() || '1.0.0',
        source: formData.source.trim(),
        sourceOrganization: formData.sourceOrganization.trim(),
        summary: formData.summary.trim(),
        content: formData.content.trim(),
        actionSteps: formData.actionStepsText.split('\n').map(s => s.trim()).filter(Boolean),
        safetyPrecautions: formData.safetyPrecautionsText.split('\n').map(s => s.trim()).filter(Boolean),
        contraindications: formData.contraindicationsText.split('\n').map(s => s.trim()).filter(Boolean),
        keywords: formData.keywordsText.split(',').map(s => s.trim()).filter(Boolean),
        tags: formData.tagsText.split(',').map(s => s.trim()).filter(Boolean),
        hazards: formData.hazardsText.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
        status: formData.status,
        priority: Number(formData.priority) || 5
      };

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newDoc)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create document');
      }

      const data = await res.json();
      setShowCreateModal(false);
      setSuccessMessage(`Knowledge document "${data.document.title}" registered successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchDocuments();
      setSelectedDoc(data.document);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePublishVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedDoc) return;
    try {
      setError(null);
      const res = await fetch(`/api/knowledge/${selectedDoc.id}/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          version: versionData.newVersion.trim(),
          changeLog: versionData.changeLog.trim(),
          updatedContent: {
            summary: versionData.summary.trim() || undefined,
            content: versionData.content.trim() || undefined,
            actionSteps: versionData.actionStepsText ? versionData.actionStepsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
            safetyPrecautions: versionData.safetyPrecautionsText ? versionData.safetyPrecautionsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
            contraindications: versionData.contraindicationsText ? versionData.contraindicationsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to publish new version');
      }

      const data = await res.json();
      setShowVersionModal(false);
      setSuccessMessage(`Version v${versionData.newVersion} published for "${selectedDoc.title}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchDocuments();
      setSelectedDoc(data.document);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openVersionModal = (doc: KnowledgeDocument) => {
    setSelectedDoc(doc);
    const parts = (doc.version || '1.0.0').split('.');
    const nextPatch = `${parts[0] || '1'}.${parts[1] || '0'}.${(Number(parts[2] || 0) + 1)}`;
    setVersionData({
      newVersion: nextPatch,
      changeLog: 'Updated guidance based on recent field validation.',
      summary: doc.summary,
      content: doc.content,
      actionStepsText: (doc.actionSteps || []).join('\n'),
      safetyPrecautionsText: (doc.safetyPrecautions || []).join('\n'),
      contraindicationsText: (doc.contraindications || []).join('\n')
    });
    setShowVersionModal(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans text-xs">
      {/* Top Banner / System Metadata */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/80 border border-blue-700/60 rounded-lg text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                Emergency Knowledge Base & Deterministic RAG
              </h1>
              <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded font-mono text-[10px]">
                Offline Core v1.0.0
              </span>
              <span className="px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-700/60 rounded font-mono text-[10px]">
                Zero-Cloud Local Engine
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Authoritative field emergency manuals, HazMat protocols, MCI triage guidelines, and deterministic evidence-backed retrieval.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  id: `EMERG-${Date.now().toString().slice(-4)}`,
                  title: '',
                  category: 'MEDICAL_EMERGENCY',
                  version: '1.0.0',
                  source: 'Local Disaster Management Standard',
                  sourceOrganization: 'Local Emergency Operations Center',
                  summary: '',
                  content: '',
                  actionStepsText: '',
                  safetyPrecautionsText: '',
                  contraindicationsText: '',
                  keywordsText: '',
                  tagsText: '',
                  hazardsText: '',
                  status: 'ACTIVE',
                  priority: 5
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Protocol</span>
            </button>
          )}

          <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('EXPLORE')}
              className={`px-3 py-1 rounded font-mono text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'EXPLORE' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Corpus Explorer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SANDBOX')}
              className={`px-3 py-1 rounded font-mono text-xs font-medium cursor-pointer transition-colors ${
                activeTab === 'SANDBOX' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RAG Sandbox
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-emerald-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: CORPUS EXPLORER */}
      {activeTab === 'EXPLORE' && (
        <div className="space-y-4">
          {/* Search & Multi-Criteria Filtering */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keywords, title, content..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-300 font-mono outline-none py-1.5 cursor-pointer"
              >
                <option value="ALL">All Categories ({categories.reduce((acc, c) => acc + c.count, 0)})</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category} className="bg-slate-900">
                    {c.category} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Hazard Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2">
              <AlertTriangle className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedHazard}
                onChange={(e) => setSelectedHazard(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-300 font-mono outline-none py-1.5 cursor-pointer"
              >
                <option value="ALL">All Hazard Profiles</option>
                <option value="FLOOD" className="bg-slate-900">Flood / Swiftwater</option>
                <option value="FIRE" className="bg-slate-900">Fire / Heat</option>
                <option value="ELECTRICAL_SHOCK" className="bg-slate-900">Electrical Shock</option>
                <option value="CHEMICAL_SPILL" className="bg-slate-900">Chemical Spill</option>
                <option value="HAZARDOUS_GAS" className="bg-slate-900">Hazardous Gas</option>
                <option value="STRUCTURAL_COLLAPSE" className="bg-slate-900">Structural Collapse</option>
                <option value="LANDSLIDE" className="bg-slate-900">Landslide</option>
                <option value="BIOHAZARD" className="bg-slate-900">Biohazard</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2">
              <Shield className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-300 font-mono outline-none py-1.5 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE" className="bg-slate-900">ACTIVE</option>
                <option value="INACTIVE" className="bg-slate-900">INACTIVE</option>
                <option value="ARCHIVED" className="bg-slate-900">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Document Cards List (5 cols) */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] px-1">
                <span>Matching Documents ({documents.length})</span>
                <button
                  type="button"
                  onClick={fetchDocuments}
                  className="hover:text-slate-200 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {documents.length === 0 && !isLoading && (
                <div className="p-6 bg-slate-950 border border-dashed border-slate-800 rounded-lg text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-mono">No matching emergency documents found.</p>
                </div>
              )}

              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-900/90 border-blue-600/80 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-slate-950 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-200 text-xs">{doc.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                            v{doc.version}
                          </span>
                          {doc.status === 'ACTIVE' ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded">
                              {doc.status}
                            </span>
                          )}
                          {doc.isOutdated && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 rounded">
                              Review Due
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-blue-400 block">{doc.category}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {doc.id}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                      {doc.summary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                      <span>Org: <strong className="text-slate-400">{doc.sourceOrganization || doc.source}</strong></span>
                      <div className="flex items-center gap-2">
                        <span>{doc.actionSteps?.length || 0} Steps</span>
                        <span>•</span>
                        <span>{doc.safetyPrecautions?.length || 0} Precautions</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Selected Document Reader & Management (7 cols) */}
            <div className="lg:col-span-7">
              {selectedDoc ? (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                  {/* Document Header & Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-mono font-bold text-slate-100">{selectedDoc.title}</h2>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                          v{selectedDoc.version}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                          {selectedDoc.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        ID: <strong className="font-mono text-slate-300">{selectedDoc.id}</strong> • Source: <strong>{selectedDoc.sourceOrganization || selectedDoc.source}</strong>
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openVersionModal(selectedDoc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded font-mono text-[11px] transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-blue-400" />
                          <span>Publish Version</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(selectedDoc)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[11px] border transition-colors cursor-pointer ${
                            selectedDoc.status === 'ACTIVE'
                              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                          }`}
                        >
                          {selectedDoc.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded p-3 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Operational Summary</span>
                    <p className="text-xs text-slate-200 leading-relaxed">{selectedDoc.summary}</p>
                  </div>

                  {/* Action Steps */}
                  {selectedDoc.actionSteps && selectedDoc.actionSteps.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4" />
                        <span>Action Protocol Steps ({selectedDoc.actionSteps.length})</span>
                      </span>
                      <div className="space-y-1.5 bg-slate-900/40 p-3 rounded border border-slate-800">
                        {selectedDoc.actionSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="w-4 h-4 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety Precautions & Contraindications */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDoc.safetyPrecautions && selectedDoc.safetyPrecautions.length > 0 && (
                      <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider block flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Scene Safety Precautions</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-amber-200/90">
                          {selectedDoc.safetyPrecautions.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedDoc.contraindications && selectedDoc.contraindications.length > 0 && (
                      <div className="p-3 bg-red-950/20 border border-red-900/40 rounded space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-wider block flex items-center gap-1">
                          <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                          <span>Contraindications (Prohibited)</span>
                        </span>
                        <ul className="space-y-1 text-[11px] text-red-200/90">
                          {selectedDoc.contraindications.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-red-500 font-bold">✕</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Complete Document Content */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Full Manual Specification</span>
                    <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedDoc.content}
                    </pre>
                  </div>

                  {/* Version History & Auditable Metadata */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Version History & Audit Log</span>
                      </span>
                      <span>Last Reviewed: {selectedDoc.lastReviewed || 'N/A'}</span>
                    </div>

                    <div className="space-y-1 font-mono text-[10px]">
                      {(selectedDoc.versionHistory || []).map((v, i) => (
                        <div key={i} className="p-2 bg-slate-900 rounded border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-blue-400">v{v.version}</span>
                            <span className="text-slate-300 ml-2">{v.changeLog}</span>
                            <span className="text-slate-500 ml-2">by {v.modifiedBy}</span>
                          </div>
                          <span className="text-slate-500">{new Date(v.modifiedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-950 border border-slate-800 rounded-lg text-center space-y-2">
                  <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
                  <div className="text-sm font-mono text-slate-300">Select a Protocol to Read</div>
                  <p className="text-xs text-slate-500">Choose any emergency manual from the corpus list on the left.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAG SANDBOX */}
      {activeTab === 'SANDBOX' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Offline RAG Query Simulation & Protocol Verification
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Test deterministic lexical retrieval, multi-factor score breakdowns, hazard correlation, conflict detection, and human review gates against any operational query.
            </p>

            {/* Sandbox Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Emergency Scenario / Symptom Query</label>
                <textarea
                  rows={3}
                  value={sandboxQuery}
                  onChange={(e) => setSandboxQuery(e.target.value)}
                  placeholder="Enter scenario description or symptoms..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded p-2 text-xs text-slate-200 font-mono outline-none"
                />
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Target Incident Category</label>
                  <select
                    value={sandboxCategory}
                    onChange={(e) => setSandboxCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 font-mono outline-none"
                  >
                    <option value="ALL">ANY_CATEGORY</option>
                    <option value="TRAUMA_BLEEDING">TRAUMA_BLEEDING</option>
                    <option value="BURNS">BURNS</option>
                    <option value="NATURAL_FLOOD">NATURAL_FLOOD</option>
                    <option value="NATURAL_FIRE">NATURAL_FIRE</option>
                    <option value="STRUCTURAL_COLLAPSE">STRUCTURAL_COLLAPSE</option>
                    <option value="HAZMAT_CHEMICAL">HAZMAT_CHEMICAL</option>
                    <option value="ELECTRICAL_HAZARDS">ELECTRICAL_HAZARDS</option>
                    <option value="EVACUATION_SHELTER">EVACUATION_SHELTER</option>
                    <option value="SEARCH_AND_RESCUE">SEARCH_AND_RESCUE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Severity Priority</label>
                  <select
                    value={sandboxSeverity}
                    onChange={(e) => setSandboxSeverity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 font-mono outline-none"
                  >
                    <option value="P1">P1_CRITICAL</option>
                    <option value="P2">P2_HIGH</option>
                    <option value="P3">P3_MEDIUM</option>
                    <option value="P4">P4_LOW</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRunSandbox}
                disabled={isSandboxRunning}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isSandboxRunning ? 'animate-spin' : ''}`} />
                <span>{isSandboxRunning ? 'Evaluating Corpus...' : 'Execute Deterministic RAG Query'}</span>
              </button>
            </div>
          </div>

          {/* Sandbox Results */}
          {sandboxResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-100 uppercase">RAG Synthesis Output</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    sandboxResult.retrievalConfidence === 'HIGH'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : sandboxResult.retrievalConfidence === 'MEDIUM'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-red-950 text-red-300 border-red-800'
                  }`}>
                    {sandboxResult.retrievalConfidence} Confidence ({sandboxResult.diagnostics.topScore}/100)
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-3">
                  <span>Evaluated: <strong>{sandboxResult.diagnostics.documentsEvaluated} docs</strong></span>
                  <span>Matched: <strong>{sandboxResult.retrievedDocuments.length}</strong></span>
                  <span>Latency: <strong>{sandboxResult.diagnostics.executionTimeMs}ms</strong></span>
                </div>
              </div>

              {/* Status & Review Notice */}
              {sandboxResult.requiresHumanReview && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/70 rounded space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-mono font-bold text-xs uppercase">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Human Review Gate Required</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 font-sans">
                    {sandboxResult.humanReviewReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence Summary */}
              <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Synthesized Summary</span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{sandboxResult.evidenceSummary}</p>
              </div>

              {/* Action Checklist & Safety Precautions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4" />
                    <span>Action Checklist ({sandboxResult.actionChecklist.length})</span>
                  </span>
                  <div className="space-y-1.5">
                    {sandboxResult.actionChecklist.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="w-4 h-4 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Safety Precautions & Contraindications</span>
                  </span>
                  <div className="space-y-1.5">
                    {sandboxResult.safetyWarnings.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-200">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{w}</span>
                      </div>
                    ))}
                    {sandboxResult.contraindications.map((c, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-red-300">
                        <span className="text-red-500 font-bold">✕</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Retrieved Documents & Score Breakdowns */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                  Scored Evidence Items ({sandboxResult.retrievedDocuments.length})
                </span>
                <div className="space-y-2">
                  {sandboxResult.retrievedDocuments.map((doc) => (
                    <div key={doc.documentId} className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">{doc.title}</span>
                          <span className="text-[10px] font-mono text-blue-400">({doc.category})</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          Total: {doc.relevanceScore}/100
                        </span>
                      </div>

                      {/* Score Breakdown Pills */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          Keywords: +{doc.scoreBreakdown.keywordScore}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          Category: +{doc.scoreBreakdown.categoryScore}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          Hazards: +{doc.scoreBreakdown.hazardScore}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                          Severity: +{doc.scoreBreakdown.severityScore}
                        </span>
                        {doc.scoreBreakdown.outdatedPenalty > 0 && (
                          <span className="px-2 py-0.5 bg-red-950 text-red-300 rounded">
                            Outdated Penalty: -{doc.scoreBreakdown.outdatedPenalty}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 italic">
                        "{doc.relevantSnippet}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col font-sans text-xs">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-mono font-bold text-slate-100 text-sm">Register New Emergency Protocol</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-4 overflow-y-auto space-y-3 text-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Document ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={(e) => setFormData(f => ({ ...f, id: e.target.value }))}
                    placeholder="e.g., PROTOCOL-MCI-01"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                  >
                    <option value="MEDICAL_EMERGENCY">MEDICAL_EMERGENCY</option>
                    <option value="TRAUMA_BLEEDING">TRAUMA_BLEEDING</option>
                    <option value="BURNS">BURNS</option>
                    <option value="FRACTURES_DISLOCATION">FRACTURES_DISLOCATION</option>
                    <option value="NATURAL_FLOOD">NATURAL_FLOOD</option>
                    <option value="NATURAL_FIRE">NATURAL_FIRE</option>
                    <option value="STRUCTURAL_COLLAPSE">STRUCTURAL_COLLAPSE</option>
                    <option value="LANDSLIDE">LANDSLIDE</option>
                    <option value="HAZMAT_CHEMICAL">HAZMAT_CHEMICAL</option>
                    <option value="ELECTRICAL_HAZARDS">ELECTRICAL_HAZARDS</option>
                    <option value="EVACUATION_SHELTER">EVACUATION_SHELTER</option>
                    <option value="SEARCH_AND_RESCUE">SEARCH_AND_RESCUE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Mass Casualty Incident Triage Protocol"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Source Reference</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData(f => ({ ...f, source: e.target.value }))}
                    placeholder="e.g., START Triage Standard"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Authoritative Organization</label>
                  <input
                    type="text"
                    value={formData.sourceOrganization}
                    onChange={(e) => setFormData(f => ({ ...f, sourceOrganization: e.target.value }))}
                    placeholder="e.g., National Incident Management System"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Executive Summary *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData(f => ({ ...f, summary: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Action Protocol Steps (one per line)</label>
                <textarea
                  rows={3}
                  value={formData.actionStepsText}
                  onChange={(e) => setFormData(f => ({ ...f, actionStepsText: e.target.value }))}
                  placeholder="Step 1: Direct walking wounded to safe perimeter&#10;Step 2: Check respiration..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Safety Precautions (one per line)</label>
                  <textarea
                    rows={2}
                    value={formData.safetyPrecautionsText}
                    onChange={(e) => setFormData(f => ({ ...f, safetyPrecautionsText: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Contraindications (one per line)</label>
                  <textarea
                    rows={2}
                    value={formData.contraindicationsText}
                    onChange={(e) => setFormData(f => ({ ...f, contraindicationsText: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Complete Protocol Content *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Keywords (comma separated)</label>
                <input
                  type="text"
                  value={formData.keywordsText}
                  onChange={(e) => setFormData(f => ({ ...f, keywordsText: e.target.value }))}
                  placeholder="triage, mass casualty, breathing, pulse"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold uppercase cursor-pointer"
                >
                  Save Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION MODAL */}
      {showVersionModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg max-w-xl w-full flex flex-col font-sans text-xs">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-mono font-bold text-slate-100 text-sm">Publish New Protocol Version</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{selectedDoc.title} (Current: v{selectedDoc.version})</p>
              </div>
              <button type="button" onClick={() => setShowVersionModal(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishVersion} className="p-4 space-y-3 text-slate-200">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">New Version String *</label>
                <input
                  type="text"
                  required
                  value={versionData.newVersion}
                  onChange={(e) => setVersionData(v => ({ ...v, newVersion: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Changelog Entry *</label>
                <textarea
                  rows={2}
                  required
                  value={versionData.changeLog}
                  onChange={(e) => setVersionData(v => ({ ...v, changeLog: e.target.value }))}
                  placeholder="Describe modifications made in this version..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Updated Executive Summary</label>
                <textarea
                  rows={2}
                  value={versionData.summary}
                  onChange={(e) => setVersionData(v => ({ ...v, summary: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-semibold uppercase cursor-pointer"
                >
                  Publish Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
