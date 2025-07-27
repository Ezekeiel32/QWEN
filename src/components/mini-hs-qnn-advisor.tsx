"use client";
import React, { useState, useEffect, useCallback, useContext, createContext, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Save, Loader2, ChevronDown, ChevronUp, RefreshCw, Maximize2, X } from "lucide-react";
import { adviseHSQNNParameters, type HSQNNAdvisorInput, type HSQNNAdvisorOutput } from "@/ai/flows/hs-qnn-parameter-advisor";
import type { TrainingParameters, TrainingJob, TrainingJobSummary } from "@/types/training";
import { toast } from "@/hooks/use-toast";
import { defaultZPEParams } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MiniHSQNNAdvisorProps {
  onApplyParameters: (params: TrainingParameters) => void;
  onSaveConfig: (params: TrainingParameters) => void;
  fullMode?: boolean;
  className?: string;
}

// Advisor Context
interface AdvisorContextType {
  completedJobs: TrainingJobSummary[];
  setCompletedJobs: React.Dispatch<React.SetStateAction<TrainingJobSummary[]>>;
  selectedJobId: string;
  setSelectedJobId: React.Dispatch<React.SetStateAction<string>>;
  advisorObjective: string;
  setAdvisorObjective: React.Dispatch<React.SetStateAction<string>>;
  advisorResult: HSQNNAdvisorOutput | null;
  setAdvisorResult: React.Dispatch<React.SetStateAction<HSQNNAdvisorOutput | null>>;
  selectedJobDetails: TrainingJob | null;
  setSelectedJobDetails: React.Dispatch<React.SetStateAction<TrainingJob | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  isLoadingJobs: boolean;
  setIsLoadingJobs: React.Dispatch<React.SetStateAction<boolean>>;
}

const AdvisorContext = createContext<AdvisorContextType | undefined>(undefined);

export const AdvisorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [completedJobs, setCompletedJobs] = useState<TrainingJobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [advisorObjective, setAdvisorObjective] = useState<string>(
    "Analyze ZPE statistics in general. Determine best parameters to maximize validation accuracy to 100% while maintaining ZPE stability and exploring a slight increase in learning rate if previous accuracy was high."
  );
  const [advisorResult, setAdvisorResult] = useState<HSQNNAdvisorOutput | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<TrainingJob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  return (
    <AdvisorContext.Provider value={{
      completedJobs, setCompletedJobs,
      selectedJobId, setSelectedJobId,
      advisorObjective, setAdvisorObjective,
      advisorResult, setAdvisorResult,
      selectedJobDetails, setSelectedJobDetails,
      isLoading, setIsLoading,
      error, setError,
      isLoadingJobs, setIsLoadingJobs
    }}>
      {children}
    </AdvisorContext.Provider>
  );
};

export function useAdvisorContext() {
  const ctx = useContext(AdvisorContext);
  if (!ctx) throw new Error("useAdvisorContext must be used within AdvisorProvider");
  return ctx;
}

// Custom DraggableModal wrapper
function DraggableModal({ children }: { children: React.ReactNode }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(true);
    setOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });
  };

  const onMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPos({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  const onMouseUp = () => setDragging(false);

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
  });

  return (
    <div
      ref={nodeRef}
      style={{
        position: "fixed",
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        zIndex: 1300,
        transform: "translate(-50%, -50%)",
      }}
    >
      {React.Children.map(children, (child: any) =>
        React.cloneElement(child, {
          // Pass down the drag handle to DialogTitle
          children: React.Children.map(child.props.children, (modalChild: any) => {
            if (
              modalChild &&
              modalChild.type &&
              modalChild.type.displayName === "DialogTitle"
            ) {
              return React.cloneElement(modalChild, {
                className: (modalChild.props.className || "") + " cursor-move",
                onMouseDown,
              });
            }
            return modalChild;
          }),
        })
      )}
    </div>
  );
}

