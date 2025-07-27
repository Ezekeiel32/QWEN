import React from "react";

interface InstrumentKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  size?: number;
}

export default function InstrumentKnob({ value, min, max, step = 1, onChange, size = 64 }: InstrumentKnobProps) {
  const angle = ((value - min) / (max - min)) * 270 - 135;
  const handleDrag = (e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let theta = Math.atan2(dy, dx) * (180 / Math.PI);
    theta = Math.max(-135, Math.min(135, theta));
    const newValue = min + ((theta + 135) / 270) * (max - min);
    onChange(Math.round(newValue / step) * step);
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ cursor: "pointer", filter: "drop-shadow(0 0 8px #00ffe7)" }}
      onMouseDown={e => {
        const move = (ev: MouseEvent) => handleDrag(ev as any);
        const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
    >
      <circle cx="32" cy="32" r="28" fill="#18181b" stroke="#00ffe7" strokeWidth="3" />
      {/* Ticks */}
      {[...Array(21)].map((_, i) => {
        const a = (-135 + (i * 270) / 20) * (Math.PI / 180);
        const x1 = 32 + Math.cos(a) * 24;
        const y1 = 32 + Math.sin(a) * 24;
        const x2 = 32 + Math.cos(a) * 28;
        const y2 = 32 + Math.sin(a) * 28;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ffe7" strokeWidth={i % 5 === 0 ? 2 : 1} opacity={i % 5 === 0 ? 1 : 0.5} />;
      })}
      {/* Knob pointer */}
      <line
        x1="32"
        y1="32"
        x2={32 + Math.cos((angle * Math.PI) / 180) * 20}
        y2={32 + Math.sin((angle * Math.PI) / 180) * 20}
        stroke="#ffe066"
        strokeWidth="4"
        strokeLinecap="round"
        filter="drop-shadow(0 0 8px #ffe066)"
      />
      <circle cx="32" cy="32" r="10" fill="#222" stroke="#00ffe7" strokeWidth="2" />
    </svg>
  );
} 