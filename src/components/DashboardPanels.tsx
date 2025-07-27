'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import NeonAnalyzerChart from './visualizations/NeonAnalyzerChart';

// Chart Panel Component
export const ChartPanel: React.FC<{
  metrics?: { epoch: number; loss: number; accuracy: number; val_loss?: number; val_accuracy?: number }[];
  jobStatus?: string;
  isLoading: boolean;
  freeze: () => void;
  resume: () => void;
  exportMetrics: () => void;
}> = ({ metrics = [], jobStatus = 'idle', isLoading, freeze, resume, exportMetrics }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ 
          width: Math.max(rect.width, 800),
          height: Math.max(rect.height - 80, 600)
        });
      }
    };
    
    handleResize();
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Format metrics for the chart
  const traces = [
    {
      data: metrics.map(m => m.accuracy),
      color: '#39ff14', // Neon green
      label: 'Accuracy'
    },
    {
      data: metrics.map(m => m.loss),
      color: '#ff00ff', // Neon pink
      label: 'Loss'
    },
    {
      data: metrics.map(m => m.val_accuracy || 0),
      color: '#00ffe7', // Neon cyan
      label: 'Val Acc'
    }
  ];

  // Get latest metrics for header
  const latestMetrics = metrics[metrics.length - 1];
  const currentEpoch = latestMetrics?.epoch || 0;
  const totalEpochs = 60; // This should come from your training config
  const currentAccuracy = latestMetrics?.accuracy?.toFixed(2) || 0;
  const currentLoss = latestMetrics?.loss?.toFixed(4) || 0;

  // Status display text
  const statusText = typeof jobStatus === 'string' && jobStatus.length > 0 ? jobStatus.toUpperCase() : 'IDLE';
  const isRunning = jobStatus === 'running';

  return (
    <div className="flex flex-col h-full w-full min-h-[700px] bg-[#0a0f1c] rounded-lg border border-[#00ffe7]/30 shadow-lg shadow-[#00ffe7]/20">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#00ffe7]/20">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-[#00ffe7] font-mono">SPECTRUM ANALYZER</h2>
          <Badge variant="outline" className={`${isRunning ? 'animate-pulse' : ''} bg-[#00ffe7]/10 text-[#00ffe7] border-[#00ffe7]/30`}>
            {isRunning ? 'LIVE' : 'FROZEN'}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={isRunning ? freeze : resume}
            className="border-[#00ffe7] text-[#00ffe7] hover:bg-[#00ffe7]/10"
          >
            {isRunning ? 'FREEZE' : 'RESUME'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportMetrics}
            className="border-[#00ffe7] text-[#00ffe7] hover:bg-[#00ffe7]/10"
          >
            EXPORT
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#0a0f1c]/80 border-b border-[#00ffe7]/20">
        <div className="flex items-center space-x-4">
          <span className="text-[#00ffe7] font-mono">
            Epoch: {currentEpoch}/{totalEpochs}
          </span>
          <span className="text-[#39ff14] font-mono">
            Accuracy: {currentAccuracy}%
          </span>
          <span className="text-[#ff00ff] font-mono">
            Loss: {currentLoss}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#39ff14] animate-pulse' : 'bg-[#ff0000]'}`} />
          <span className="text-[#00ffe7] font-mono text-sm">
            {statusText}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-2 min-h-[600px]" ref={containerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#00ffe7] font-mono animate-pulse">Initializing Quantum Interface...</div>
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#00ffe7] font-mono">No training data yet</div>
          </div>
        ) : (
          <NeonAnalyzerChart
            traces={traces}
            width={size.width}
            height={size.height}
            overlays={[
              { text: 'Training Metrics', color: '#39ff14', x: 120, y: 40, fontSize: 24 }
            ]}
            showLegend
          />
        )}
      </div>
    </div>
  );
};

