"use client";
import React, { useState, useRef } from "react";
import { MiniHSQNNAdvisor } from "@/components/mini-hs-qnn-advisor";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Sparkles, Minus, Square, MoveDiagonal } from "lucide-react";

interface FloatingMiniAdvisorProps {
  onApplyParameters: (params: any, previousJobId?: string) => void;
  onSaveConfig: (params: any) => void;
  defaultMinimized?: boolean;
}

export default function FloatingMiniAdvisor({ onApplyParameters, onSaveConfig, defaultMinimized = false }: FloatingMiniAdvisorProps) {
  // All hooks at the top, always called
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [size, setSize] = useState({ width: 420, height: 520 });
  const [expandedPosition, setExpandedPosition] = useState({ top: 64, left: 64 });
  const minimizedPosition = { bottom: 32, right: 32 };
  const [isClient, setIsClient] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ top: number; left: number; mouseX: number; mouseY: number } | null>(null);
  const [resizing, setResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const resizeStart = useRef<{ width: number; height: number; mouseX: number; mouseY: number; direction: string; top: number; left: number } | null>(null);

  // Effects
  React.useEffect(() => {
    setIsClient(true);
    const updatePosition = () => {
      const top = Math.max(32, window.innerHeight - 520 - 32);
      const left = Math.max(32, window.innerWidth - 420 - 32);
      setExpandedPosition({ top, left });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    setExpandedPosition({
      top: dragStart.current.top + dy,
      left: dragStart.current.left + dx,
    });
  };
  const onMouseUp = () => {
    setDragging(false);
    dragStart.current = null;
    document.body.style.userSelect = "";
  };
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  const onResizeMouseMove = (e: MouseEvent) => {
    if (!resizing || !resizeStart.current) return;
    const dx = e.clientX - resizeStart.current.mouseX;
    const dy = e.clientY - resizeStart.current.mouseY;
    let newWidth = size.width;
    let newHeight = size.height;
    let newTop = expandedPosition.top;
    let newLeft = expandedPosition.left;
    const dir = resizeStart.current.direction;
    if (dir === "right") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + dx));
    }
    if (dir === "left") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width - dx));
      newLeft = resizeStart.current.left + dx;
    }
    if (dir === "bottom") {
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + dy));
    }
    if (dir === "top") {
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height - dy));
      newTop = resizeStart.current.top + dy;
    }
    if (dir === "top-left") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width - dx));
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height - dy));
      newLeft = resizeStart.current.left + dx;
      newTop = resizeStart.current.top + dy;
    }
    if (dir === "top-right") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + dx));
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height - dy));
      newTop = resizeStart.current.top + dy;
    }
    if (dir === "bottom-left") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width - dx));
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + dy));
      newLeft = resizeStart.current.left + dx;
    }
    if (dir === "bottom-right") {
      newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + dx));
      newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + dy));
    }
    setSize({ width: newWidth, height: newHeight });
    setExpandedPosition({ top: newTop, left: newLeft });
  };
  const onResizeMouseUp = () => {
    setResizing(false);
    setResizeDirection(null);
    resizeStart.current = null;
    document.body.style.userSelect = "";
  };
  React.useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", onResizeMouseMove);
      window.addEventListener("mouseup", onResizeMouseUp);
    } else {
      window.removeEventListener("mousemove", onResizeMouseMove);
      window.removeEventListener("mouseup", onResizeMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onResizeMouseMove);
      window.removeEventListener("mouseup", onResizeMouseUp);
    };
  }, [resizing]);

  // Only after all hooks, do a conditional render
  if (!isClient) return <div style={{ display: 'none' }} />;

  // Drag logic using top/left
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = {
      top: expandedPosition.top,
      left: expandedPosition.left,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
    document.body.style.userSelect = "none";
  };

  // Update resize logic to use top/left for left/top handles
  const minWidth = 320;
  const maxWidth = 700;
  const minHeight = 320;
  const maxHeight = 900;

  const onResizeMouseDown = (direction: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    setResizeDirection(direction);
    resizeStart.current = {
      width: size.width,
      height: size.height,
      mouseX: e.clientX,
      mouseY: e.clientY,
      direction,
      top: expandedPosition.top,
      left: expandedPosition.left,
    };
    document.body.style.userSelect = "none";
  };

  // Resize handle styles (6px at edge/corner)
  const handleStyle = (cursor: string, top?: string, right?: string, bottom?: string, left?: string, width?: string, height?: string) => ({
    position: "absolute" as const,
    zIndex: 1100,
    width: width || (cursor.includes("ew-resize") ? "6px" : cursor.includes("-resize") ? "6px" : "100%"),
    height: height || (cursor.includes("ns-resize") ? "6px" : cursor.includes("-resize") ? "6px" : "100%"),
    top,
    right,
    bottom,
    left,
    cursor,
    background: "transparent",
    userSelect: "none" as const,
  });

  // Helper to check if event is on a resize handle
  const isOnResizeHandle = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    return el.classList.contains("resize-handle");
  };

  // Only drag if not on a resize handle
  const onWindowMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (["button", "input", "textarea", "select", "svg", "path"].includes(tag)) return;
    if (isOnResizeHandle(e)) return;
    onMouseDown(e);
  };

  if (isMinimized) {
    return (
      <div
        className="fixed z-[1200] neon-border glass shadow-2xl"
        style={{
          bottom: 32,
          right: 32,
          width: 80,
          height: 80,
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px #00ffe7, 0 0 48px #00aaff',
          background: 'rgba(20, 20, 40, 0.92)',
        }}
      >
        <Button
          variant="ghost"
          className="rounded-full p-0 m-0 h-16 w-16 flex items-center justify-center neon-btn"
          onClick={() => setIsMinimized(false)}
          aria-label="Expand Advisor"
          >
          <Sparkles className="h-8 w-8 text-neon-cyan animate-pulse" />
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: expandedPosition.top,
        left: expandedPosition.left,
        zIndex: 1000,
        width: size.width,
        height: size.height,
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        minWidth: minWidth,
        minHeight: minHeight,
        boxSizing: "border-box",
        overflow: "auto",
      }}
      onMouseDown={onWindowMouseDown}
    >
      {/* Resize handles for all sides and corners (6px at edge/corner, with class for detection) */}
      {/* Corners */}
      <div className="resize-handle" style={handleStyle("nwse-resize", "0", undefined, undefined, "0", "6px", "6px")} onMouseDown={onResizeMouseDown("top-left")} />
      <div className="resize-handle" style={handleStyle("nesw-resize", "0", "0", undefined, undefined, "6px", "6px")} onMouseDown={onResizeMouseDown("top-right")} />
      <div className="resize-handle" style={handleStyle("nesw-resize", undefined, "0", "0", undefined, "6px", "6px")} onMouseDown={onResizeMouseDown("bottom-right")} />
      <div className="resize-handle" style={handleStyle("nwse-resize", undefined, undefined, "0", "0", "6px", "6px")} onMouseDown={onResizeMouseDown("bottom-left")} />
      {/* Sides */}
      <div className="resize-handle" style={handleStyle("ns-resize", "0", "6px", undefined, "6px", undefined, "6px")} onMouseDown={onResizeMouseDown("top")} />
      <div className="resize-handle" style={handleStyle("ew-resize", "6px", "0", "6px", undefined, "6px", undefined)} onMouseDown={onResizeMouseDown("right")} />
      <div className="resize-handle" style={handleStyle("ns-resize", undefined, "6px", "0", "6px", undefined, "6px")} onMouseDown={onResizeMouseDown("bottom")} />
      <div className="resize-handle" style={handleStyle("ew-resize", "6px", undefined, "6px", "0", "6px", undefined)} onMouseDown={onResizeMouseDown("left")} />
      <div className="rounded-2xl shadow-2xl border border-primary/20 bg-background dark:bg-zinc-900 backdrop-blur-lg overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/10 bg-transparent select-none">
          <div className="flex-1 flex items-center px-6 py-4 text-lg font-bold text-primary bg-transparent">
            <Sparkles className="h-6 w-6 text-accent" />
            <span className="tracking-tight ml-2">HS-QNN Mini Advisor</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mx-2"
            aria-label="Minimize Advisor"
            onClick={() => setIsMinimized(true)}
            tabIndex={0}
          >
            <Minus className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
        <div className="px-6 pt-4 pb-3 bg-background dark:bg-zinc-900">
          <div className="font-semibold text-base text-primary mb-1">AI-Specific Advice for Your Next Training Run</div>
          <div className="border-t border-border/40 my-2" />
        </div>
        <div className="px-6 pb-6 pt-2 bg-background dark:bg-zinc-900">
          <MiniHSQNNAdvisor
            onApplyParameters={onApplyParameters}
            onSaveConfig={onSaveConfig}
          />
        </div>
      </div>
    </div>
  );
} 