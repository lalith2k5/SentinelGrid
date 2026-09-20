import React, { useState } from 'react';
import { HazardType, HazardSeverity } from '../../../server/gis/types.ts';
import { AlertTriangle, X } from 'lucide-react';

interface HazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: HazardType;
    severity: HazardSeverity;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    description: string;
  }) => Promise<void>;
}

export const HazardModal: React.FC<HazardModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [type, setType] = useState<HazardType>('FLOOD');
  const [severity, setSeverity] = useState<HazardSeverity>('HIGH');
  const [latitude, setLatitude] = useState<string>('10.0000');
  const [longitude, setLongitude] = useState<string>('10.0100');
  const [radiusMeters, setRadiusMeters] = useState<number>(300);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Invalid latitude. Must be between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Invalid longitude. Must be between -180 and 180.');
      return;
    }
    if (radiusMeters <= 0) {
      setError('Radius must be greater than 0 meters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        type,
        severity,
        latitude: lat,
        longitude: lng,
        radiusMeters,
        description
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record hazard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-6 font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-base font-bold uppercase font-mono tracking-wide text-slate-100">
              Report GIS Hazard Zone
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
              Hazard Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as HazardType)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="FLOOD">FLOOD (Water Surge / Inundation)</option>
              <option value="FIRE">FIRE (Active Wildfire / Structure)</option>
              <option value="LANDSLIDE">LANDSLIDE (Mud / Debris Collapse)</option>
              <option value="EARTHQUAKE_DAMAGE">EARTHQUAKE_DAMAGE (Rubble / Fissures)</option>
              <option value="STRUCTURAL_DAMAGE">STRUCTURAL_DAMAGE (Unstable Building)</option>
              <option value="HAZMAT">HAZMAT (Hazardous Materials)</option>
              <option value="CHEMICAL">CHEMICAL (Toxic Chemical Leak / Spills)</option>
              <option value="STRUCTURAL">STRUCTURAL (Structural Integrity Hazard)</option>
              <option value="ELECTRICAL">ELECTRICAL (Downed Lines / Power Hazard)</option>
              <option value="ROAD_BLOCKAGE">ROAD_BLOCKAGE (General Obstruction)</option>
              <option value="UNKNOWN">UNKNOWN / UNCLASSIFIED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Severity Level
            </label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as HazardSeverity)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="LOW">LOW (Small penalty)</option>
              <option value="MEDIUM">MEDIUM (Moderate penalty)</option>
              <option value="HIGH">HIGH (Large penalty)</option>
              <option value="CRITICAL">CRITICAL (Blocks route traversal)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Hazard Radius (Meters)
            </label>
            <input
              type="number"
              value={radiusMeters}
              onChange={e => setRadiusMeters(parseInt(e.target.value) || 100)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Description / Field Operational Notes
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Chemical spill near highway interchange..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500 h-20 resize-none"
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
              {isSubmitting ? 'Recording...' : 'Record Hazard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
