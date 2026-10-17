import React from 'react';

interface HolographicCoreProps {
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const HolographicCore: React.FC<HolographicCoreProps> = React.memo(({
  state = 'idle',
  size = 'md',
  onClick,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative flex items-center justify-center cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black rounded-full ${sizeClasses} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`JARVIS Núcleo Holográfico: ${state}. Pressione Enter para alternar.`}
    >
      {/* Outer Glow Halo */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 blur-xl ${
          state === 'listening'
            ? 'bg-cyan-400/40 scale-125'
            : state === 'thinking'
            ? 'bg-purple-500/40 scale-120 animate-pulse'
            : state === 'speaking'
            ? 'bg-sky-400/50 scale-130'
            : 'bg-cyan-500/20 scale-105'
        }`}
      />

      {/* Outer Rotating Ring */}
      <div
        className={`absolute inset-1 rounded-full border border-cyan-500/30 border-dashed transition-all duration-1000 ${
          state === 'thinking' ? 'animate-spin' : ''
        }`}
        style={{ animationDuration: '8s' }}
      />

      {/* Middle Concentric Ring */}
      <div
        className={`absolute inset-3 rounded-full border border-cyan-400/40 transition-transform duration-500 ${
          state === 'listening' ? 'scale-110' : 'scale-100'
        }`}
      />

      {/* Inner Holographic Face / Orb Visor */}
      <div className="relative z-10 w-4/5 h-4/5 rounded-full bg-slate-950/90 border border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center overflow-hidden backdrop-blur-md">
        {/* Subtle grid lines background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.4) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />

        {/* Headset / Visor SVG */}
        <svg
          viewBox="0 0 100 100"
          className={`w-3/4 h-3/4 text-cyan-400 transition-transform duration-300 ${
            state === 'speaking' ? 'scale-105' : 'scale-100'
          }`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Headset Arc */}
          <path
            d="M20 50 C20 30 35 18 50 18 C65 18 80 30 80 50"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]"
          />

          {/* Neural Earpieces */}
          <rect x="14" y="44" width="7" height="18" rx="3.5" fill="currentColor" />
          <rect x="79" y="44" width="7" height="18" rx="3.5" fill="currentColor" />

          {/* Sleek Face Visor Line */}
          <path
            d="M32 50 Q50 62 68 50"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(56,189,248,1)]"
          />

          {/* Central AI Core Eye */}
          <circle
            cx="50"
            cy="47"
            r={state === 'thinking' ? '5' : '4'}
            fill="#ffffff"
            className="drop-shadow-[0_0_10px_#ffffff]"
          />

          {/* Audio Waveform Bars when speaking */}
          {state === 'speaking' && (
            <g className="animate-pulse">
              <line x1="38" y1="68" x2="38" y2="76" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="44" y1="65" x2="44" y2="79" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="63" x2="50" y2="81" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="56" y1="65" x2="56" y2="79" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="62" y1="68" x2="62" y2="76" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* Radar Sweep Arc when listening */}
          {state === 'listening' && (
            <path
              d="M30 72 Q50 78 70 72"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          )}
        </svg>

        {/* State Tag at bottom of core */}
        <div className="absolute bottom-1.5 text-[9px] uppercase tracking-wider font-mono text-cyan-300 font-semibold">
          {state === 'listening' ? 'OUVINDO' : state === 'thinking' ? 'PROCESSANDO' : state === 'speaking' ? 'FALANDO' : 'ONLINE'}
        </div>
      </div>
    </div>
  );
});
