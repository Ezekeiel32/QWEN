import React, { useRef, useEffect, useState } from "react";

interface Trace {
  data: number[];
  color?: string; // e.g. "#ffe066", "#ff00ff", "#00ffe7"
  label?: string;
}
interface Marker {
  x: number; // index in data
  y: number; // value
  label?: string;
  color?: string;
}
interface Overlay {
  text: string;
  color?: string;
  x?: number;
  y?: number;
  fontSize?: number;
}
interface NeonAnalyzerChartProps {
  traces: Trace[];
  width?: number;
  height?: number;
  overlays?: Overlay[];
  markers?: Marker[];
  gridColor?: string;
  bgColor?: string;
  showLegend?: boolean;
  yMin?: number;
  yMax?: number;
  jobName?: string;
}

const defaultColors = ["#ffe066", "#ff00ff", "#00ffe7", "#39ff14", "#ffffff"];

// --- Trace color presets ---
const colorPresets = [
  ["#ffe066", "#ff00ff", "#00ffe7", "#39ff14", "#ffffff"], // Neon
  ["#ffb300", "#1e88e5", "#43a047", "#e53935", "#8e24aa"], // Pro VNA
  ["#00e5ff", "#ff4081", "#ffd600", "#00c853", "#d500f9"], // Modern
];

