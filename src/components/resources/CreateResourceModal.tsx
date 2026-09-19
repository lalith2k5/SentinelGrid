import React, { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { ResourceType, ResourceAvailability } from '../../types/index.ts';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('AMBULANCE');
  const [availability, setAvailability] = useState<ResourceAvailability>('AVAILABLE');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [statusDetails, setStatusDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setError('Resource name and location are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          type,
          availability,
          location: location.trim(),
          capacity: capacity.trim(),
          statusDetails: statusDetails.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register resource');
      }

      onSuccess();
      onClose();
      setName('');
      setLocation('');
      setCapacity('');
      setStatusDetails('');
    } catch (err: any) {
      setError(err.message || 'Failed to register resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
              Register Emergency Resource
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
              Resource Name / Callsign *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Squad 4 - Heavy Rescue"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Resource Type *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ResourceType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="AMBULANCE">Ambulance (ALS / BLS)</option>
                <option value="RESCUE_TEAM">Rescue Team (USAR)</option>
                <option value="MEDICAL_TEAM">Medical Team (Field Clinic)</option>
                <option value="SHELTER">Emergency Shelter</option>
                <option value="EMERGENCY_EQUIPMENT">Emergency Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Initial Status *
              </label>
              <select
                value={availability}
                onChange={e => setAvailability(e.target.value as ResourceAvailability)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="AVAILABLE">AVAILABLE (Ready for Dispatch)</option>
                <option value="DEPLOYED">DEPLOYED (Active On-Scene)</option>
                <option value="MAINTENANCE">MAINTENANCE (Refueling/Repair)</option>
                <option value="OFFLINE">OFFLINE (Unavailable)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Staging Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Base Camp Alpha"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Capacity / Crew
              </label>
              <input
                type="text"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                placeholder="e.g. 4 crew members, 2 litters"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Operational Details / Equipment Specs
            </label>
            <input
              type="text"
              value={statusDetails}
              onChange={e => setStatusDetails(e.target.value)}
              placeholder="e.g. Equipped with satellite phone, generator, extrication cutters"
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
              {isSubmitting ? 'Registering...' : 'Register Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
