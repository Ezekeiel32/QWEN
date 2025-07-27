"use client";
import React, { useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import { Play, StopCircle, Settings, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const trainingFormSchema = z.object({
  modelName: z.string().min(3, "Model name must be at least 3 characters"),
  totalEpochs: z.coerce.number().int().min(1).max(200),
  batchSize: z.coerce.number().int().min(8).max(256),
  learningRate: z.coerce.number().min(0.00001).max(0.1),
  weightDecay: z.coerce.number().min(0).max(0.1),
  mixupAlpha: z.coerce.number().min(0).max(10),
  momentumParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 momentum values"),
  strengthParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 strength values"),
  noiseParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 noise values"),
  couplingParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 coupling values"),
  quantumCircuitSize: z.coerce.number().int().min(4).max(64),
  labelSmoothing: z.coerce.number().min(0).max(0.5),
  quantumMode: z.boolean(),
  baseConfigId: z.string().optional(),
});

const defaultZPEParams = {
  momentum: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65],
  strength: [0.35, 0.33, 0.31, 0.60, 0.27, 0.50],
  noise: [0.3, 0.28, 0.26, 0.35, 0.22, 0.25],
  coupling: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
};

const defaultValues = {
  modelName: "ZPE-Colab-Sim",
  totalEpochs: 30,
  batchSize: 32,
  learningRate: 0.001,
  weightDecay: 0.0001,
  mixupAlpha: 0.5,
  momentumParams: defaultZPEParams.momentum,
  strengthParams: defaultZPEParams.strength,
  noiseParams: defaultZPEParams.noise,
  couplingParams: defaultZPEParams.coupling,
  quantumCircuitSize: 32,
  labelSmoothing: 0.1,
  quantumMode: true,
  baseConfigId: undefined,
};

interface ControlsPanelProps {
    startJob: (params: any) => void;
    stopJob: () => void;
    isJobActive: boolean;
    jobId: string | null;
    jobStatus: string | null;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ startJob, stopJob, isJobActive, jobId, jobStatus }) => {
  const [showConfig, setShowConfig] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { control, handleSubmit, reset, watch, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(trainingFormSchema),
    defaultValues,
  });

  // Helper to render array fields
  const renderParamArrayFields = (paramName: "momentumParams" | "strengthParams" | "noiseParams" | "couplingParams", labelPrefix: string) => (
    <div className="space-y-2">
      <Label className="text-base">{labelPrefix} (6 layers)</Label>
      <div className="grid grid-cols-3 gap-2">
        {(watch(paramName) || []).map((_: any, index: number) => (
          <div key={index} className="space-y-1">
            <Label htmlFor={`${paramName}.${index}`} className="text-xs">L{index + 1}</Label>
            <Controller
              name={`${paramName}.${index}` as any}
              control={control}
              render={({ field, fieldState }) => (
                <>
            <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="h-8"
                  />
                  {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Field controller for text/number fields
  const FieldController = ({ name, label, type = "text", placeholder, min, step }: any) => (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name as any}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <Input {...field} id={name} type={type} placeholder={placeholder} min={min} step={step} className={fieldState.error ? "border-destructive" : ""} value={field.value ?? ""} />
            {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
          </>
        )}
      />
    </div>
  );

  // Field controller for switch/boolean
  const FieldControllerSwitch = ({ name, label }: any) => (
    <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
      <Label htmlFor={name} className="cursor-pointer">{label}</Label>
      <Controller
        name={name as any}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type="checkbox"
            checked={field.value}
            onChange={e => field.onChange(e.target.checked)}
          />
        )}
            />
        </div>
    );

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Send camelCase keys to backend (matches backend validation)
      const mapped = {
        modelName: data.modelName,
        totalEpochs: data.totalEpochs,
        batchSize: data.batchSize,
        learningRate: data.learningRate,
        weightDecay: data.weightDecay,
        mixupAlpha: data.mixupAlpha,
        momentumParams: data.momentumParams,
        strengthParams: data.strengthParams,
        noiseParams: data.noiseParams,
        couplingParams: data.couplingParams,
        quantumCircuitSize: data.quantumCircuitSize,
        labelSmoothing: data.labelSmoothing,
        quantumMode: data.quantumMode,
        baseConfigId: data.baseConfigId,
      };
      await startJob(mapped);
      setShowConfig(false);
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
        <>
            <div className="flex items-center gap-4 mb-4 px-4 pt-4">
                <Button onClick={() => setShowConfig(true)} className="btn-neon">
                    <Settings className="mr-2 h-4 w-4" /> Configure & Start
                </Button>
                <Button onClick={stopJob} disabled={!isJobActive} className="w-full" variant="destructive">
                    <StopCircle className="mr-2 h-4 w-4" /> Stop Training
                </Button>
                 {isJobActive && (
                    <div className="text-center">
                        <p className="text-sm font-semibold text-cyan-300">Status: <span className="font-bold text-yellow-400">{jobStatus}</span></p>
                    </div>
                )}
            </div>
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogContent className="panel-3d-flat min-w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="panel-title text-2xl">Train Configuration</DialogTitle>
            <DialogDescription>Adjust parameters for the ZPE model.</DialogDescription>
                    </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-2">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="zpe">ZPE</TabsTrigger>
                            <TabsTrigger value="quantum">Quantum</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general" className="space-y-3 pt-3">
                <FieldController name="modelName" label="Model Name" placeholder="e.g., MyZPEModel_V1" />
                <FieldController name="totalEpochs" label="Total Epochs" type="number" min="1" />
                <FieldController name="batchSize" label="Batch Size" type="number" min="1" />
                <FieldController name="learningRate" label="Learning Rate" type="number" step="0.0001" />
                <FieldController name="weightDecay" label="Weight Decay" type="number" step="0.00001" />
                <FieldController name="mixupAlpha" label="Mixup Alpha" type="number" step="0.01" min="0" max="10" />
                <FieldController name="labelSmoothing" label="Label Smoothing" type="number" step="0.01" />
                        </TabsContent>
                        <TabsContent value="zpe" className="space-y-3 pt-3">
                {renderParamArrayFields("momentumParams", "Momentum Parameters")}
                {renderParamArrayFields("strengthParams", "Strength Parameters")}
                {renderParamArrayFields("noiseParams", "Noise Parameters")}
                {renderParamArrayFields("couplingParams", "Coupling Parameters")}
                        </TabsContent>
                        <TabsContent value="quantum" className="space-y-3 pt-3">
                <FieldControllerSwitch name="quantumMode" label="Enable Quantum Mode" />
                <FieldController name="quantumCircuitSize" label="Quantum Circuit Size (Qubits)" type="number" min="1" />
                        </TabsContent>
                    </Tabs>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-white/10">
              <Button variant="ghost" type="button" onClick={() => setShowConfig(false)}>Cancel</Button>
              <Button type="submit" className="btn-neon" disabled={isSubmitting}>
                {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Start Training
                        </Button>
                    </div>
          </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ControlsPanel; 