export const MiniHSQNNAdvisor: React.FC<MiniHSQNNAdvisorProps> = ({ onApplyParameters, onSaveConfig, fullMode = false, className }) => {
  const { completedJobs, setCompletedJobs, selectedJobId, setSelectedJobId, advisorObjective, setAdvisorObjective, advisorResult, setAdvisorResult, selectedJobDetails, setSelectedJobDetails, isLoading, setIsLoading, error, setError, isLoadingJobs, setIsLoadingJobs } = useAdvisorContext();
  const router = useRouter();
  // Collapsible state
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showObjective, setShowObjective] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showSuggestedParams, setShowSuggestedParams] = useState(false);
  // Add state for expanded modals
  const [expandedObjective, setExpandedObjective] = useState(false);
  const [expandedJobDetails, setExpandedJobDetails] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState(false);
  const [expandedSuggestedParams, setExpandedSuggestedParams] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";

  // --- Suggestion Memory ---
  // Key for localStorage
  const suggestionKey = selectedJobId ? `hsqnn_advisor_suggestion_${selectedJobId}` : null;

  // Load suggestion from localStorage on mount or when job changes
  useEffect(() => {
    if (!suggestionKey) return;
    const stored = localStorage.getItem(suggestionKey);
    if (stored) {
      try {
        setAdvisorResult(JSON.parse(stored));
      } catch {}
    } else {
      setAdvisorResult(null);
    }
  }, [suggestionKey]);

  // Save suggestion to localStorage when advisorResult changes
  useEffect(() => {
    if (!suggestionKey) return;
    if (advisorResult) {
      localStorage.setItem(suggestionKey, JSON.stringify(advisorResult));
    }
  }, [advisorResult, suggestionKey]);

  // Clear suggestion from localStorage
  const clearSuggestion = () => {
    if (suggestionKey) localStorage.removeItem(suggestionKey);
    setAdvisorResult(null);
  };

  // --- End Suggestion Memory ---

  const fetchCompletedJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?limit=50`);
      if (!response.ok) throw new Error("Failed to fetch completed jobs list");
      const data = await response.json();
      const completedJobs = (data.jobs || [])
        .filter((job: TrainingJobSummary) => job.status === "completed")
        .sort((a: TrainingJobSummary, b: TrainingJobSummary) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());
      setCompletedJobs(completedJobs);
      if (completedJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(completedJobs[0].job_id);
      }
    } catch (error: any) {
      setError("Error fetching completed jobs: " + error.message);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    fetchCompletedJobs();
  }, [fetchCompletedJobs]);

  useEffect(() => {
    if (selectedJobId) {
      const fetchDetails = async () => {
        setIsLoading(true);
        setAdvisorResult(null);
        setError(null);
        try {
          const response = await fetch(`${API_BASE_URL}/status/${selectedJobId}`);
          if (!response.ok) throw new Error(`Failed to fetch details for job ${selectedJobId}`);
          const data = await response.json() as TrainingJob;
          if (data.status !== 'completed') {
            setSelectedJobDetails(null);
            throw new Error(`Job ${selectedJobId} is not completed. Current status: ${data.status}`);
          }
          setSelectedJobDetails(data);
        } catch (e: any) {
          setSelectedJobDetails(null);
          setError("Failed to fetch selected job details: " + e.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetails();
    } else {
      setSelectedJobDetails(null);
    }
  }, [selectedJobId]);

  function parseLogMessagesToZpeHistory(logMessages: string[] | undefined) {
    if (!logMessages) return [];
    const zpeHistory: any[] = [];
    const zpeRegex = /ZPE: \[(.*?)\]/;
    const epochLossAccRegex = /E(\d+) END - TrainL: [\d\.]+, ValAcc: ([\d\.]+)%, ValL: ([\d\.]+)/;
    let currentLoss = 0;
    let currentAccuracy = 0;
    for (const message of logMessages) {
      const match = message.match(zpeRegex);
      if (match) {
        try {
          const zpeEffectsString = match[1];
          const zpeEffects = zpeEffectsString.split(',').map((s: string) => parseFloat(s.trim())).filter((n) => !isNaN(n));
          if (zpeHistory.length + 1 > 0 && zpeEffects.length > 0) {
            zpeHistory.push({
              epoch: zpeHistory.length + 1,
              zpeEffects: zpeEffects,
              zpe_effects: zpeEffects,
              loss: currentLoss,
              accuracy: currentAccuracy,
            });
          }
        } catch (e) {
          console.error("Failed to parse ZPE effects string:", match[1], e);
        }
      } else {
        const epochMatch = message.match(epochLossAccRegex);
        if (epochMatch) {
          currentLoss = parseFloat(epochMatch[3]);
          currentAccuracy = parseFloat(epochMatch[2]);
        }
      }
    }
    return zpeHistory.sort((a, b) => a.epoch - b.epoch);
  }

  const handleGetAdvice = async () => {
    if (!selectedJobDetails) {
      setError("No previous job selected for advice.");
      return;
    }
    if (selectedJobDetails.status !== 'completed') {
      setError("Please select a 'completed' job for advice.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAdvisorResult(null);
    if (suggestionKey) localStorage.removeItem(suggestionKey);
    try {
    const zpeHistory = parseLogMessagesToZpeHistory(selectedJobDetails.log_messages || []);
    const zpeHistoryString = zpeHistory
      .map(entry => `Epoch ${entry.epoch}: ZPE=[${entry.zpe_effects.map((z: number) => z.toFixed(3)).join(', ')}], Loss=${entry.loss.toFixed(4)}, Acc=${entry.accuracy.toFixed(4)}`)
        .join('\n') + `\nFinal Accuracy: ${selectedJobDetails.accuracy?.toFixed(4) ?? 'N/A'}%`;
    const inputForAI: HSQNNAdvisorInput = {
      previousJobId: selectedJobDetails.job_id,
      hnnObjective: advisorObjective,
      previousJobZpeHistory: zpeHistory,
      previousJobZpeHistoryString: zpeHistoryString,
      previousTrainingParameters: selectedJobDetails.parameters,
    };
      const result = await adviseHSQNNParameters(inputForAI);
      setAdvisorResult(result);
      toast({ title: "Advice Generated", description: "AI has provided suggestions for the next HNN step." });
    } catch (error: any) {
      setError("Failed to get advice: " + (error?.message || error?.toString() || "Unknown error. Is the backend running?"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadInTrainer = () => {
    if (!advisorResult?.suggestedNextTrainingParameters) {
      setError("No advice to apply");
      return;
    }
    const suggested = advisorResult.suggestedNextTrainingParameters;
    const previousParams = selectedJobDetails?.parameters;
    let mergedParams: TrainingParameters = { ...defaultZPEParams };
    if (previousParams) {
      mergedParams = { ...mergedParams, ...previousParams };
    }
    mergedParams = {
      ...mergedParams,
      ...suggested,
      modelName: suggested.modelName || `${previousParams?.modelName || 'ZPE-QuantumWeaver'}_adv_${Date.now().toString().slice(-3)}`,
      baseConfigId: selectedJobDetails?.job_id,
    };
    // Pass params as query string
    const params = encodeURIComponent(JSON.stringify(mergedParams));
    router.push(`/train?advisorParams=${params}`);
  };

  const handleSaveConfig = () => {
    if (!advisorResult?.suggestedNextTrainingParameters || !selectedJobDetails) {
      setError("No suggested parameters to save");
      return;
    }
    const suggested = advisorResult.suggestedNextTrainingParameters;
    const configToSave = {
      ...defaultZPEParams,
      ...selectedJobDetails.parameters,
      ...suggested,
      modelName: suggested.modelName || `${selectedJobDetails.parameters.modelName}_advised_${Date.now().toString().slice(-4)}`,
      baseConfigId: selectedJobDetails.job_id,
    };
    onSaveConfig(configToSave);
  };

  return (
    <div className="matrix-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          {fullMode ? "HS-QNN Advisor" : "Mini HS-QNN Advisor"}
          {/* Manual Refresh Button */}
          <button className="instrument-btn ml-2" onClick={handleGetAdvice} disabled={isLoading} title="Refresh AI Suggestion">
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="selectedJobId">Select Previous Job</Label>
          <Select
            value={selectedJobId}
            onValueChange={setSelectedJobId}
            disabled={isLoadingJobs || isLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a completed job..." />
            </SelectTrigger>
            <SelectContent>
              {completedJobs.map((job: TrainingJobSummary) => (
                <SelectItem key={job.job_id} value={job.job_id}>
                  {job.job_id.replace('zpe_job_', '')} ({job.model_name}, Acc: {job.accuracy.toFixed(2)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Collapsible Objective */}
        <div className="space-y-2">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowObjective(v => !v)}>
            <Label htmlFor="advisorObjective">Advisor Objective</Label>
            <div className="flex items-center gap-1">
              <button className="instrument-btn p-0 h-6 w-6 text-accent/70 hover:text-accent transition-colors" onClick={e => { e.stopPropagation(); setExpandedObjective(true); }} title="Expand" tabIndex={-1}>
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              {showObjective ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
          {showObjective && (
            <Textarea
              id="advisorObjective"
              value={advisorObjective}
              onChange={e => setAdvisorObjective(e.target.value)}
              placeholder="e.g., Maximize validation accuracy while maintaining ZPE stability..."
              className="min-h-[80px] w-full"
            />
          )}
          {/* Expanded Modal for Objective */}
          <Dialog open={expandedObjective} onOpenChange={setExpandedObjective}>
            <DraggableModal>
            <DialogContent className="max-w-2xl z-[1200]">
                <DialogTitle className="dialog-title">Advisor Objective</DialogTitle>
              <Textarea
                value={advisorObjective}
                onChange={e => setAdvisorObjective(e.target.value)}
                className="min-h-[200px] w-full"
                autoFocus
              />
            </DialogContent>
            </DraggableModal>
          </Dialog>
        </div>
        {/* Collapsible Job Details */}
        {selectedJobDetails && (
          <div className="space-y-2">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowJobDetails(v => !v)}>
              <Label>Selected Job Details</Label>
              <div className="flex items-center gap-1">
                <button className="instrument-btn p-0 h-6 w-6 text-accent/70 hover:text-accent transition-colors" onClick={e => { e.stopPropagation(); setExpandedJobDetails(true); }} title="Expand" tabIndex={-1}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                {showJobDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {showJobDetails && (
              <pre className="p-2 bg-muted rounded-md text-sm overflow-auto max-h-32">
                {JSON.stringify(selectedJobDetails.parameters, null, 2)}
              </pre>
            )}
            {/* Expanded Modal for Job Details */}
            <Dialog open={expandedJobDetails} onOpenChange={setExpandedJobDetails}>
              <DraggableModal>
              <DialogContent className="max-w-2xl z-[1200]">
                  <DialogTitle className="dialog-title">Selected Job Details</DialogTitle>
                <pre className="p-4 bg-muted rounded-md text-sm overflow-auto max-h-[60vh]">
                  {JSON.stringify(selectedJobDetails.parameters, null, 2)}
                </pre>
              </DialogContent>
              </DraggableModal>
            </Dialog>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {advisorResult && (
          <div className="space-y-2">
            {/* Collapsible Reasoning */}
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowReasoning(v => !v)}>
              <Label>Advisor Reasoning</Label>
              <div className="flex items-center gap-1">
                <button className="instrument-btn p-0 h-6 w-6 text-accent/70 hover:text-accent transition-colors" onClick={e => { e.stopPropagation(); setExpandedReasoning(true); }} title="Expand" tabIndex={-1}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                {showReasoning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {showReasoning && (
              <pre className="p-2 bg-muted rounded-md text-sm whitespace-pre-wrap overflow-auto max-h-32">
                {advisorResult.reasoning || "No reasoning provided."}
              </pre>
            )}
            {/* Expanded Modal for Reasoning */}
            <Dialog open={expandedReasoning} onOpenChange={setExpandedReasoning}>
              <DraggableModal>
              <DialogContent className="max-w-2xl z-[1200]">
                  <DialogTitle className="dialog-title">Advisor Reasoning</DialogTitle>
                <pre className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap overflow-auto max-h-[60vh]">
                  {advisorResult.reasoning || "No reasoning provided."}
                </pre>
              </DialogContent>
              </DraggableModal>
            </Dialog>
            {/* Collapsible Suggested Parameters */}
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSuggestedParams(v => !v)}>
              <Label>Suggested Parameters</Label>
              <div className="flex items-center gap-1">
                <button className="instrument-btn p-0 h-6 w-6 text-accent/70 hover:text-accent transition-colors" onClick={e => { e.stopPropagation(); setExpandedSuggestedParams(true); }} title="Expand" tabIndex={-1}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                {showSuggestedParams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {showSuggestedParams && (
              <pre className="p-2 bg-muted rounded-md text-sm overflow-auto max-h-32">
                {JSON.stringify(advisorResult.suggestedNextTrainingParameters, null, 2)}
              </pre>
            )}
            {/* Expanded Modal for Suggested Parameters */}
            <Dialog open={expandedSuggestedParams} onOpenChange={setExpandedSuggestedParams}>
              <DraggableModal>
              <DialogContent className="max-w-2xl z-[1200]">
                  <DialogTitle className="dialog-title">Suggested Parameters</DialogTitle>
                <pre className="p-4 bg-muted rounded-md text-sm overflow-auto max-h-[60vh]">
                  {JSON.stringify(advisorResult.suggestedNextTrainingParameters, null, 2)}
                </pre>
              </DialogContent>
              </DraggableModal>
            </Dialog>
            <div className="flex gap-2">
              <button className="instrument-btn" onClick={handleLoadInTrainer} disabled={isLoading}>
                <Wand2 className="mr-2 h-4 w-4" /> Load in Trainer
              </button>
              <button className="instrument-btn" onClick={handleSaveConfig} disabled={isLoading}>
                <Save className="mr-2 h-4 w-4" /> Save Config
              </button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <button className="instrument-btn" onClick={handleGetAdvice} disabled={isLoading || !selectedJobId}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Advice...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" /> Get HNN Advice
            </>
          )}
        </button>
      </CardFooter>
    </div>
  );
}; 