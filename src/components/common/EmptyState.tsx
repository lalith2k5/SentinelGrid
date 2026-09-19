import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  badge
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-900/60 border border-slate-800 rounded-lg max-w-2xl mx-auto my-4">
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>

      {badge && (
        <span className="mb-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
          {badge}
        </span>
      )}

      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <button
              onClick={onAction}
              type="button"
              className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider rounded border border-emerald-500 transition-colors cursor-pointer"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              type="button"
              className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded border border-slate-700 transition-colors cursor-pointer"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