export default function NeonAnalyzerChart({
  traces,
  width = 800,
  height = 400,
  overlays = [],
  markers = [],
  gridColor = "#00ffe7",
  bgColor = "#0a0f1c",
  showLegend = true,
  yMin = 0,
  yMax = 100,
  jobName,
}: NeonAnalyzerChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState<number | null>(null);
  const [panVelocity, setPanVelocity] = useState(0);
  const [lastPanTime, setLastPanTime] = useState<number | null>(null);
  const [userPanned, setUserPanned] = useState(false);
  const [draggedMarker, setDraggedMarker] = useState<number | null>(null);
  const [measureMarkers, setMeasureMarkers] = useState<{ x: number; y: number }[]>([]);

  // Auto-pan to latest data if not manually panned
  useEffect(() => {
    if (!userPanned && traces[0]?.data.length > 0) {
      setPan(1);
    }
  }, [traces, userPanned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable shadow for glow effects
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00ffe7';

    // Clear canvas with dark background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    const drawGrid = () => {
      ctx.strokeStyle = '#00ffe733';
      ctx.lineWidth = 0.5;

      // Vertical grid lines
      for (let x = 50; x < width - 20; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height - 50);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = 20; y < height - 50; y += 50) {
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    };

    // Draw glowing axes
    const drawAxes = () => {
      ctx.strokeStyle = '#00ffe7';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(50, 20);
      ctx.lineTo(50, height - 50);
      ctx.lineTo(width - 20, height - 50);
      ctx.stroke();
      ctx.shadowBlur = 5;
    };

    // Draw y-axis labels with cyberpunk style
    const drawYLabels = () => {
      ctx.fillStyle = '#00ffe7';
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.textAlign = 'right';
      const step = (yMax - yMin) / 5;
      for (let i = 0; i <= 5; i++) {
        const y = height - 50 - (i / 5) * (height - 70);
        const value = yMin + i * step;
        ctx.fillText(value.toFixed(1), 45, y + 4);
      }
    };

    // Draw x-axis labels
    const drawXLabels = () => {
      ctx.fillStyle = '#00ffe7';
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      const maxEpochs = Math.max(...traces.map(t => t.data.length));
      const step = Math.ceil(maxEpochs / 10);
      for (let i = 0; i <= maxEpochs; i += step) {
        const x = 50 + (i / maxEpochs) * (width - 70);
        ctx.fillText(i.toString(), x, height - 35);
      }
    };

    // Draw traces with glow effect
    const drawTraces = () => {
      traces.forEach(trace => {
        if (!trace.data.length) return;

        ctx.strokeStyle = trace.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];
        ctx.lineWidth = 2;
        ctx.shadowColor = trace.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const xScale = (width - 70) / (trace.data.length - 1);
        const yScale = (height - 70) / (yMax - yMin);

        trace.data.forEach((value, i) => {
          const x = 50 + i * xScale;
          const y = height - 50 - (value - yMin) * yScale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      });
    };

    // Draw legend with cyberpunk style
    const drawLegend = () => {
      if (!showLegend) return;

      const legendX = width - 150;
      const legendY = 30;
      const lineLength = 20;

      traces.forEach((trace, i) => {
        const y = legendY + i * 25;
        
        // Draw line with glow
        ctx.strokeStyle = trace.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];
        ctx.shadowColor = trace.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(legendX, y);
        ctx.lineTo(legendX + lineLength, y);
        ctx.stroke();

        // Draw label
        ctx.shadowBlur = 0;
        ctx.fillStyle = trace.color || defaultColors[Math.floor(Math.random() * defaultColors.length)];
        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(trace.label || `Trace ${i + 1}`, legendX + lineLength + 10, y + 4);
      });
    };

    // Draw overlays with glow effect
    const drawOverlays = () => {
      overlays.forEach(overlay => {
        ctx.fillStyle = overlay.color || '#ff0000';
        ctx.shadowColor = overlay.color || '#ff0000';
        ctx.shadowBlur = 8;
        ctx.font = `${overlay.fontSize || 24}px "Share Tech Mono", monospace`;
        ctx.fillText(overlay.text, overlay.x || 0, overlay.y || 0);
      });
    };

    // Draw markers
    [...markers, ...measureMarkers].forEach(marker => {
      ctx.fillStyle = marker.color || '#ff0000';
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Execute all drawing functions
    drawGrid();
    drawAxes();
    drawYLabels();
    drawXLabels();
    drawTraces();
    drawLegend();
    drawOverlays();

  }, [traces, width, height, overlays, markers, showLegend, yMin, yMax]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking near any existing markers
      const n = traces[0]?.data.length || 0;
      const windowSize = Math.floor(n / zoom);
      const startIdx = Math.floor((n - windowSize) * pan);
    const xScale = (width - 70) / (windowSize - 1);

    for (let i = 0; i < measureMarkers.length; i++) {
      const marker = measureMarkers[i];
      const markerScreenX = 50 + (marker.x - startIdx) * xScale;
      if (Math.abs(x - markerScreenX) < 10) {
        setDraggedMarker(i);
        return;
      }
    }

    // Otherwise start panning
    setIsPanning(true);
    setPanStartX(e.clientX);
    setUserPanned(true);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setPanStartX(null);
    setPanVelocity(0);
    setDraggedMarker(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedMarker !== null) {
      // Drag marker horizontally
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const n = traces[0]?.data.length || 0;
      const windowSize = Math.floor(n / zoom);
      const startIdx = Math.floor((n - windowSize) * pan);
      let epoch = Math.round(((x - 50) / (width - 70)) * (windowSize - 1)) + startIdx;
      epoch = Math.max(startIdx, Math.min(startIdx + windowSize - 1, epoch));
      const y = traces[0]?.data[epoch] ?? 0;
      setMeasureMarkers(prev => prev.map((m, i) => i === draggedMarker ? { x: epoch, y } : m));
      setUserPanned(true);
      return;
    }

    if (!isPanning || panStartX === null) return;
    const dx = e.clientX - panStartX;
    setPan(prev => {
      let next = Math.max(0, Math.min(1, prev - dx / width / zoom));
      setPanVelocity(dx / ((Date.now() - (lastPanTime || Date.now())) || 1));
      setLastPanTime(Date.now());
      setUserPanned(true);
      return next;
    });
    setPanStartX(e.clientX);
  };

  // Inertial scrolling
  useEffect(() => {
    if (!isPanning && Math.abs(panVelocity) > 0.001) {
      const raf = requestAnimationFrame(() => {
        setPan(prev => {
          let next = Math.max(0, Math.min(1, prev - panVelocity * 0.05));
          if (next === 0 || next === 1) setPanVelocity(0);
          else setPanVelocity(panVelocity * 0.92);
          return next;
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isPanning, panVelocity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
      style={{
        width: '100%',
        height: '100%',
              background: bgColor,
        borderRadius: '8px',
        boxShadow: '0 0 20px rgba(0, 255, 231, 0.2)'
      }}
    />
  );
} 