import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Brain, Wand2, Save, Download, Loader2, AlertCircle, Play } from "lucide-react";
import { adviseHSQNNParameters, type HSQNNAdvisorInput, type HSQNNAdvisorOutput } from "@/ai/flows/hs-qnn-parameter-advisor";
import { type TrainingJob, type TrainingJobSummary, type TrainingParameters } from "@/types/training";
import { defaultZPEParams } from "@/lib/constants";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";

interface HSQNNAdvisorProps {
  onApplyParameters: (params: TrainingParameters, previousJobId?: string) => void;
  onSaveConfig: (params: TrainingParameters) => void;
  className?: string;
}

interface JobResponse {
  jobs: TrainingJobSummary[];
}

export function HSQNNAdvisor({ onApplyParameters, onSaveConfig, className }: HSQNNAdvisorProps) {
  const [completedJobs, setCompletedJobs] = useState<TrainingJobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [advisorObjective, setAdvisorObjective] = useState<string>("Maximize validation accuracy while maintaining ZPE stability and exploring a slight increase in learning rate if previous accuracy was high.");
  const [advisorResult, setAdvisorResult] = useState<HSQNNAdvisorOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<TrainingJob | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const fetchCompletedJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?limit=50`);
      if (!response.ok) throw new Error("Failed to fetch completed jobs list");
      const data = await response.json() as JobResponse;
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

  const parseLogMessagesToZpeHistory = (logMessages: string[]): Array<{ epoch: number; zpe_effects: number[] }> => {
    if (!logMessages) return [];
    const zpeHistory: Array<{ epoch: number; zpe_effects: number[] }> = [];
    let currentEpoch = 0;
    let currentLoss = 0;
    let currentAccuracy = 0;

    // First pass: collect all epoch end messages to establish epoch numbers
    const epochEndMessages = logMessages
      .filter(log => log.includes('END - TrainL:'))
      .map(log => {
        const match = log.match(/E(\d+) END - TrainL: [\d.]+, ValAcc: ([\d.]+)%, ValL: ([\d.]+)/);
        if (match) {
          return {
            epoch: parseInt(match[1]),
            accuracy: parseFloat(match[2]),
            loss: parseFloat(match[3])
          };
        }
        return null;
      })
      .filter((entry): entry is { epoch: number; accuracy: number; loss: number } => entry !== null)
      .sort((a, b) => a.epoch - b.epoch);

    // Second pass: collect ZPE effects and associate with epochs
    for (const log of logMessages) {
      const zpeMatch = log.match(/ZPE: \[([,\d\s.]+)\]/);
      if (zpeMatch) {
        try {
          const zpeValues = zpeMatch[1].split(',').map(s => parseFloat(s.trim())).filter(s => !isNaN(s));
          if (zpeValues.length === 6) {
            // Find the most recent epoch end message before this ZPE log
            const epochInfo = epochEndMessages.find(e => e.epoch === currentEpoch) || 
                            epochEndMessages[epochEndMessages.length - 1];
            
            if (epochInfo) {
              zpeHistory.push({
                epoch: epochInfo.epoch,
                zpe_effects: zpeValues
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse ZPE effects string:", zpeMatch[1], e);
        }
      } else {
        // Update current epoch if we find an epoch end message
        const epochMatch = log.match(/E(\d+) END - TrainL: [\d.]+, ValAcc: ([\d.]+)%, ValL: ([\d.]+)/);
        if (epochMatch) {
          currentEpoch = parseInt(epochMatch[1]);
          currentAccuracy = parseFloat(epochMatch[2]);
          currentLoss = parseFloat(epochMatch[3]);
        }
      }
    }

    // Sort by epoch and ensure we have entries for all epochs
    return zpeHistory
      .sort((a, b) => a.epoch - b.epoch)
      .filter((entry, index, array) => {
        // Remove duplicate entries for the same epoch
        return index === 0 || entry.epoch !== array[index - 1].epoch;
      });
  };

  // Utility to load the ZPE stats dataset from localStorage
  function loadZpeStatsDataset() {
    try {
      const key = 'zpeStatsDataset';
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
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

    try {
    // Parse ZPE history with loss and accuracy
    const zpeHistory = parseLogMessagesToZpeHistory(selectedJobDetails.log_messages || []);
    // Load the full ZPE stats dataset
    const zpeStatsDataset = loadZpeStatsDataset();

    // Format the ZPE history string with all metrics
    const zpeHistoryString = zpeHistory
      .map(entry => {
        const epochLog = selectedJobDetails.log_messages.find(log => 
          log.includes(`E${entry.epoch} END`) && log.includes('ValAcc')
        );
        let loss = 0;
        let accuracy = 0;
        if (epochLog) {
          const match = epochLog.match(/E\d+ END - TrainL: [\d.]+, ValAcc: ([\d.]+)%, ValL: ([\d.]+)/);
          if (match) {
            accuracy = parseFloat(match[1]);
            loss = parseFloat(match[2]);
          }
        }
        return `Epoch ${entry.epoch}: ZPE=[${entry.zpe_effects.map(z => z.toFixed(3)).join(', ')}], Loss=${loss.toFixed(4)}, Acc=${accuracy.toFixed(4)}`;
      })
        .join('\n') + `\nFinal Accuracy: ${selectedJobDetails.accuracy?.toFixed(4) ?? 'N/A'}%`;

    const inputForAI: any = {
      previousJobId: selectedJobDetails.job_id,
      hnnObjective: advisorObjective,
      previousJobZpeHistory: zpeHistory,
      previousJobZpeHistoryString: zpeHistoryString,
      previousTrainingParameters: selectedJobDetails.parameters,
      zpeStatsDataset, // <-- pass the full dataset for advisor use
    };

      const result = await adviseHSQNNParameters(inputForAI);
      setAdvisorResult(result);
    } catch (error: any) {
      setError("Failed to get advice: " + (error?.message || error?.toString() || "Unknown error. Is the backend running?"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAdvice = async () => {
    if (!advisorResult?.suggestedNextTrainingParameters) {
      setError("No advice to apply");
      return;
    }

    const suggested = advisorResult.suggestedNextTrainingParameters;
    const previousParams = selectedJobDetails?.parameters;

    // Start with defaults
    let mergedParams: TrainingParameters = {
      ...defaultZPEParams,
    };

    // Override with previous job's parameters
    if (previousParams) {
      mergedParams = {
        ...mergedParams,
        ...previousParams,
      };
    }

    // Finally, override with suggested parameters
    mergedParams = {
      ...mergedParams,
      ...suggested,
      modelName: suggested.modelName || `${previousParams?.modelName || 'ZPE-QuantumWeaver'}_adv_${Date.now().toString().slice(-3)}`,
      baseConfigId: selectedJobDetails?.job_id,
    };

    // Check if the selected job has a corresponding .pth file
    if (selectedJobDetails?.job_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/status/${selectedJobDetails.job_id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job status: ${response.statusText}`);
        }
        const jobStatus = await response.json();
        if (jobStatus.status !== "completed") {
          console.warn(`Warning: Selected job ${selectedJobDetails.job_id} is not completed. No .pth file may exist.`);
        }
      } catch (error) {
        console.error("Error checking job status:", error);
      }
    }

    // Pass previous job ID to parent for PTH file loading
    onApplyParameters(mergedParams, selectedJobDetails?.job_id);
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
          <Brain className="h-5 w-5 text-primary" /> HS-QNN Advisor
        </CardTitle>
        <CardDescription>Get AI-driven suggestions for your next training step.</CardDescription>
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

        <div className="space-y-2">
          <Label htmlFor="advisorObjective">Advisor Objective</Label>
          <Textarea
            id="advisorObjective"
            value={advisorObjective}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAdvisorObjective(e.target.value)}
            placeholder="e.g., Maximize validation accuracy while maintaining ZPE stability..."
            className="min-h-[80px] w-full"
          />
        </div>

        {selectedJobDetails && (
          <div className="space-y-2">
            <Label>Selected Job Details</Label>
            <pre className="p-2 bg-muted rounded-md text-sm overflow-auto max-h-32">
              {JSON.stringify(selectedJobDetails.parameters, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {advisorResult && (
          <div className="space-y-2">
            <Label>Advisor Reasoning</Label>
            <pre className="p-2 bg-muted rounded-md text-sm whitespace-pre-wrap overflow-auto max-h-32">
              {advisorResult.reasoning || "No reasoning provided."}
            </pre>
            <Separator />
            <Label>Suggested Parameters</Label>
            <pre className="p-2 bg-muted rounded-md text-sm overflow-auto max-h-32">
              {JSON.stringify(advisorResult.suggestedNextTrainingParameters, null, 2)}
            </pre>
            <div className="flex gap-2">
              <Button onClick={handleApplyAdvice} disabled={isLoading} className="instrument-btn">
                <Wand2 className="mr-2 h-4 w-4" /> Load in Trainer
              </Button>
              <Button variant="outline" onClick={handleSaveConfig} disabled={isLoading} className="instrument-btn">
                <Save className="mr-2 h-4 w-4" /> Save Config
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGetAdvice} disabled={isLoading || !selectedJobId} className="instrument-btn">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Advice...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" /> Get HNN Advice
            </>
          )}
        </Button>
      </CardFooter>
    </div>
  );
} 