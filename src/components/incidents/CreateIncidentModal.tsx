import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { IncidentSeverity } from '../../types/index.ts';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [locationAddress, setLocationAddress] = useState('');
  const [zone, setZone] = useState('North Sector');
  const [gridSquare, setGridSquare] = useState('GS-01');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          locationAddress: locationAddress.trim(),
          zone: zone.trim(),
          gridSquare: gridSquare.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit incident');
      }

      onSuccess();
      onClose();
      setTitle('');
      setDescription('');
      setLocationAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
              Report Emergency Incident
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Incident Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Structure collapse on South Highway"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Severity Level *
              </label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="CRITICAL">CRITICAL (Life Threat)</option>
                <option value="HIGH">HIGH (Major Hazard)</option>
                <option value="MEDIUM">MEDIUM (Moderate Impact)</option>
                <option value="LOW">LOW (Localized)</option>
                <option value="INFORMATIONAL">INFORMATIONAL (Advisory)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Sector / Zone
              </label>
              <input
                type="text"
                value={zone}
                onChange={e => setZone(e.target.value)}
                placeholder="e.g. North Sector"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Grid Square
              </label>
              <input
                type="text"
                value={gridSquare}
                onChange={e => setGridSquare(e.target.value)}
                placeholder="GS-01"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Location / Landmark
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                placeholder="e.g. Mile Marker 18, West Pass"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Incident Description *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide situational details, observed damage, trapped individuals, and access conditions..."
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 uppercase tracking-wider rounded border border-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider rounded border border-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Record Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
