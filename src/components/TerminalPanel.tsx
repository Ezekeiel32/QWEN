import React, { useEffect, useRef } from 'react';

interface TerminalPanelProps {
  logs: string[];
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ logs }) => {
  const terminalRef = useRef<HTMLPreElement>(null);

  // Filter out any log messages containing the word "Batch"
  const filteredLogs = logs.filter(log => !log.includes("Batch"));

  useEffect(() => {
    if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  return (
    <div className="panel-3d-flat flex flex-col h-full">
      <h2 className="panel-title">Terminal</h2>
      <div className="flex-grow bg-black/50 rounded-md mt-2 p-1 overflow-hidden">
        <pre 
            ref={terminalRef} 
            className="h-full w-full minimal-scrollbar overflow-y-auto text-xs text-green-400 font-mono p-4"
        >
          {filteredLogs.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default TerminalPanel; 