import React, { useRef, useEffect } from "react";

interface NeonOscilloscopeProps {
  data: number[];
  width?: number;
  height?: number;
}

export default function NeonOscilloscope({ data, width = 600, height = 200 }: NeonOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    // Neon grid
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#00ffe7";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
    // Neon trace
    ctx.save();
    ctx.shadowColor = "#00ffe7";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#00ffe7";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height / 2 - v * (height / 2 - 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }, [data, width, height]);
  return (
    <div style={{ position: "relative", width, height }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ display: "block", width, height, background: "#10131a", borderRadius: 12, boxShadow: "0 0 24px #00ffe7" }} />
      <div className="neon-grid" style={{ width, height, position: "absolute", left: 0, top: 0 }} />
      <div style={{ position: "absolute", right: 16, top: 16, zIndex: 2 }}>
        <span className="segment-readout">{data[data.length - 1]?.toFixed(3)}</span>
      </div>
    </div>
  );
} 