"use client";
import React, { useEffect, useRef } from "react";

export function ClientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let lastTime = 0;
    let hue = 180;
    let isActive = true;
    // Throttle animation when tab is inactive
    const handleVisibility = () => { isActive = !document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    const w = canvas.width;
    const h = canvas.height;
    // Precompute particle positions
    const particles = Array.from({length: 32}, (_,i) => ({
      x: Math.random()*w, y: Math.random()*h, r: 2+Math.random()*3, s: 0.5+Math.random()*1.5, a: Math.random()*Math.PI*2
    }));
    function draw(time: number) {
      if (!isActive) { animationFrameId = requestAnimationFrame(draw); return; }
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      hue = (hue + 10*dt) % 360;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      // Parallax shimmer
      ctx.globalAlpha = 0.18 + 0.04 * Math.sin(time/1000);
      // Animated neon grid
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + (time/40)%40, 0);
        ctx.lineTo(x + (time/40)%40, h);
        ctx.strokeStyle = `hsl(${hue},100%,60%)`;
        ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y + (time/60)%40);
        ctx.lineTo(w, y + (time/60)%40);
        ctx.strokeStyle = `hsl(${(hue+60)%360},100%,60%)`;
        ctx.shadowColor = `hsl(${(hue+60)%360},100%,60%)`;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      // Floating neon particles
      for (let p of particles) {
        p.x += Math.cos(p.a) * p.s;
        p.y += Math.sin(p.a) * p.s;
        if (p.x < 0) p.x += w; if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2*Math.PI);
        ctx.fillStyle = `hsla(${(hue+120)%360},100%,60%,0.18)`;
        ctx.shadowColor = `hsl(${(hue+120)%360},100%,60%)`;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      animationFrameId = requestAnimationFrame(draw);
    }
    animationFrameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  return (
    <div className="animated-holo-bg">
      <canvas ref={canvasRef} id="holo-bg-canvas" width="1920" height="1080" style={{ width: '100vw', height: '100vh', display: 'block' }} />
    </div>
  );
} 