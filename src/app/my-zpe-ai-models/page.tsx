"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import type { TrainingParameters, TrainingJob, TrainingJobSummary } from "@/types/training";
import type { ModelConfig as SavedModelConfig } from "@/types/entities";
import {
  Settings, Plus, Trash, Copy, Eye, Layers, RefreshCw, Play, Filter, ListChecks, Info, BrainCircuit, MessageSquare, Send, Loader2, Wand2, SlidersHorizontal, Save, Download, Lightbulb, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { format, formatDistanceToNow } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { adviseHSQNNParameters, type HSQNNAdvisorInput, type HSQNNAdvisorOutput } from "@/ai/flows/hs-qnn-parameter-advisor";
import { z } from "zod";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";

interface ZpeAiModelListItem {
  id: string;
  name: string;
  type: "config" | "job";
  status?: TrainingJob["status"];
  accuracy: number;
  date: string;
  parameters: TrainingParameters;
  jobDetails?: TrainingJobSummary;
  configDetails?: SavedModelConfig;
  rawItem: TrainingJob | TrainingJobSummary | SavedModelConfig;
}

const defaultZPEParamsArrays: Required<Pick<TrainingParameters, "momentumParams" | "strengthParams" | "noiseParams" | "couplingParams">> = {
  momentumParams: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65],
  strengthParams: [0.35, 0.33, 0.31, 0.6, 0.27, 0.5],
  noiseParams: [0.3, 0.28, 0.26, 0.35, 0.22, 0.25],
  couplingParams: [0.85, 0.82, 0.79, 0.76, 0.73, 0.7],
};

const initialNewConfigParameters: TrainingParameters = {
  totalEpochs: 30,
  batchSize: 32,
  learningRate: 0.001,
  weightDecay: 0.0001,
  ...defaultZPEParamsArrays,
  quantumCircuitSize: 32,
  labelSmoothing: 0.1,
  quantumMode: true,
  modelName: "ZPE-New-Config",
  baseConfigId: null,
  mixupAlpha: 0.2,
};

const TrainingParametersSchemaForAI = z.object({
  totalEpochs: z.number().int().min(1).max(200),
  batchSize: z.number().int().min(8).max(256),
  learningRate: z.number().min(0.00001).max(0.1),
  weightDecay: z.number().min(0).max(0.1),
  momentumParams: z.array(z.number().min(0).max(1)).length(6, "Momentum parameters must have 6 values."),
  strengthParams: z.array(z.number().min(0).max(1)).length(6, "Strength parameters must have 6 values."),
  noiseParams: z.array(z.number().min(0).max(1)).length(6, "Noise parameters must have 6 values."),
  couplingParams: z.array(z.number().min(0).max(1)).length(6, "Coupling parameters must have 6 values."),
  quantumCircuitSize: z.number().int().min(4).max(64),
  labelSmoothing: z.number().min(0).max(0.5),
  quantumMode: z.boolean(),
  modelName: z.string().min(1),
 channel_sizes: z.array(z.number().int()).optional(),
  baseConfigId: z.string().nullable().optional(),
});

interface ZpeHistoryEntry {
  epoch: number;
  zpeEffects: number[]; // Keep this line
  zpe_effects: number[]; // Ensure this line is present
  loss: number;
  accuracy: number;
}


