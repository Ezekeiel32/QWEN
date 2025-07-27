"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TrainingParameters, TrainingJob, TrainingJobSummary } from "@/types/training";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Play, StopCircle, Settings, RefreshCw, Zap, ExternalLink } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const trainingFormSchema = z.object({
  modelName: z.string().min(3, "Model name must be at least 3 characters"),
  totalEpochs: z.coerce.number().int().min(1).max(200),
  batchSize: z.coerce.number().int().min(8).max(256),
  learningRate: z.coerce.number().min(0.00001).max(0.1),
  weightDecay: z.coerce.number().min(0).max(0.1),
  momentumParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 momentum values"),
  strengthParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 strength values"),
  noiseParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 noise values"),
  couplingParams: z.array(z.coerce.number().min(0).max(1)).length(6, "Must have 6 coupling values"),
  quantumCircuitSize: z.coerce.number().int().min(4).max(64),
  labelSmoothing: z.coerce.number().min(0).max(0.5),
  quantumMode: z.boolean(),
  baseConfigId: z.string().nullable().optional(),
  mixupAlpha: z.coerce.number().min(0).max(1),
});

const defaultZPEParams = {
  momentum: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65],
  strength: [0.35, 0.33, 0.31, 0.60, 0.27, 0.50],
  noise: [0.3, 0.28, 0.26, 0.35, 0.22, 0.25],
  coupling: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
};

