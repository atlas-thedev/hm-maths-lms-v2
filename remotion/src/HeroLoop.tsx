import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

const BG = "#141414";
const OR = "#f05b06";
const TAU = Math.PI * 2;
// deterministic pseudo random
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const FORMULAS = [
  "∫ sin x dx = −cos x + C", "dy/dx", "Σ r² = n(n+1)(2n+1)/6", "lim x→0 sin x / x = 1", "F = ma", "i² = −1",
  "ⁿCᵣ", "v² = u² + 2as", "a · b = |a||b| cos θ", "eⁱᶿ = cos θ + i sin θ", "x = (−b ± √Δ) / 2a", "tan 2θ",
  "ω = dθ/dt", "∮", "P(A∩B)", "r = a(1 + cos θ)", "d²y/dx²", "z = r(cos θ + i sin θ)",
];

export const HeroLoop: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H, durationInFrames: T } = useVideoConfig();
  const p = f / T; // 0..1, loops seamlessly

  // perspective grid
  const cell = 90;
  const off = (p * cell * 4) % cell;

  // staircase geometry (isometric-ish steps rising to the right)
  const steps = 8;
  const sx = 230, sy = 74, x0 = 380, y0 = 1010;
  const pulse = p * (steps + 2) - 1; // light travelling up the stairs

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      {/* breathing glows */}
      <AbsoluteFill style={{
        background: `radial-gradient(60% 55% at ${78 + 4 * Math.sin(TAU * p)}% ${30 + 5 * Math.cos(TAU * p)}%, rgba(240,91,6,${0.28 + 0.06 * Math.sin(TAU * p)}), transparent 70%),
                     radial-gradient(45% 50% at ${22 + 3 * Math.cos(TAU * p)}% 85%, rgba(251,146,60,0.16), transparent 70%)`,
      }} />

      {/* moving perspective grid floor */}
      <div style={{ position: "absolute", left: -W * 0.5, right: -W * 0.5, bottom: -40, height: H * 0.62, perspective: 700, perspectiveOrigin: "50% 0%" }}>
        <div style={{
          position: "absolute", inset: 0, transform: "rotateX(68deg)", transformOrigin: "50% 0%",
          backgroundImage: `linear-gradient(rgba(240,91,6,.35) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(240,91,6,.22) 1.5px, transparent 1.5px)`,
          backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `0 ${off}px`,
          maskImage: "linear-gradient(to bottom, transparent, black 35%, black)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 35%, black)",
        }} />
      </div>

      {/* sine wave plot */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="wave" x1="0" x2="1"><stop offset="0" stopColor={OR} stopOpacity="0" /><stop offset=".5" stopColor="#fb923c" stopOpacity=".9" /><stop offset="1" stopColor={OR} stopOpacity="0" /></linearGradient>
          <linearGradient id="stepTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff9f66" /><stop offset="1" stopColor={OR} /></linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[0, 1].map((k) => {
          const pts: string[] = [];
          for (let x = 0; x <= W; x += 12) {
            const y = H * (0.5 + k * 0.08) + (60 - k * 25) * Math.sin(x / (230 + k * 90) - TAU * p * (k ? -1 : 1)) * Math.sin(x / W * Math.PI);
            pts.push(`${x},${y.toFixed(1)}`);
          }
          return <polyline key={k} points={pts.join(" ")} fill="none" stroke="url(#wave)" strokeWidth={k ? 1.5 : 2.5} opacity={k ? 0.35 : 0.55} />;
        })}

        {/* staircase */}
        {Array.from({ length: steps }).map((_, i) => {
          const x = x0 + i * sx, y = y0 - i * sy;
          const lit = Math.max(0, 1 - Math.abs(pulse - i) / 1.2);
          const rise = 0.55 + 0.45 * lit;
          return (
            <g key={i} opacity={0.35 + 0.5 * rise} filter={lit > 0.2 ? "url(#glow)" : undefined}>
              <polygon points={`${x},${y} ${x + sx},${y} ${x + sx + 60},${y - 30} ${x + 60},${y - 30}`} fill="url(#stepTop)" opacity={0.25 + 0.6 * lit} />
              <polygon points={`${x},${y} ${x + sx},${y} ${x + sx},${y + sy} ${x},${y + sy}`} fill={`rgba(240,91,6,${0.08 + 0.25 * lit})`} stroke={OR} strokeOpacity={0.5 + 0.5 * lit} strokeWidth={2} />
              <line x1={x} y1={y} x2={x + sx} y2={y} stroke="#ffd2b0" strokeOpacity={0.4 + 0.6 * lit} strokeWidth={3} />
            </g>
          );
        })}

        {/* twinkling particles */}
        {Array.from({ length: 70 }).map((_, i) => {
          const x = rnd(i) * W, y = rnd(i + 99) * H * 0.85;
          const tw = 0.5 + 0.5 * Math.sin(TAU * (p * (1 + (i % 3)) + rnd(i + 7)));
          return <circle key={i} cx={x + 14 * Math.sin(TAU * (p + rnd(i + 3)))} cy={y + 10 * Math.cos(TAU * (p + rnd(i + 5)))} r={1 + 1.8 * rnd(i + 11)} fill={i % 4 ? "#ffffff" : "#fb923c"} opacity={0.08 + 0.45 * tw} />;
        })}
      </svg>

      {/* floating formulas */}
      {FORMULAS.map((t, i) => {
        const bx = rnd(i + 21) * 0.92 * W, by = rnd(i + 41) * 0.8 * H;
        const ph = rnd(i + 61);
        const dx = 26 * Math.sin(TAU * (p + ph)), dy = 34 * Math.cos(TAU * (p * (i % 2 ? 1 : 2) + ph));
        const op = 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(TAU * (p + ph)));
        const size = 22 + 26 * rnd(i + 81);
        return (
          <div key={i} style={{
            position: "absolute", left: bx + dx, top: by + dy, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic",
            fontSize: size, color: i % 3 === 0 ? "#fb923c" : "#ffffff", opacity: op, whiteSpace: "nowrap",
            transform: `rotate(${(rnd(i + 5) - 0.5) * 16}deg)`, filter: `blur(${size > 40 ? 0 : 0.4}px)`,
          }}>{t}</div>
        );
      })}

      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.65))" }} />
    </AbsoluteFill>
  );
};
