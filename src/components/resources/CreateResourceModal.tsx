import React, { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { ResourceType, ResourceCapability, ResourceStatus } from '../../types/index.ts';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

const ALL_CAPABILITIES: { value: ResourceCapability; label: string }[] = [
  { value: 'MEDICAL', label: 'Medical (ALS/BLS)' },
  { value: 'FIRE', label: 'Fire Suppression' },
  { value: 'RESCUE', label: 'Technical Rescue' },
  { value: 'HAZMAT', label: 'HAZMAT Response' },
  { value: 'SEARCH', label: 'Search & Recon' },
  { value: 'EVACUATION', label: 'Evacuation Transport' },
  { value: 'SHELTER', label: 'Emergency Shelter' },
  { value: 'SUPPLIES', label: 'Emergency Supplies' },
  { value: 'OTHER', label: 'Specialized Equipment' }
];

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token
}) => {
  const [resourceCode, setResourceCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('AMBULANCE');
  const [status, setStatus] = useState<ResourceStatus>('AVAILABLE');
  const [capabilities, setCapabilities] = useState<ResourceCapability[]>(['MEDICAL']);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<string>('10.0000');
  const [longitude, setLongitude] = useState<string>('10.0000');
  const [capacity, setCapacity] = useState('');
  const [statusDetails, setStatusDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCapability = (cap: ResourceCapability) => {
    if (capabilities.includes(cap)) {
      setCapabilities(capabilities.filter(c => c !== cap));
    } else {
      setCapabilities([...capabilities, cap]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setError('Resource name and location are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const parsedLat = latitude.trim() !== '' ? parseFloat(latitude) : null;
    const parsedLng = longitude.trim() !== '' ? parseFloat(longitude) : null;

    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resourceCode: resourceCode.trim() || undefined,
          name: name.trim(),
          type,
          capabilities,
          status,
          availability: status,
          latitude: parsedLat,
          longitude: parsedLng,
          location: location.trim(),
          capacity: capacity.trim() || undefined,
          statusDetails: statusDetails.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register resource');
      }

      onSuccess();
      onClose();
      setResourceCode('');
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
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full overflow-hidden shadow-2xl">
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Resource Code
              </label>
              <input
                type="text"
                value={resourceCode}
                onChange={e => setResourceCode(e.target.value)}
                placeholder="e.g. AMB-101"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="col-span-2">
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
                <option value="MEDICAL_TEAM">Medical Team</option>
                <option value="FIRE_UNIT">Fire Engine / Unit</option>
                <option value="RESCUE_TEAM">Rescue Team (USAR)</option>
                <option value="HAZMAT_UNIT">HAZMAT Unit</option>
                <option value="SEARCH_TEAM">Search & Recon Team</option>
                <option value="EVACUATION_UNIT">Evacuation Unit</option>
                <option value="SHELTER">Emergency Shelter</option>
                <option value="SUPPLY_UNIT">Supply Transport</option>
                <option value="EMERGENCY_EQUIPMENT">Emergency Equipment</option>
                <option value="OTHER">Other Specialized Unit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Initial Status *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ResourceStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="AVAILABLE">AVAILABLE (Ready for Dispatch)</option>
                <option value="ASSIGNED">ASSIGNED (Active Deployment)</option>
                <option value="EN_ROUTE">EN_ROUTE (Transit)</option>
                <option value="ON_SCENE">ON_SCENE (At Incident)</option>
                <option value="UNAVAILABLE">UNAVAILABLE (Maintenance/Offline)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
              Capabilities
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_CAPABILITIES.map(cap => (
                <label
                  key={cap.value}
                  className={`flex items-center gap-2 p-2 rounded text-xs border cursor-pointer select-none transition-colors ${
                    capabilities.includes(cap.value)
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={capabilities.includes(cap.value)}
                    onChange={() => toggleCapability(cap.value)}
                    className="rounded border-slate-800 text-emerald-600 focus:ring-0"
                  />
                  <span>{cap.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Staging Location Name *
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Station Alpha (N-03)"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Latitude (Offline GIS)
              </label>
              <input
                type="text"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder="e.g. 10.0100"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
                Longitude (Offline GIS)
              </label>
              <input
                type="text"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder="e.g. 10.0100"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Capacity / Personnel
            </label>
            <input
              type="text"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              placeholder="e.g. 4 crew members, 2 litters"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Operational Details / Equipment Specs
            </label>
            <input
              type="text"
              value={statusDetails}
              onChange={e => setStatusDetails(e.target.value)}
              placeholder="e.g. Level-A suits, generator, extrication cutters"
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