function parseLogMessagesToZpeHistory(logMessages: string[] | undefined): ZpeHistoryEntry[] {
  if (!logMessages) return [];

  const zpeHistory: ZpeHistoryEntry[] = [];
  const zpeRegex = /ZPE: \[(.*?)\]/;
  const epochLossAccRegex = /E(\d+) END - TrainL: [\d\.]+, ValAcc: ([\d\.]+)%, ValL: ([\d\.]+)/;

  let currentLoss = 0;
  let currentAccuracy = 0;

  for (const message of logMessages) {
    const match = message.match(zpeRegex);
    if (match) {
      try {
        const zpeEffectsString = match[1];
        const zpeEffects = zpeEffectsString.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (zpeHistory.length + 1 > 0 && zpeEffects.length > 0) { // Use length + 1 as epoch counter
          // We keep both zpeEffects and zpe_effects for now to satisfy interface requirements and AI input
          zpeHistory.push({
            epoch: zpeHistory.length + 1, // Assign epoch based on position after encountering ZPE effects
            zpeEffects: zpeEffects, // Assign zpeEffects here
            zpe_effects: zpeEffects, // Assign zpeEffects here as well
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
      }
    }
  }

  return zpeHistory.sort((a, b) => a.epoch - b.epoch);
}

export default function MyZpeAiModelsPage() {
  const [allItems, setAllItems] = useState<ZpeAiModelListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmittingNewConfig, setIsSubmittingNewConfig] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ZpeAiModelListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const router = useRouter();

  const [newConfigParams, setNewConfigParams] = useState<TrainingParameters>(initialNewConfigParameters);
  const [newConfigName, setNewConfigName] = useState<string>("ZPE-Custom-Config");

  const [completedJobsListForAdvisor, setCompletedJobsListForAdvisor] = useState<TrainingJobSummary[]>([]);
  const [selectedJobIdForAdvisor, setSelectedJobIdForAdvisor] = useState<string>("");
  const [miniAdvisorObjective, setMiniAdvisorObjective] = useState<string>("Maximize validation accuracy while keeping ZPE effects for all layers between 0.05 and 0.15. Consider a slight increase in learning rate if previous accuracy was high.");
  const [miniAdvisorResult, setMiniAdvisorResult] = useState<HSQNNAdvisorOutput | null>(null);
  const [isLoadingMiniAdvisor, setIsLoadingMiniAdvisor] = useState<boolean>(false);
  const [isMiniAdvisorLoadingJobs, setIsMiniAdvisorLoadingJobs] = useState<boolean>(false);
  const [miniAdvisorError, setMiniAdvisorError] = useState<string | null>(null);
  const [selectedPreviousJobDetailsForAdvisor, setSelectedPreviousJobDetailsForAdvisor] = useState<TrainingJob | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsResponse, configsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/jobs?limit=100`),
        fetch(`${API_BASE_URL}/configs`),
      ]);

      if (!jobsResponse.ok) throw new Error("Failed to fetch jobs list");
      if (!configsResponse.ok) throw new Error("Failed to fetch configurations");

      const jobsData = await jobsResponse.json();
      const configsData = await configsResponse.json();

      const jobItems: ZpeAiModelListItem[] = (jobsData.jobs || []).map((job: TrainingJobSummary) => ({
        id: job.job_id,
        name: job.model_name,
        type: "job" as "job",
        status: job.status,
        accuracy: job.accuracy || 0,
        date: job.start_time || new Date(0).toISOString(),
        parameters: initialNewConfigParameters,
        jobDetails: job,
        rawItem: job,
      }));

      const configItems: ZpeAiModelListItem[] = (configsData.configs || []).map((config: SavedModelConfig) => ({
        id: config.id!,
        name: config.name,
        type: "config" as "config",
        accuracy: config.accuracy || 0,
        date: config.date_created,
        parameters: {
          ...config.parameters,
          couplingParams: config.parameters.couplingParams || defaultZPEParamsArrays.couplingParams,
        },
        configDetails: config,
        rawItem: config,
      }));

      const detailedJobItems = await Promise.all(jobItems.map(async (jobItem) => {
        if (jobItem.type === 'job') {
          try {
            const detailRes = await fetch(`${API_BASE_URL}/status/${jobItem.id}`);
            if (detailRes.ok) {
              const fullJob: TrainingJob = await detailRes.json();
              const fullJobParameters = fullJob.parameters || initialNewConfigParameters;
              fullJobParameters.couplingParams = fullJobParameters.couplingParams || defaultZPEParamsArrays.couplingParams;
              return {
                ...jobItem,
                parameters: fullJobParameters,
                rawItem: fullJob,
              };
            }
          } catch (e) {
            console.error(`Failed to fetch details for job ${jobItem.id}`, e);
          }
        }
        return jobItem;
      }));

      const combinedItems = [...detailedJobItems, ...configItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllItems(combinedItems);

      const completedJobs = detailedJobItems
        .filter(item => item.type === 'job' && item.status === 'completed')
        .map(item => item.jobDetails as TrainingJobSummary)
        .sort((a, b) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());
      setCompletedJobsListForAdvisor(completedJobs);

    } catch (error: any) {
      toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedJobIdForAdvisor) {
      const fetchDetails = async () => {
        setIsMiniAdvisorLoadingJobs(true);
        setMiniAdvisorResult(null);
        setMiniAdvisorError(null);
        try {
          const response = await fetch(`${API_BASE_URL}/status/${selectedJobIdForAdvisor}`);
          if (!response.ok) {
            throw new Error("Failed to fetch job details");
          }
          const jobDetails: TrainingJob = await response.json();
          setSelectedPreviousJobDetailsForAdvisor(jobDetails);
        } catch (error: any) {
          setMiniAdvisorError(error.message);
        } finally {
          setIsMiniAdvisorLoadingJobs(false);
        }
      };
      fetchDetails();
    }
  }, [selectedJobIdForAdvisor]);

  const handleViewItemDetails = (item: ZpeAiModelListItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleCreateConfig = async () => {
    setIsSubmittingNewConfig(true);
    try {
      const { couplingParams, ...paramsForBackend } = newConfigParams;
      const configPayload = {
        name: newConfigName || `ZPE-Config-${Date.now().toString().slice(-4)}`,
        parameters: {
          ...paramsForBackend,
          modelName: newConfigParams.modelName || newConfigName,
        },
        use_quantum_noise: newConfigParams.quantumMode,
        channel_sizes: [64, 128, 256, 512],
        date_created: new Date().toISOString(),
        accuracy: 0,
        loss: 0,
      };

      const response = await fetch(`${API_BASE_URL}/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}. ${errorData.detail || JSON.stringify(errorData)}`);
      }
      await fetchData();
      setNewConfigParams(initialNewConfigParameters);
      setNewConfigName("ZPE-Custom-Config");
      setIsCreating(false);
      toast({ title: "Success", description: `Configuration "${configPayload.name}" created.` });
    } catch (error: any) {
      console.error("Error creating configuration:", error);
      toast({ title: "Error", description: `Failed to create configuration. ${error.message || ''}`, variant: "destructive" });
    }
    setIsSubmittingNewConfig(false);
  };

  const handleCloneItem = async (itemToClone: ZpeAiModelListItem) => {
    try {
      const clonedParamsWithName = {
        ...itemToClone.parameters,
        modelName: `${itemToClone.parameters.modelName}-Clone-${Date.now().toString().slice(-4)}`,
        baseConfigId: itemToClone.type === 'job' ? itemToClone.id : (itemToClone.configDetails?.id || itemToClone.parameters.baseConfigId),
      };
      const { couplingParams, ...paramsForBackend } = clonedParamsWithName;
      const configPayload = {
        name: clonedParamsWithName.modelName,
        parameters: paramsForBackend,
        use_quantum_noise: clonedParamsWithName.quantumMode,
        channel_sizes: itemToClone.configDetails?.channel_sizes || [64, 128, 256, 512],
        date_created: new Date().toISOString(),
        accuracy: itemToClone.type === 'config' ? itemToClone.accuracy : 0,
        loss: itemToClone.type === 'config' ? (itemToClone.configDetails?.loss || 0) : 0,
      };

      const response = await fetch(`${API_BASE_URL}/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to clone: ${errorData.detail || response.statusText}`);
      }
      await fetchData();
      toast({ title: "Success", description: `Configuration "${configPayload.name}" cloned.` });
    } catch (error: any) {
      console.error("Error cloning item:", error);
      toast({ title: "Error", description: `Failed to clone. ${error.message || ''}`, variant: "destructive" });
    }
  };

  const confirmDeleteItem = async () => {
    if (!selectedItem || selectedItem.type !== 'config' || !selectedItem.id) {
      toast({ title: "Cannot Delete", description: "Only saved configurations can be deleted, or item not properly selected.", variant: "destructive" });
      setShowDeletePrompt(false);
      return;
    }
    const configNameToDelete = selectedItem.name;

    try {
      const response = await fetch(`${API_BASE_URL}/configs/${selectedItem.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to delete, server error." }));
        throw new Error(`Failed to delete configuration: ${response.status} - ${errorData.detail}`);
      }
      await fetchData();
      setSelectedItem(null);
      toast({ title: "Success", description: `Configuration "${configNameToDelete}" deleted.` });
    } catch (error: any) {
      console.error("Error deleting configuration:", error);
      toast({ title: "Error", description: `Failed to delete configuration. ${error.message || ''}`, variant: "destructive" });
    } finally {
      setShowDeletePrompt(false);
    }
  };

  // Explicitly specify the type of the item parameter
  const handleLoadInTrainer = (item: ZpeAiModelListItem | Partial<TrainingParameters>, name?: string) => {
 let modelName: string;
 let baseId: string | null | undefined;
    let paramsToLoad: TrainingParameters;

    if ('type' in item) {
      const listItem = item as ZpeAiModelListItem;
      modelName = `${listItem.parameters.modelName}_from_${listItem.type.replace('config', 'Config').replace('job', 'Job')}`;
      baseId = listItem.type === 'config' ? listItem.id : listItem.id;
      paramsToLoad = {
        ...initialNewConfigParameters,
        ...listItem.parameters,
        mixupAlpha: (listItem.parameters as any).mixupAlpha ?? 0.2,
      };
    } else {
      // item is a partial TrainingParameters object (likely from AI Advisor)
      const suggestedParams = item as Partial<TrainingParameters>;
      modelName = name || `AI_Advised_Model_${Date.now().toString().slice(-4)}`;
      baseId = suggestedParams.baseConfigId;
      paramsToLoad = {
        ...initialNewConfigParameters,
 ...suggestedParams,
        couplingParams: suggestedParams.couplingParams || defaultZPEParamsArrays.couplingParams,
        mixupAlpha: (suggestedParams as any).mixupAlpha ?? 0.2,
      };
    }

    const encodedParams = btoa(JSON.stringify(paramsToLoad));
 router.push(`/train?advisedParams=${encodedParams}&name=${encodeURIComponent(modelName)}`);
 toast({ title: "Loading in Trainer", description: `Parameters for "${paramsToLoad.modelName}" pre-filled.` });
  };

  const updateNewConfigParamArray = (paramType: keyof TrainingParameters, index: number, value: number) => {
    setNewConfigParams(prev => {
      const currentParams = prev;
      const paramArray = currentParams[paramType] as number[] | undefined;

      if (Array.isArray(paramArray)) {
        const updatedArray = [...paramArray];
        updatedArray[index] = value;
        return { ...currentParams, [paramType]: updatedArray };
      }
      return prev;
    });
  };

  const ParamArrayDisplay = ({ label, values, isSubtle = false }: { label: string; values: number[] | undefined, isSubtle?: boolean }) => (
    <div className={cn(isSubtle ? "mb-0.5" : "mb-2")}>
      <h4 className={cn("font-medium", isSubtle ? "text-xs text-muted-foreground" : "text-sm")}>{label}:</h4>
      {values && values.length > 0 ? (
        <p className={cn("font-mono bg-muted/50 p-1 rounded text-xs", isSubtle ? "overflow-hidden text-ellipsis whitespace-nowrap" : "overflow-x-auto whitespace-nowrap")}>
          [{values.map(v => v.toFixed(3)).join(", ")}]
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">N/A</p>
      )}
    </div>
  );

  const filteredItems = (typeFilter: "all" | "config" | "job") => {
    if (typeFilter === "all") return allItems;
    return allItems.filter(item => item.type === typeFilter);
  };

  const handleGetMiniAdvice = async () => {
    if (!selectedPreviousJobDetailsForAdvisor) {
      toast({ title: "Error", description: "No previous job selected for HNN advice.", variant: "destructive" });
      return;
    }
    if (selectedPreviousJobDetailsForAdvisor.status !== 'completed') {
      toast({ title: "Invalid Job", description: "Please select a 'completed' job for HNN advice.", variant: "destructive" });
      return;
    }
    setIsLoadingMiniAdvisor(true);
    setMiniAdvisorError(null);
    setMiniAdvisorResult(null);

    let validatedPreviousParams: z.infer<typeof TrainingParametersSchemaForAI>;
    try {
      const paramsToValidate = {
        ...initialNewConfigParameters,
        ...selectedPreviousJobDetailsForAdvisor.parameters,
        couplingParams: selectedPreviousJobDetailsForAdvisor.parameters.couplingParams || defaultZPEParamsArrays.couplingParams,
      };
      validatedPreviousParams = TrainingParametersSchemaForAI.parse(paramsToValidate);
    } catch (validationError: any) {
      console.error("Validation error for previousTrainingParameters (mini advisor):", validationError.flatten().fieldErrors);
      setMiniAdvisorError("Previous job parameters format error. Check console. " + validationError.message);
      toast({ title: "Parameter Mismatch", description: "Previous job parameters invalid. " + validationError.message, variant: "destructive" });
      setIsLoadingMiniAdvisor(false);
      return;
    }

    // Use the shared parseLogMessagesToZpeHistory function
    const zpeHistory = parseLogMessagesToZpeHistory(selectedPreviousJobDetailsForAdvisor.log_messages);

    // Format the zpeHistoryString to match the expected format, including the final accuracy
    const zpeHistoryString = zpeHistory.map(entry =>
      `Epoch ${entry.epoch}: ZPE=[${entry.zpe_effects.map(z => z.toFixed(3)).join(', ')}], Loss=${entry.loss.toFixed(4)}, Acc=${entry.accuracy.toFixed(4)}`
 ).join('\n') + `\nFinal Accuracy: ${selectedPreviousJobDetailsForAdvisor.accuracy.toFixed(4)}%`;

    const inputForAI: HSQNNAdvisorInput = {
      previousJobId: selectedPreviousJobDetailsForAdvisor.job_id,
      previousJobZpeHistory: zpeHistory,
 previousJobZpeHistoryString: zpeHistoryString,
      previousTrainingParameters: validatedPreviousParams,
      hnnObjective: miniAdvisorObjective,
    };

    try {
      const output = await adviseHSQNNParameters(inputForAI);
      setMiniAdvisorResult(output);
      toast({ title: "HNN Advice Generated", description: "AI has provided suggestions." });
    } catch (e: any) {
      setMiniAdvisorError("AI HNN advice generation failed: " + e.message);
      toast({ title: "HNN Advice Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsLoadingMiniAdvisor(false);
    }
  };

  const handleSaveSuggestedParametersFromAdvisor = async () => {
    if (!miniAdvisorResult?.suggestedNextTrainingParameters || !selectedPreviousJobDetailsForAdvisor) {
      toast({ title: "Error", description: "No suggested parameters to save.", variant: "destructive" });
      return;
    }

    // Add null check for selectedPreviousJobDetailsForAdvisor before accessing parameters
    const channelSizes = selectedPreviousJobDetailsForAdvisor ? (selectedPreviousJobDetailsForAdvisor.parameters as TrainingParameters & { channel_sizes?: number[]; }).channel_sizes || [64, 128, 256, 512] : [64, 128, 256, 512];

    const fullParametersForSave: TrainingParameters = {
      ...initialNewConfigParameters,
      ...selectedPreviousJobDetailsForAdvisor.parameters,
      ...miniAdvisorResult.suggestedNextTrainingParameters,
      couplingParams: miniAdvisorResult.suggestedNextTrainingParameters.couplingParams || selectedPreviousJobDetailsForAdvisor.parameters.couplingParams || defaultZPEParamsArrays.couplingParams,
      modelName: miniAdvisorResult.suggestedNextTrainingParameters.modelName || `${selectedPreviousJobDetailsForAdvisor.parameters.modelName}_advised_${Date.now().toString().slice(-4)}`,
      baseConfigId: selectedPreviousJobDetailsForAdvisor.job_id,
    };

    const backendSafeParameters: Omit<TrainingParameters, 'couplingParams'> = {
      totalEpochs: Number(fullParametersForSave.totalEpochs) || initialNewConfigParameters.totalEpochs,
      batchSize: Number(fullParametersForSave.batchSize) || initialNewConfigParameters.batchSize,
      learningRate: Number(fullParametersForSave.learningRate) || initialNewConfigParameters.learningRate,
      weightDecay: Number(fullParametersForSave.weightDecay) || initialNewConfigParameters.weightDecay,
      momentumParams: fullParametersForSave.momentumParams,
      strengthParams: fullParametersForSave.strengthParams,
      noiseParams: fullParametersForSave.noiseParams,
      quantumCircuitSize: Number(fullParametersForSave.quantumCircuitSize) || initialNewConfigParameters.quantumCircuitSize,
      labelSmoothing: Number(fullParametersForSave.labelSmoothing) || initialNewConfigParameters.labelSmoothing,
      quantumMode: fullParametersForSave.quantumMode,
      modelName: fullParametersForSave.modelName,
      baseConfigId: fullParametersForSave.baseConfigId,
    };

    const configToSave = {
      name: fullParametersForSave.modelName,
      parameters: backendSafeParameters,
      use_quantum_noise: fullParametersForSave.quantumMode || false, // Ensure use_quantum_noise is boolean
      channel_sizes: selectedPreviousJobDetailsForAdvisor.parameters.channel_sizes || [64, 128, 256, 512], // Correctly access channel_sizes from parameters
      date_created: new Date().toISOString(),
      accuracy: 0,
      loss: 0,
    };

    setIsSubmittingNewConfig(true);
    try {
      const response = await fetch(`${API_BASE_URL}/configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save configuration: ${response.status} ${response.statusText}. ${errorData.detail || ''}`);
      }
      const saved = await response.json();
      toast({ title: "Configuration Saved", description: `Config "${configToSave.name}" (ID: ${saved.config_id.slice(-6)}) saved.` });
      await fetchData();
    } catch (error: any) {
      console.error("Error saving suggested parameters:", error);
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingNewConfig(false);
    }
  };

  const handleDownloadSuggestedParametersFromAdvisor = () => {
    if (!miniAdvisorResult?.suggestedNextTrainingParameters || !selectedPreviousJobDetailsForAdvisor) {
      toast({ title: "Error", description: "No suggested parameters to download.", variant: "destructive" });
      return;
    }
    const suggested = miniAdvisorResult.suggestedNextTrainingParameters;
    const filename = `${suggested.modelName || `advised_params_${Date.now().toString().slice(-4)}`}.json`;

    const fullSuggestedParams: TrainingParameters = {
      ...initialNewConfigParameters,
      ...selectedPreviousJobDetailsForAdvisor.parameters,
      ...suggested,
      modelName: suggested.modelName || `${selectedPreviousJobDetailsForAdvisor.parameters.modelName}_advised_${Date.now().toString().slice(-4)}`,
      baseConfigId: selectedPreviousJobDetailsForAdvisor.job_id,
      couplingParams: suggested.couplingParams || selectedPreviousJobDetailsForAdvisor.parameters.couplingParams || defaultZPEParamsArrays.couplingParams,
    };

    const jsonStr = JSON.stringify(fullSuggestedParams, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Parameters Downloaded", description: `Saved as ${filename}` });
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2"><ListChecks /> My ZPE-AI Models</h1>
          <p className="text-muted-foreground">Manage saved configurations and review past training job history. Use the HS-QNN advisor for AI-driven parameter suggestions.</p>
        </div>  
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Lists
          </Button>
          <Button variant="default" onClick={() => setIsCreating(!isCreating)}>
            {isCreating ? "Cancel New Config" : <><Plus className="h-4 w-4 mr-2" />Create New Config</>}
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card className="mb-6 border-primary/30 shadow-lg">
          <CardHeader><CardTitle className="text-xl">Create New Configuration</CardTitle><CardDescription>Define parameters for a new ZPE model configuration.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="config-name">Config Name</Label><Input id="config-name" placeholder="e.g., ZPE-ResNet-Variant1" value={newConfigName} onChange={(e) => setNewConfigName(e.target.value)}/></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="quantum-noise">Use Quantum Noise</Label><Switch id="quantum-noise" checked={newConfigParams.quantumMode} onCheckedChange={(checked) => setNewConfigParams(p => ({...p, quantumMode: checked}))}/></div></div>

            <Tabs defaultValue="general" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="zpe">ZPE Params</TabsTrigger>
                <TabsTrigger value="architecture">Architecture</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="totalEpochs">Total Epochs</Label><Input id="totalEpochs" type="number" value={newConfigParams.totalEpochs} onChange={(e) => setNewConfigParams(p => ({...p, totalEpochs: parseInt(e.target.value,10)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="batchSize">Batch Size</Label><Input id="batchSize" type="number" value={newConfigParams.batchSize} onChange={(e) => setNewConfigParams(p => ({...p, batchSize: parseInt(e.target.value,10)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="learningRate">Learning Rate</Label><Input id="learningRate" type="number" step="0.0001" value={newConfigParams.learningRate} onChange={(e) => setNewConfigParams(p => ({...p, learningRate: parseFloat(e.target.value)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="weightDecay">Weight Decay</Label><Input id="weightDecay" type="number" step="0.0001" value={newConfigParams.weightDecay} onChange={(e) => setNewConfigParams(p => ({...p, weightDecay: parseFloat(e.target.value)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="quantumCircuitSize">Quantum Circuit Size</Label><Input id="quantumCircuitSize" type="number" value={newConfigParams.quantumCircuitSize} onChange={(e) => setNewConfigParams(p => ({...p, quantumCircuitSize: parseInt(e.target.value,10)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="labelSmoothing">Label Smoothing</Label><Input id="labelSmoothing" type="number" step="0.01" value={newConfigParams.labelSmoothing} onChange={(e) => setNewConfigParams(p => ({...p, labelSmoothing: parseFloat(e.target.value)||0}))}/></div>
                  <div className="space-y-2"><Label htmlFor="modelNameParam">Model Name (Internal)</Label><Input id="modelNameParam" type="text" value={newConfigParams.modelName} onChange={(e) => setNewConfigParams(p => ({...p, modelName: e.target.value}))}/></div>
                </div>
              </TabsContent>
              <TabsContent value="zpe" className="space-y-3 pt-3">
                {(["momentumParams", "strengthParams", "noiseParams", "couplingParams"] as (keyof TrainingParameters)[]).map((paramKey) => (
                  <div key={paramKey as string} className="space-y-3">
                    <h4 className="text-sm font-medium capitalize">{paramKey.replace('Params', '')} Parameters</h4>
                    {(newConfigParams[paramKey] as number[]).map((value, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs"><Label>Layer {idx + 1}</Label><span className="font-mono">{typeof value === 'number' ? value.toFixed(2) : 'N/A'}</span></div>
                        <Slider min={0} max={1} step={0.01} value={[typeof value === 'number' ? value : 0]} onValueChange={(newValue) => updateNewConfigParamArray(paramKey, idx, newValue[0])}/>
                      </div>
                    ))}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="architecture" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">Channel sizes are defaulted. This section can be expanded for more architecture controls.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="border-t pt-6"><Button onClick={handleCreateConfig} className="w-full" disabled={isSubmittingNewConfig}>{isSubmittingNewConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Plus className="h-4 w-4 mr-2" />}Create Config</Button></CardFooter>
        </Card>
      )}

      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all"><Filter className="mr-2 h-4 w-4"/>All ({allItems.length})</TabsTrigger>
          <TabsTrigger value="config"><Settings className="mr-2 h-4 w-4"/>Saved Configs ({filteredItems('config').length})</TabsTrigger>
          <TabsTrigger value="job"><Layers className="mr-2 h-4 w-4"/>Job History ({filteredItems('job').length})</TabsTrigger>
        </TabsList>

        {["all", "config", "job"].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {tabValue === "all" ? "All Models & Jobs" : tabValue === "config" ? "Saved Configurations" : "Training Job History"}
                </CardTitle>
                <CardDescription>
                  {tabValue === "all" ? "Combined list of saved configurations and past training jobs." :
                   tabValue === "config" ? "Manage your saved model parameter sets." :
                   "Review parameters and outcomes of past training sessions."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && <div className="flex justify-center py-10"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>}
                {!isLoading && filteredItems(tabValue as "all" | "config" | "job").length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <ListChecks className="mx-auto h-12 w-12 mb-4" />
                    No items found for this view.
                  </div>
                )}
                {!isLoading && filteredItems(tabValue as "all" | "config" | "job").length > 0 && (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status/Acc.</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems(tabValue as "all" | "config" | "job").map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge variant={item.type === "config" ? "secondary" : "outline"}>
                                {item.type === "config" ? "Config" : "Job"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.type === "job" && item.status && (
                                <Badge variant={item.status === "running" ? "default" : item.status === "completed" ? "default" : "outline"}
                                  className={cn(item.status === "failed" || item.status === "stopped" ? "bg-red-600 text-white" : "", item.status === "completed" ? "bg-green-500 hover:bg-green-600 text-primary-foreground" : item.status === "running" ? "bg-blue-500 hover:bg-blue-600 text-primary-foreground animate-pulse" : "")}>{item.status}</Badge>
                              )}
                              {item.type === "config" && `${item.accuracy.toFixed(2)}%`}
                              {item.type === "job" && item.status !== "running" && item.status !== "pending" && ` / ${item.accuracy.toFixed(2)}%`}
                            </TableCell>
                            <TableCell>
                              {item.date ? (
                                item.type === 'job' && item.jobDetails?.start_time ? formatDistanceToNow(new Date(item.jobDetails.start_time), { addSuffix: true }) :
                                format(new Date(item.date), "MMM d, yyyy")
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="outline" size="sm" onClick={() => handleViewItemDetails(item)}><Eye className="mr-1 h-3 w-3"/>View</Button>
                              <Button variant="outline" size="sm" onClick={() => handleLoadInTrainer(item)}><Play className="mr-1 h-3 w-3"/>Train</Button>
                              <Button variant="outline" size="sm" onClick={() => handleCloneItem(item)}><Copy className="mr-1 h-3 w-3"/>Clone</Button>
                              {item.type === "config" && <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setShowDeletePrompt(true);}}><Trash className="mr-1 h-3 w-3 text-red-500"/>Delete</Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {selectedItem && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary"/> {selectedItem.type === 'config' ? 'Config' : 'Job'} Details: {selectedItem.name}
              </DialogTitle>
              <DialogDescription>
                Configuration for {selectedItem.type}: <span className="font-mono text-xs">{selectedItem.id.replace('zpe_job_','').replace('config_','')}</span>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 pr-3">
              <div className="space-y-3 text-sm py-4">
                <h3 className="font-semibold text-base mb-2 border-b pb-1">General Settings</h3>
                <p><strong>Model Name:</strong> {selectedItem.parameters.modelName}</p>
                <p><strong>Total Epochs:</strong> {selectedItem.parameters.totalEpochs}</p>
                <p><strong>Batch Size:</strong> {selectedItem.parameters.batchSize}</p>
                <p><strong>Learning Rate:</strong> {selectedItem.parameters.learningRate}</p>
                <p><strong>Weight Decay:</strong> {selectedItem.parameters.weightDecay}</p>
                <p><strong>Label Smoothing:</strong> {selectedItem.parameters.labelSmoothing}</p>

                <h3 className="font-semibold text-base mt-3 mb-2 border-b pb-1">ZPE Settings</h3>
                <ParamArrayDisplay label="Momentum Parameters" values={selectedItem.parameters.momentumParams} />
                <ParamArrayDisplay label="Strength Parameters" values={selectedItem.parameters.strengthParams} />
                <ParamArrayDisplay label="Noise Parameters" values={selectedItem.parameters.noiseParams} />
                <ParamArrayDisplay label="Coupling Parameters" values={selectedItem.parameters.couplingParams} />

                <h3 className="font-semibold text-base mt-3 mb-2 border-b pb-1">Quantum Settings</h3>
                <p><strong>Quantum Mode:</strong> {selectedItem.parameters.quantumMode ? "Enabled" : "Disabled"}</p>
                <p><strong>Quantum Circuit Size:</strong> {selectedItem.parameters.quantumCircuitSize} Qubits</p>

                {selectedItem.parameters.baseConfigId && <p className="mt-2"><strong>Base Config ID:</strong> <span className="font-mono text-xs">{selectedItem.parameters.baseConfigId}</span></p>}
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => {handleLoadInTrainer(selectedItem); setIsDetailModalOpen(false);}}>
                    <Play className="mr-2 h-4 w-4"/> Load in Trainer
                  </Button>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showDeletePrompt && selectedItem && selectedItem.type === 'config' && (
        <Dialog open={showDeletePrompt} onOpenChange={setShowDeletePrompt}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to delete configuration "{selectedItem.name}"? This action cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeletePrompt(false)}>Cancel</Button>
              <Button variant="outline" className="bg-red-600 text-white" onClick={confirmDeleteItem}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Card className="mt-6 bg-accent/10 border-accent/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Info className="h-5 w-5 text-accent-foreground/80"/>Understanding "My ZPE-AI Models"</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-accent-foreground/80 space-y-2">
          <p>This page unifies your saved configurations and training job history.</p>
          <p><strong>Saved Configurations:</strong> Parameter sets you've created or cloned. Load them into the trainer, clone, or delete.</p>
          <p><strong>Job History:</strong> Records of past training runs. View parameters and load them into the trainer for a new run.</p>
          <p><strong>HS-QNN Advisor:</strong> Select a completed job and specify an objective. The AI will suggest parameters for your next HNN step. You can then apply these to the trainer, save them as a new configuration, or download them.</p>
        </CardContent>
      </Card>
    </div>
  );
}