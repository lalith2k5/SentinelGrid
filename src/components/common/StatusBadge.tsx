import React from 'react';

interface StatusBadgeProps {
  type: 'severity' | 'status' | 'verification' | 'availability' | 'system' | 'role';
  value: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
  let styleClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let displayLabel = value.replace(/_/g, ' ');

  if (type === 'severity') {
    switch (value) {
      case 'CRITICAL':
        styleClasses = 'bg-red-950/80 text-red-300 border-red-800/80';
        break;
      case 'HIGH':
        styleClasses = 'bg-amber-950/80 text-amber-300 border-amber-800/80';
        break;
      case 'MEDIUM':
        styleClasses = 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60';
        break;
      case 'LOW':
        styleClasses = 'bg-slate-800 text-slate-300 border-slate-700';
        break;
      case 'INFORMATIONAL':
        styleClasses = 'bg-blue-950/60 text-blue-300 border-blue-800/60';
        break;
    }
  } else if (type === 'status') {
    switch (value) {
      case 'OPEN':
        styleClasses = 'bg-red-950/60 text-red-300 border-red-800/60';
        break;
      case 'INVESTIGATING':
        styleClasses = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
        break;
      case 'DISPATCHED':
        styleClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
        break;
      case 'CONTAINED':
        styleClasses = 'bg-teal-950/60 text-teal-300 border-teal-800/60';
        break;
      case 'RESOLVED':
        styleClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
        break;
    }
  } else if (type === 'verification') {
    switch (value) {
      case 'OFFICIAL_VERIFIED':
        styleClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
        displayLabel = 'Official Verified';
        break;
      case 'COMMUNITY_REPORTED':
        styleClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
        displayLabel = 'Community Reported';
        break;
      case 'UNVERIFIED':
        styleClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        displayLabel = 'Unverified';
        break;
      case 'FALSE_ALARM':
        styleClasses = 'bg-red-950/60 text-red-400 border-red-800/60';
        displayLabel = 'False Alarm';
        break;
    }
  } else if (type === 'availability') {
    switch (value) {
      case 'AVAILABLE':
        styleClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
        break;
      case 'DEPLOYED':
        styleClasses = 'bg-sky-950/60 text-sky-300 border-sky-800/60';
        break;
      case 'MAINTENANCE':
        styleClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
        break;
      case 'OFFLINE':
        styleClasses = 'bg-slate-800 text-slate-400 border-slate-700';
        break;
    }
  } else if (type === 'system') {
    switch (value) {
      case 'OPERATIONAL':
        styleClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
        displayLabel = 'Operational';
        break;
      case 'SIMULATION_NOT_STARTED':
        styleClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
        displayLabel = 'Simulation Not Started';
        break;
      case 'NOT_CONFIGURED':
        styleClasses = 'bg-slate-800/80 text-slate-400 border-slate-700';
        displayLabel = 'Not Configured';
        break;
    }
  } else if (type === 'role') {
    switch (value) {
      case 'ADMIN':
        styleClasses = 'bg-purple-950/70 text-purple-300 border-purple-800/70';
        break;
      case 'DISPATCHER':
        styleClasses = 'bg-blue-950/70 text-blue-300 border-blue-800/70';
        break;
      case 'RESPONDER':
        styleClasses = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70';
        break;
      case 'OPERATOR':
        styleClasses = 'bg-amber-950/70 text-amber-300 border-amber-800/70';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border tracking-wide uppercase whitespace-nowrap ${styleClasses} ${className}`}
    >
      {displayLabel}
    </span>
  );
};
