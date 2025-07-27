"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Signal, Activity, SlidersHorizontal, Radio, Zap, Rss } from 'lucide-react';
import { Tooltip } from "@/components/ui/tooltip";
import NeonAnalyzerChart from '@/components/visualizations/NeonAnalyzerChart';

// Helper to generate waveform data
const generateWaveData = (params: RfParamsType) => {
  const data = [];
  const points = 200;
  for (let i = 0; i < points; i++) {
    const x = (i / (points -1 )) * 2 * Math.PI * params.cyclesToDisplay;
    let yBase;
    switch (params.waveform) {
      case 'sine': yBase = Math.sin(x); break;
      case 'square': yBase = Math.sin(x) >= 0 ? 1 : -1; break;
      case 'sawtooth': yBase = 2 * ( (x / (2*Math.PI*params.cyclesToDisplay) * params.cyclesToDisplay) - Math.floor(0.5 + (x / (2*Math.PI*params.cyclesToDisplay) * params.cyclesToDisplay) ) ); break;
      case 'triangle': yBase = Math.abs( ( (x / Math.PI) % 2) - 1) * 2 - 1; break;
      default: yBase = Math.sin(x);
    }
    let y = params.amplitude * yBase;
    if (params.modulationType !== 'none') {
      const modSignal = Math.sin(x * (params.modulationFrequency / params.frequency) * 0.2);
      if (params.modulationType === 'AM') {
        y *= (1 + params.modulationDepth * modSignal);
      } else if (params.modulationType === 'FM') {
        y = params.amplitude * Math.sin(x + params.modulationDepth * Math.cos(x * (params.modulationFrequency / params.frequency) * 0.2));
      }
    }
    data.push({ name: i, value: y });
  }
  return data;
};

interface RfParamsType {
  frequency: number;
  amplitude: number;
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  modulationType: 'none' | 'AM' | 'FM';
  modulationFrequency: number;
  modulationDepth: number;
  cyclesToDisplay: number;
  pulseWidth: number; 
  dutyCycle: number; 
}

const parameterControls = [
  { id: "frequency" as keyof RfParamsType, label: "Frequency (Relative Units)", min: 0.1, max: 10, step: 0.1, value: undefined, type: "slider"},
  { id: "amplitude" as keyof RfParamsType, label: "Amplitude", min: 0, max: 1, step: 0.01, value: undefined, type: "slider"},
  { id: "waveform" as keyof RfParamsType, label: "Waveform", value: undefined, options: ["sine", "square", "sawtooth", "triangle"], type: "select"},
  { id: "cyclesToDisplay" as keyof RfParamsType, label: "Cycles to Display", min: 1, max: 10, step: 1, value: undefined, type: "slider"},
  { id: "modulationType" as keyof RfParamsType, label: "Modulation", value: undefined, options: ["none", "AM", "FM"], type: "select"},
];

const modulationControls = [
  { id: "modulationFrequency" as keyof RfParamsType, label: "Mod. Frequency (Relative)", min: 0.01, max: 2, step: 0.01, value: undefined, type: "slider"},
  { id: "modulationDepth" as keyof RfParamsType, label: "Mod. Depth", min: 0, max: 1, step: 0.01, value: undefined, type: "slider"},
];

