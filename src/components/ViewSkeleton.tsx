import React from 'react';
import { Cpu } from 'lucide-react';

interface ViewSkeletonProps {
  label?: string;
}

export const ViewSkeleton: React.FC<ViewSkeletonProps> = ({ label = 'Carregando módulo JARVIS...' }) => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="p-4 max-w-5xl mx-auto space-y-4 animate-pulse pb-28"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-cyan-950/40 border border-cyan-500/20 rounded-lg" />
          <div className="h-3.5 w-72 bg-zinc-800/60 rounded" />
        </div>
        <div className="h-9 w-24 bg-cyan-900/30 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
          <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
        </div>
      </div>

      {/* Hero cards / grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
          <div className="h-4 w-1/3 bg-cyan-500/20 rounded" />
          <div className="h-3 w-4/5 bg-zinc-800 rounded" />
          <div className="h-8 w-full bg-black/40 rounded-xl" />
        </div>
        <div className="h-32 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
          <div className="h-4 w-1/3 bg-cyan-500/20 rounded" />
          <div className="h-3 w-4/5 bg-zinc-800 rounded" />
          <div className="h-8 w-full bg-black/40 rounded-xl" />
        </div>
      </div>

      {/* Main content block skeleton */}
      <div className="h-64 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 space-y-4">
        <div className="h-4 w-1/4 bg-zinc-800 rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-zinc-800/40 rounded" />
          <div className="h-3 w-11/12 bg-zinc-800/40 rounded" />
          <div className="h-3 w-4/5 bg-zinc-800/40 rounded" />
        </div>
        <div className="h-10 w-full bg-cyan-950/20 border border-cyan-500/10 rounded-xl" />
      </div>

      <div className="text-center py-2 text-xs text-cyan-400/80 font-mono tracking-wider">
        [ {label.toUpperCase()} ]
      </div>
    </div>
  );
};
