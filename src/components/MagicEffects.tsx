/**
 * MagicEffects — componentes React dos efeitos avançados (Magic UI, Aceternity,
 * ReactBits, Framer) em CSS/JS puro, sem dependências externas.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ============ PARTICLES (Magic UI): canvas interativo com mouse ============ */
export const Particles: React.FC<{ className?: string; quantity?: number }> = ({
  className = '',
  quantity = 42,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const mouse = { x: -9999, y: -9999 };
    type P = { x: number; y: number; dx: number; dy: number; r: number };
    let parts: P[] = [];

    const resize = () => {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: quantity }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.4,
      }));
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;
        const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < 90) {
          const f = (90 - dm) / 90;
          p.x += ((p.x - mouse.x) / (dm || 1)) * f * 1.4;
          p.y += ((p.y - mouse.y) / (dm || 1)) * f * 1.4;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(103, 232, 249, 0.65)';
        ctx.fill();
      }
      // linhas entre partículas próximas (plexus)
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const d = Math.hypot(parts[i].x - parts[j].x, parts[i].y - parts[j].y);
          if (d < 70) {
            ctx.beginPath();
            ctx.moveTo(parts[i].x, parts[i].y);
            ctx.lineTo(parts[j].x, parts[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.16 * (1 - d / 70)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [quantity]);
  return <canvas ref={ref} className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} />;
};

/* ============ AURORA BACKGROUND (Aceternity) ============ */
export const AuroraBackground: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`aurora-bg ${className}`}>
    <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
    {children}
  </div>
);

/* ============ SPOTLIGHT CARD (Aceternity) ============ */
export const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight-card ${className}`}>
      {children}
    </div>
  );
};

/* ============ NUMBER TICKER (Magic UI) ============ */
export const NumberTicker: React.FC<{ value: number; suffix?: string; className?: string }> = ({
  value,
  suffix = '',
  className = '',
}) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const step = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={`ticker-number ${className}`}>
      {n.toLocaleString('pt-BR')}
      {suffix}
    </span>
  );
};

/* ============ TILT CARD (Framer 3D) ============ */
export const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 10;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }, []);
  const reset = useCallback(() => {
    if (ref.current) ref.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  }, []);
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={`tilt-card ${className}`}>
      {children}
    </div>
  );
};

/* ============ METEORS (Magic UI) ============ */
export const Meteors: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="meteor"
        style={{
          top: `${Math.random() * 60}%`,
          left: `${20 + Math.random() * 80}%`,
          '--meteor-angle': '215deg',
          '--meteor-duration': `${2 + Math.random() * 3}s`,
          animationDelay: `${Math.random() * 4}s`,
        } as React.CSSProperties}
      />
    ))}
  </>
);

/* ============ GLOWING STARS ===================== */
export const GlowStars: React.FC<{ count?: number }> = ({ count = 14 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className="glow-star"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          width: `${1 + Math.random() * 2}px`,
          height: `${1 + Math.random() * 2}px`,
          '--twinkle-dur': `${2 + Math.random() * 4}s`,
          animationDelay: `${Math.random() * 5}s`,
        } as React.CSSProperties}
      />
    ))}
  </>
);