export default function RfWaveGeneratorPage() {
  const [rfParams, setRfParams] = useState<RfParamsType>({
    frequency: 1,
    amplitude: 0.8,
    waveform: 'sine',
    modulationType: 'none',
    modulationFrequency: 0.1,
    modulationDepth: 0.5,
    cyclesToDisplay: 3,
    pulseWidth: 0.5, 
    dutyCycle: 0.5,  
  });
  const [waveData, setWaveData] = useState<{name: number, value: number}[]>([]);
  const [applicationLog, setApplicationLog] = useState<string[]>([]);
  const [conceptualEffect, setConceptualEffect] = useState("Nominal");
  const [injectionMode, setInjectionMode] = useState<string>("noise");

  // Placeholder for integration callback
  const onApplyRfSignature = (rfSignature: any) => {
    // Integrate with backend or NN here
    // e.g., send to API or update global state
    // console.log("RF Signature for NN Integration:", rfSignature);
  };

  useEffect(() => {
    setWaveData(generateWaveData(rfParams));
  }, [rfParams]);

  const handleParamChange = (param: keyof RfParamsType, value: any) => {
    setRfParams(prev => ({ ...prev, [param]: value }));
  };
  
  const handleSliderChange = (param: keyof RfParamsType, valueArray: number[]) => {
    handleParamChange(param, valueArray[0]);
  };

  const applyRfSignature = () => {
    const rfSignature = {
      ...rfParams,
      data: waveData.map(d => d.value),
      mode: injectionMode,
      timestamp: Date.now(),
    };
    const logEntry = `Applied RF Signature [${injectionMode}]: Freq=${rfParams.frequency.toFixed(2)}, Amp=${rfParams.amplitude.toFixed(2)}, Wave=${rfParams.waveform}, Mod=${rfParams.modulationType}`;
    setApplicationLog(prev => [logEntry, ...prev.slice(0, 4)]);
    let effectScore = rfParams.amplitude * 10;
    if (rfParams.waveform === 'square') effectScore *= 1.2;
    if (rfParams.modulationType !== 'none') effectScore *= (1 + rfParams.modulationDepth);
    if (effectScore > 12) setConceptualEffect("High Perturbation");
    else if (effectScore > 7) setConceptualEffect("Moderate Perturbation");
    else if (effectScore > 3) setConceptualEffect("Low Perturbation");
    else setConceptualEffect("Minimal Perturbation");
    onApplyRfSignature(rfSignature);
  };

  // Map current rfParams into controls for rendering
  const parameterControlsWithValues = parameterControls.map(ctrl => ({
    ...ctrl,
    value: rfParams[ctrl.id]
  }));
  const modulationControlsWithValues = modulationControls.map(ctrl => ({
    ...ctrl,
    value: rfParams[ctrl.id]
  }));

  return (
    <CardContent className="space-y-4">
      {/* Injection Mode Selector */}
      <div className="space-y-1">
        <Label className="text-sm">Injection Mode</Label>
        <Select value={injectionMode} onValueChange={setInjectionMode}>
          <SelectTrigger id="injection-mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="noise">
              Inject as Noise
              <span className="text-xs text-muted-foreground block">Adds RF as input noise</span>
            </SelectItem>
            <SelectItem value="weights">
              Modulate Weights
              <span className="text-xs text-muted-foreground block">Multiplies/perturbs NN weights</span>
            </SelectItem>
            <SelectItem value="feature">
              As Feature
              <span className="text-xs text-muted-foreground block">Appends RF as extra input feature</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Existing parameter controls */}
      {parameterControlsWithValues.map(p => (
        <div key={p.id} className="space-y-1">
          <Label htmlFor={p.id} className="text-sm">{p.label}</Label>
          {p.type === "slider" && typeof p.value === "number" && (
            <div className="flex items-center gap-2">
              <Slider id={p.id} min={p.min} max={p.max} step={p.step} value={[p.value]} onValueChange={(v) => handleSliderChange(p.id, v)} />
              <span className="text-xs font-mono w-12 text-right">{p.step && typeof p.step === "number" ? p.value.toFixed(p.step < 0.1 ? 2 : 1) : p.value}</span>
            </div>
          )}
          {p.type === "select" && typeof p.value === "string" && (
            <Select value={p.value} onValueChange={(v) => handleParamChange(p.id, v)}>
              <SelectTrigger id={p.id}><SelectValue/></SelectTrigger>
              <SelectContent>{(p.options as string[]).map(opt => <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      ))}
      {rfParams.modulationType !== 'none' && (
        <>
          <div className="pt-2 border-t"><Label className="text-sm font-medium text-primary">Modulation Settings</Label></div>
          {modulationControlsWithValues.map(p => (
            <div key={p.id} className="space-y-1">
              <Label htmlFor={p.id} className="text-sm">{p.label}</Label>
              {typeof p.value === "number" && (
                <div className="flex items-center gap-2">
                  <Slider id={p.id} min={p.min} max={p.max} step={p.step} value={[p.value]} onValueChange={(v) => handleSliderChange(p.id, v)} />
                  <span className="text-xs font-mono w-12 text-right">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
                </div>
              )}
            </div>
          ))}
        </>
      )}
      <div className="h-64 w-full mb-4">
        <NeonAnalyzerChart
          traces={[
            { data: waveData.map(d => d.value), color: '#00ffe7', label: 'RF Waveform' },
          ]}
          width={600}
          height={220}
          overlays={[
            {
              text: `${typeof rfParams.waveform === 'string' && rfParams.waveform.length > 0
                ? rfParams.waveform.charAt(0).toUpperCase() + rfParams.waveform.slice(1)
                : 'Waveform'} Wave`,
              color: '#39ff14',
              x: 120,
              y: 40,
              fontSize: 20
            },
          ]}
          showLegend
        />
      </div>
    </CardContent>
  );
} 