// Terminal Panel Component
export const TerminalPanel: React.FC<{
  logs: string[];
  isPolling: boolean;
  clearLogs: () => void;
  exportLogs: () => void;
  stopJob: () => void;
}> = ({ logs, isPolling, clearLogs, exportLogs, stopJob }) => {
  // Only show the last 17 lines
  const visibleLogs = (logs ?? []).slice(-17);
  return (
    <Card className="terminal-panel h-full w-[96%] ml-auto mr-0 bg-black/95 border-neon-green/30 shadow-neon-green/20" style={{ fontFamily: 'Share Tech Mono, Space Mono, VT323, monospace', marginTop: '-8px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px', boxShadow: '0 0 24px #00ffae44' }}>
      <div className="terminal-header p-3 border-b border-neon-green/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
            <h3 className="text-neon-green font-mono text-sm font-medium">TRAINING LOG</h3>
            <Badge variant="outline" className="border-neon-green/50 text-neon-green text-xs">{isPolling ? 'ACTIVE' : 'FROZEN'}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-neon-green/70 font-mono text-xs">LINES: {(logs ?? []).length}</span>
            <Button size="sm" variant="outline" className="h-5 px-2 border-neon-green/30 text-neon-green text-xs" onClick={clearLogs}>
              CLEAR
            </Button>
            <Button size="sm" variant="outline" className="h-5 px-2 border-neon-green/30 text-neon-green text-xs" onClick={exportLogs}>
              EXPORT
            </Button>
            <Button size="sm" variant="outline" className="h-5 px-2 border-neon-red/30 text-neon-red text-xs" onClick={stopJob}>
              STOP
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="terminal-content h-full">
        <div className="p-3 space-y-1">
          {visibleLogs.length === 0 ? (
            <div className="font-mono text-xs text-neon-blue/70">No logs yet.</div>
          ) : (
            visibleLogs.map((line, idx) => (
              <div key={idx} className="font-mono text-xs text-neon-green whitespace-pre-wrap">
                {line}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

// Controls Panel Component
export const ControlsPanel: React.FC = () => {
  return (
    <Card className="controls-panel h-full w-full bg-black/90 border-neon-purple/30 shadow-neon-purple/20">
      <div className="controls-header p-4 border-b border-neon-purple/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-neon-purple rounded-full"></div>
            <h3 className="text-neon-purple font-mono text-sm font-medium">CONTROL CENTER</h3>
            <Badge variant="outline" className="border-neon-purple/50 text-neon-purple text-xs">
              READY
            </Badge>
          </div>
        </div>
      </div>
      
      <ScrollArea className="controls-content h-full">
        <div className="p-4 space-y-6">
          {/* Training Controls */}
          <div className="control-section">
            <h4 className="text-neon-purple font-mono text-sm font-medium mb-3">TRAINING CONTROLS</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-neon-blue font-mono text-xs">AUTO TRAIN</Label>
                <Switch className="data-[state=checked]:bg-neon-blue" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-neon-blue font-mono text-xs">EARLY STOPPING</Label>
                <Switch className="data-[state=checked]:bg-neon-blue" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-neon-blue font-mono text-xs">GRADIENT CLIPPING</Label>
                <Switch className="data-[state=checked]:bg-neon-blue" />
              </div>
            </div>
          </div>

          <Separator className="bg-neon-purple/20" />

          {/* Hyperparameters */}
          <div className="control-section">
            <h4 className="text-neon-purple font-mono text-sm font-medium mb-3">HYPERPARAMETERS</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-neon-blue font-mono text-xs">LEARNING RATE</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Slider defaultValue={[1]} max={100} step={1} className="flex-1" />
                  <Input 
                    className="w-16 h-6 bg-black border-neon-blue/30 text-neon-blue text-xs text-center"
                    defaultValue="0.001"
                  />
                </div>
              </div>
              <div>
                <Label className="text-neon-blue font-mono text-xs">BATCH SIZE</Label>
                <Select defaultValue="32">
                  <SelectTrigger className="w-full h-8 bg-black border-neon-blue/30 text-neon-blue text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-neon-blue/30">
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                    <SelectItem value="64">64</SelectItem>
                    <SelectItem value="128">128</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-neon-blue font-mono text-xs">EPOCHS</Label>
                <Input 
                  className="w-full h-8 bg-black border-neon-blue/30 text-neon-blue text-xs"
                  defaultValue="100"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-neon-purple/20" />

          {/* Model Configuration */}
          <div className="control-section">
            <h4 className="text-neon-purple font-mono text-sm font-medium mb-3">MODEL CONFIG</h4>
            <div className="space-y-4">
              <div>
                <Label className="text-neon-blue font-mono text-xs">MODEL TYPE</Label>
                <Select defaultValue="qnn">
                  <SelectTrigger className="w-full h-8 bg-black border-neon-blue/30 text-neon-blue text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-neon-blue/30">
                    <SelectItem value="qnn">QUANTUM NEURAL NET</SelectItem>
                    <SelectItem value="cnn">CONVOLUTIONAL NET</SelectItem>
                    <SelectItem value="rnn">RECURRENT NET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-neon-blue font-mono text-xs">OPTIMIZER</Label>
                <Select defaultValue="adam">
                  <SelectTrigger className="w-full h-8 bg-black border-neon-blue/30 text-neon-blue text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-neon-blue/30">
                    <SelectItem value="adam">ADAM</SelectItem>
                    <SelectItem value="sgd">SGD</SelectItem>
                    <SelectItem value="rmsprop">RMSPROP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-neon-purple/20" />

          {/* Action Buttons */}
          <div className="control-section">
            <h4 className="text-neon-purple font-mono text-sm font-medium mb-3">ACTIONS</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-8 border-neon-green/30 text-neon-green text-xs">
                START TRAIN
              </Button>
              <Button variant="outline" className="h-8 border-neon-red/30 text-neon-red text-xs">
                STOP TRAIN
              </Button>
              <Button variant="outline" className="h-8 border-neon-blue/30 text-neon-blue text-xs">
                SAVE MODEL
              </Button>
              <Button variant="outline" className="h-8 border-neon-purple/30 text-neon-purple text-xs">
                LOAD MODEL
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}; 