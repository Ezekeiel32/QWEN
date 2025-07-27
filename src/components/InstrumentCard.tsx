import React from 'react';
import { ChartPanel, TerminalPanel } from './DashboardPanels';

interface InstrumentCardProps {
  jobId: string | null;
  jobStatus: any;
  logs: string[];
  metrics: { epoch: number; loss: number; accuracy: number; val_loss?: number; val_accuracy?: number }[];
  isPolling: boolean;
  isLoading: boolean;
  startJob: (params: any) => void;
  stopJob: () => void;
  freeze: () => void;
  resume: () => void;
  clearLogs: () => void;
  exportLogs: () => void;
  exportMetrics: () => void;
  setJobId: (id: string | null) => void;
  advisorParams?: any;
  onStartAdvisorTraining?: (params: any) => void;
}

const InstrumentCard: React.FC<InstrumentCardProps> = ({
  jobId, jobStatus, logs, metrics, isPolling, isLoading,
  startJob, stopJob, freeze, resume, clearLogs, exportLogs, exportMetrics, setJobId,
  advisorParams, onStartAdvisorTraining
}) => {
  return (
    <div className="instrument-card w-full h-full flex flex-col relative" style={{ 
      fontFamily: 'Share Tech Mono, Space Mono, VT323, monospace', 
      background: '#0a0f1c',
      boxShadow: '0 0 32px 4px #00f0ff55, 0 0 64px 8px #00aaff33',
      border: '3px solid #00ffe7'
    }}>
      {/* Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="instrument-grid-overlay w-full h-full opacity-20" />
      </div>
      <div className="relative z-10 flex flex-col h-full w-full">
        <div className="flex-none h-[60%] min-h-[320px] max-h-[70vh] relative">
          {/* ChartPanel with config button slot */}
          <div className="absolute top-4 right-6 z-20">
            {/* Config button will be rendered here by parent via portal or prop */}
            {/* Placeholder for config button */}
            <div id="config-btn-slot" />
          </div>
          <ChartPanel metrics={metrics} jobStatus={jobStatus} isLoading={isLoading} freeze={freeze} resume={resume} exportMetrics={exportMetrics} advisorParams={advisorParams} onStartAdvisorTraining={onStartAdvisorTraining} />
        </div>
        <div className="flex-1 min-h-[180px] max-h-[40vh]">
          <TerminalPanel logs={logs} isPolling={isPolling} clearLogs={clearLogs} exportLogs={exportLogs} stopJob={stopJob} />
        </div>
      </div>
    </div>
  );
};

export default InstrumentCard; 