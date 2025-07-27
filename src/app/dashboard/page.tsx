"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import {
  Home, Cpu, Zap, Atom, BarChart3, Settings, PlayCircle, Lightbulb,
  Replace, Cog, Scaling, Box, Share2, Wrench, BrainCircuit, Globe, 
  ScatterChart, IterationCw, Database, MessageSquare, Signal, SlidersHorizontal, Monitor, TrendingUp, Wand2, Rocket, ArrowRight, Settings2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartPanel, TerminalPanel, ControlsPanel } from '@/components/DashboardPanels';

const appFeatures = [
  { href: "/train", label: "Train Model", icon: PlayCircle, description: "Configure and initiate ZPE model training jobs." },
  { href: "/model-configs", label: "Model Configs", icon: Database, description: "Manage and compare different model configurations." },
  { href: "/configurations", label: "Job History", icon: BarChart3, description: "Review parameters and outcomes of past training." }, 
  { href: "/performance", label: "Performance Analysis", icon: TrendingUp, description: "Analyze training metrics and model health." },
  { href: "/architecture", label: "Model Architecture", icon: Cpu, description: "Explore the ZPE Quantum Neural Network structure." },
  { href: "/gpu-monitor", label: "GPU Monitor", icon: Monitor, description: "Live statistics for your primary GPU resources." },
  { href: "/zpe-flow-analysis", label: "ZPE Flow Analysis", icon: SlidersHorizontal, description: "Interactively analyze ZPE flow parameters." },
  { href: "/zpe-flow", label: "HS-QNN Advisor", icon: BrainCircuit, description: "AI advice for Hilbert Space QNN parameters." },
  { href: "/quantum-noise", label: "Quantum Noise", icon: Atom, description: "Generate and analyze quantum-derived noise patterns." },
  { href: "/rf-generator", label: "RF Generator", icon: Signal, description: "Configure RF waves for conceptual network influence." },
  { href: "/ai-analysis", label: "AI Assistant", icon: MessageSquare, description: "Chat with an AI for insights and optimization." },
  { href: "/ai", label: "AI Flows Hub", icon: Rocket, description: "Access all specialized GenAI-powered tools." },
  { href: "/vis/bloch-sphere", label: "Bloch Sphere", icon: Globe, description: "Visualize qubit states in Hilbert space." },
  { href: "/vis/dynamic-formation", label: "Dynamic Formation", icon: IterationCw, description: "Conceptual visualization of dynamic particle formations." },
  { href: "/vis/zpe-particle-simulation", label: "ZPE Particle Sim", icon: ScatterChart, description: "Interactive 3D ZPE particle system." },
  { href: "/cloud-gpu", label: "Cloud GPU Connect", icon: Settings2, description: "Connect to third-party cloud GPU providers." },
];

// Minimal type for job
interface Job {
  job_id: string;
  model_name?: string;
  status?: string;
  accuracy?: number;
  zpe_effects?: number[];
  parameters?: {
    modelName?: string;
    quantumMode?: boolean;
    keyFeature?: string;
  };
}

// Dummy data for demonstration; replace with real API calls as needed
const demoMetrics = Array.from({ length: 40 }, (_, i) => ({
  epoch: i + 1,
  loss: Math.max(0, 1.2 - i * 0.02 + Math.random() * 0.05),
  accuracy: Math.min(1, 0.5 + i * 0.012 + Math.random() * 0.03),
  val_loss: Math.max(0, 1.1 - i * 0.018 + Math.random() * 0.07),
  val_accuracy: Math.min(1, 0.48 + i * 0.013 + Math.random() * 0.04),
}));
const demoLogs = Array.from({ length: 30 }, (_, i) => `Epoch ${i + 1}: Training... Loss: ${(1.2 - i * 0.02).toFixed(4)}, Acc: ${(0.5 + i * 0.012).toFixed(4)}`);

export default function DashboardPage() {
  const [latestJob, setLatestJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState(demoMetrics);
  const [logs, setLogs] = useState(demoLogs);

  const fetchLatestJob = useCallback(async () => {
    setIsLoading(true);
    try {
      const jobsRes = await fetch("/api/jobs?limit=10");
      const jobsData = await jobsRes.json();
      const jobs: Job[] = (jobsData.jobs || []).filter((job: Job) => ["completed", "running", "stopped"].includes(job.status || ""));
      if (jobs.length > 0) {
        const latest = jobs[0];
        const detailRes = await fetch(`/api/status/${latest.job_id}`);
        const detail: Job = await detailRes.json();
        setLatestJob({ ...latest, ...detail });
      } else {
        setLatestJob(null);
      }
    } catch (e) {
      setLatestJob(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestJob();
  }, [fetchLatestJob]);

  // Fallback if no job
  const latestModelData = latestJob ? {
    name: latestJob.parameters?.modelName || latestJob.model_name || "-",
    accuracy: latestJob.accuracy || 0,
    zpeLayers: Array.isArray(latestJob.zpe_effects) ? latestJob.zpe_effects.length : 6,
    avgZPEEffect: Array.isArray(latestJob.zpe_effects) && latestJob.zpe_effects.length > 0 ? (latestJob.zpe_effects.reduce((a: number, b: number) => a + b, 0) / latestJob.zpe_effects.length) : 0,
    quantumMode: latestJob.parameters?.quantumMode ?? false,
    keyFeature: latestJob.parameters?.keyFeature || "-"
  } : {
    name: "-",
    accuracy: 0,
    zpeLayers: 6, 
    avgZPEEffect: 0,
    quantumMode: false,
    keyFeature: "-"
  };

  // Dummy handlers for panel actions
  const freeze = () => {};
  const resume = () => {};
  const exportMetrics = () => {};
  const clearLogs = () => setLogs([]);
  const exportLogs = () => {};
  const stopJob = () => {};

  return (
    <div className="w-full min-h-screen p-4 md:p-8 flex flex-col items-center bg-black/95 relative">
      {/* Neon grid overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="instrument-grid-overlay w-full h-full" />
      </div>
      {/* Welcome/overview section */}
      <div className="w-full max-w-6xl mb-8 z-10">
        <Card className="bg-black/80 border-neon-blue/30 shadow-neon-blue/20 mb-4">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
              <Zap className="h-10 w-10 text-neon-cyan animate-pulse" />
            <div>
                <CardTitle className="text-3xl font-headline tracking-tight text-neon-cyan">
                  Quantum Weaver Instrument Dashboard
              </CardTitle>
                <CardDescription className="text-lg text-neon-blue/80">
                  Live AI Model Training & Analysis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      </div>
      {/* Instrument grid layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-6 z-10">
        {/* ChartPanel (spans 3 columns on large screens) */}
        <div className="col-span-1 lg:col-span-3 row-span-2">
          <ChartPanel
            metrics={metrics}
            jobStatus={latestJob ? { status: latestJob.status } : { status: "completed" }}
            isLoading={isLoading}
            freeze={freeze}
            resume={resume}
            exportMetrics={exportMetrics}
          />
                </div>
        {/* ControlsPanel (right side, tall) */}
        <div className="col-span-1 lg:col-span-2 row-span-2">
          <ControlsPanel />
                </div>
        {/* TerminalPanel (full width, below chart) */}
        <div className="col-span-1 lg:col-span-5">
          <TerminalPanel
            logs={logs}
            isPolling={false}
            clearLogs={clearLogs}
            exportLogs={exportLogs}
            stopJob={stopJob}
          />
        </div>
      </div>
    </div>
  );
}