export default function TrainModelClient() {
  const [activeJob, setActiveJob] = useState<TrainingJob | null>(null);
  const [jobsList, setJobsList] = useState<TrainingJobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const { control, handleSubmit, reset, watch } = useForm<TrainingParameters>({
    resolver: zodResolver(trainingFormSchema),
    defaultValues: {
      modelName: "ZPE-Colab-Sim",
      totalEpochs: 30,
      batchSize: 32,
      learningRate: 0.001,
      weightDecay: 0.0001,
      momentumParams: defaultZPEParams.momentum,
      strengthParams: defaultZPEParams.strength,
      noiseParams: defaultZPEParams.noise,
      couplingParams: defaultZPEParams.coupling,
      quantumCircuitSize: 32,
      labelSmoothing: 0.1,
      quantumMode: true,
      baseConfigId: undefined,
      mixupAlpha: 0.2,
    },
  });

  const fetchJobsList = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch('/api/jobs?limit=20');
      if (!response.ok) throw new Error("Failed to fetch jobs list");
      const data = await response.json();
      setJobsList(Array.isArray(data) ? data : data.jobs || []);
    } catch (error) {
      toast({ title: "Error fetching jobs", description: (error as Error).message });
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/status/${jobId}`);
      if (!response.ok) {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        throw new Error(`Failed to fetch job status for ${jobId}`);
      }
      const jobData: TrainingJob = await response.json();
      setActiveJob(jobData);
      // Use metrics_history for chart data if available
      if (Array.isArray(jobData.metrics_history)) {
        setChartData(jobData.metrics_history.map((m: any) => ({
          epoch: m.epoch,
          accuracy: m.accuracy,
          loss: m.loss,
          val_acc: m.val_acc,
          val_loss: m.val_loss,
          avg_zpe: Array.isArray(jobData.zpe_effects) ? jobData.zpe_effects.reduce((a,b)=>a+b,0) / (jobData.zpe_effects.length || 1) : 0
        })));
      }
      if (["completed", "failed", "stopped"].includes(jobData.status)) {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        fetchJobsList();
        toast({ title: `Job ${jobData.status}`, description: `Job ${jobId} finished with status: ${jobData.status}. Accuracy: ${jobData.accuracy?.toFixed(2)}%` });
      }
    } catch (error) {
      toast({ title: "Error polling job status", description: (error as Error).message });
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [pollingIntervalId, fetchJobsList]);

  // On mount, check for an active job and start polling if found
  useEffect(() => {
    const checkActiveJob = async () => {
      try {
        const res = await fetch('/api/active-job');
        if (!res.ok) return;
        const data = await res.json();
        if (data.job_id) {
          // Start polling this job
          pollJobStatus(data.job_id);
          const intervalId = setInterval(() => pollJobStatus(data.job_id), 2000);
          setPollingIntervalId(intervalId);
        }
      } catch (err) {
        // Silent fail
      }
    };
    checkActiveJob();
    fetchJobsList();
    return () => {
      if (pollingIntervalId) clearInterval(pollingIntervalId);
    };
  }, []);

  const onSubmit = async (data: TrainingParameters) => {
    setIsSubmitting(true);
    setChartData([]);
    try {
      const response = await fetch(`/api/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to start training job");
      const result = await response.json();
      setActiveJob({
        job_id: result.job_id,
        status: "pending",
        current_epoch: 0,
        total_epochs: data.totalEpochs,
        accuracy: 0,
        loss: 0,
        zpe_effects: [],
        log_messages: [`Job ${result.job_id} submitted.`],
        parameters: data,
      });
      const intervalId = setInterval(() => pollJobStatus(result.job_id), 2000);
      setPollingIntervalId(intervalId);
      fetchJobsList();
      toast({ title: "Training Started", description: `Job ID: ${result.job_id}` });
    } catch (error) {
      toast({ title: "Error starting training", description: (error as Error).message });
      setActiveJob(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/stop/${jobId}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to stop job");
      toast({ title: "Stop Request Sent", description: `Requested stop for job ${jobId}` });
    } catch (error) {
      toast({ title: "Error stopping job", description: (error as Error).message });
    }
  };

  const handleViewJobDetails = async (jobId: string) => {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    setChartData([]);
    const jobDetail = jobsList.find(j => j.job_id === jobId);
    if (jobDetail && !["running", "pending"].includes(jobDetail.status)) {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        if (!response.ok) throw new Error("Failed to fetch job details");
        const data: TrainingJob = await response.json();
        setActiveJob(data);
        if (Array.isArray(data.metrics_history)) {
          setChartData(data.metrics_history.map((m: any) => ({
            epoch: m.epoch,
            accuracy: m.accuracy,
            loss: m.loss,
            val_acc: m.val_acc,
            val_loss: m.val_loss,
            avg_zpe: Array.isArray(data.zpe_effects) ? data.zpe_effects.reduce((a,b)=>a+b,0) / (data.zpe_effects.length || 1) : 0
          })));
        }
      } catch (error) {
        toast({ title: "Error fetching job details", description: (error as Error).message });
      }
    } else {
      pollJobStatus(jobId);
      const intervalId = setInterval(() => pollJobStatus(jobId), 2000);
      setPollingIntervalId(intervalId);
    }
  };

  const renderParamArrayFields = (paramName: "momentumParams" | "strengthParams" | "noiseParams" | "couplingParams", labelPrefix: string) => (
    <div className="space-y-2">
      <Label className="text-base">{labelPrefix} (6 layers)</Label>
      <div className="grid grid-cols-3 gap-2">
        {(watch(paramName) || []).map((_, index) => (
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

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-8 text-primary">ZPE Model Training Orchestrator</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Training Configuration</CardTitle>
            <CardDescription>Define parameters for your ZPE model training job.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="zpe">ZPE</TabsTrigger>
                  <TabsTrigger value="quantum">Quantum</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-3 pt-3">
                  <FieldController control={control} name="modelName" label="Model Name" placeholder="e.g., MyZPEModel_V1" />
                  <FieldController control={control} name="totalEpochs" label="Total Epochs" type="number" min="1" />
                  <FieldController control={control} name="batchSize" label="Batch Size" type="number" min="1" />
                  <FieldController control={control} name="learningRate" label="Learning Rate" type="number" min="0.00001" step="0.00001" placeholder="0.001" />
                  <FieldController control={control} name="weightDecay" label="Weight Decay" type="number" min="0" step="0.00001" placeholder="0.0001" />
                  <FieldController control={control} name="labelSmoothing" label="Label Smoothing" type="number" step="0.01" />
                </TabsContent>
                <TabsContent value="zpe" className="space-y-3 pt-3">
                  {renderParamArrayFields("momentumParams", "Momentum Parameters")}
                  {renderParamArrayFields("strengthParams", "Strength Parameters")}
                  {renderParamArrayFields("noiseParams", "Noise Parameters")}
                  {renderParamArrayFields("couplingParams", "Coupling Parameters")}
                </TabsContent>
                <TabsContent value="quantum" className="space-y-3 pt-3">
                  <FieldControllerSwitch control={control} name="quantumMode" label="Enable Quantum Mode" />
                  <FieldController control={control} name="quantumCircuitSize" label="Quantum Circuit Size (Qubits)" type="number" min="1" />
                </TabsContent>
              </Tabs>
              <Button type="submit" className="w-full mt-4" disabled={isSubmitting || (activeJob?.status === "running" || activeJob?.status === "pending")}> 
                {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} 
                Start Training
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary"/> Training Monitor</CardTitle>
            {activeJob ? (
              <CardDescription>Status for Job ID: <span className="font-mono">{activeJob.job_id}</span> ({activeJob.parameters.modelName})</CardDescription>
            ) : (
              <CardDescription>No active training job. Start one or select from history.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {activeJob ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={
                    activeJob.status === "running" ? "default" :
                    activeJob.status === "completed" ? "default" : 
                    activeJob.status === "failed" || activeJob.status === "stopped" ? "secondary" : "secondary"
                  }
                  className={
                    activeJob.status === "completed" ? "bg-green-500 hover:bg-green-600 text-white" : ""
                  }
                  >
                    {activeJob.status.toUpperCase()}
                  </Badge>
                  {(activeJob.status === "running" || activeJob.status === "pending") && (
                    <Button variant="default" size="sm" onClick={() => handleStopJob(activeJob.job_id)}>
                      <StopCircle className="mr-2 h-4 w-4" /> Stop Job
                    </Button>
                  )}
                </div>
                <Progress value={(activeJob.current_epoch / activeJob.total_epochs) * 100} className="w-full" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <MetricDisplay label="Epoch" value={`${activeJob.current_epoch}/${activeJob.total_epochs}`} />
                  <MetricDisplay label="Accuracy" value={`${activeJob.accuracy.toFixed(2)}%`} />
                  <MetricDisplay label="Loss" value={`${activeJob.loss.toFixed(4)}`} />
                  <MetricDisplay label="Avg ZPE Effect" value={`${(activeJob.zpe_effects.reduce((a,b)=>a+b,0) / (activeJob.zpe_effects.length || 1)).toFixed(3)}`} />
                </div>
                <div className="h-[250px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" name="Epoch" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis yAxisId="left" name="Accuracy" stroke="hsl(var(--primary))" fontSize={12} domain={[70,100]}/>
                      <YAxis yAxisId="right" name="Loss" orientation="right" stroke="hsl(var(--destructive))" fontSize={12} domain={[0, 'auto']}/>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" name="Accuracy (%)" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="loss" stroke="hsl(var(--destructive))" name="Loss" dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="avg_zpe" stroke="hsl(var(--accent))" name="Avg ZPE" dot={false} strokeDasharray="3 3"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <Label>Logs</Label>
                <ScrollArea className="h-40 w-full rounded-md border p-2">
                  {activeJob.log_messages.slice().reverse().map((log, index) => (
                    <p key={index} className="text-xs font-mono">{log}</p>
                  ))}
                </ScrollArea>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a job from history or start a new training session.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/> Training Job History</CardTitle>
            <CardDescription>View past and ongoing training jobs.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingJobs && <RefreshCw className="mx-auto my-4 h-6 w-6 animate-spin" />}
            {!isLoadingJobs && jobsList.length === 0 && <p className="text-muted-foreground">No training jobs found.</p>}
            {!isLoadingJobs && jobsList.length > 0 && (
              <ScrollArea className="h-[400px]">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Model Name</th>
                      <th>Status</th>
                      <th>Accuracy</th>
                      <th>Epochs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobsList.map(job => (
                      <tr key={job.job_id} className={activeJob?.job_id === job.job_id ? "bg-muted" : ""}>
                        <td className="font-mono text-xs">{job.job_id.replace('zpe_job_', '')}</td>
                        <td>{job.model_name}</td>
                        <td>
                          <Badge variant={
                            job.status === "running" ? "default" :
                            job.status === "completed" ? "default" :
                            job.status === "failed" || job.status === "stopped" ? "secondary" : "secondary"
                          }
                          className={job.status === "completed" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                          >{job.status}</Badge>
                        </td>
                        <td>{job.accuracy > 0 ? `${job.accuracy.toFixed(2)}%` : '-'}</td>
                        <td>{`${job.current_epoch}/${job.total_epochs}`}</td>
                        <td>
                          <Button variant="outline" size="sm" onClick={() => handleViewJobDetails(job.job_id)}>
                            <ExternalLink className="mr-1 h-3 w-3"/>View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const FieldController = ({ control, name, label, type = "text", placeholder = "", min = "", step = "" }: { control: any, name: any, label: any, type?: string, placeholder?: string, min?: string, step?: string }) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <>
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            min={min}
            step={step}
            className={fieldState.error ? "border-destructive" : ""}
          />
          {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
        </>
      )}
    />
  </div>
);

const FieldControllerSwitch = ({ control, name, label }) => (
  <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
    <Label htmlFor={name} className="cursor-pointer">{label}</Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Switch
          id={name}
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      )}
    />
  </div>
);

const MetricDisplay = ({ label, value }) => (
  <div className="bg-muted p-2 rounded-md text-center">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
); 