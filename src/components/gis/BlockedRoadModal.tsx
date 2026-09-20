import React, { useState } from 'react';
import { MapEdge } from '../../../server/gis/types.ts';
import { Ban, X } from 'lucide-react';

interface BlockedRoadModalProps {
  isOpen: boolean;
  edges: MapEdge[];
  onClose: () => void;
  onSubmit: (data: { edgeId: string; reason: string }) => Promise<void>;
}

export const BlockedRoadModal: React.FC<BlockedRoadModalProps> = ({
  isOpen,
  edges,
  onClose,
  onSubmit
}) => {
  const [edgeId, setEdgeId] = useState<string>(edges[0]?.edgeId || '');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!edgeId) {
      setError('Select a road edge to mark blocked.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason for blockage is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({ edgeId, reason: reason.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to block road edge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Ban className="w-5 h-5" />
            <h3 className="text-base font-bold uppercase font-mono tracking-wide text-slate-100">
              Mark Road Edge Blocked
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Select Road Edge
            </label>
            <select
              value={edgeId}
              onChange={e => setEdgeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {edges.map(e => (
                <option key={e.edgeId} value={e.edgeId}>
                  {e.edgeId} ({e.fromNodeId} → {e.toNodeId}, {e.roadType},{' '}
                  {e.distanceMeters}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Reason for Blockage
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Fallen tree, structural road collapse, police checkpoint..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 h-24 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Mark Blocked'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
