"use client";
import React, { useState, useEffect, useCallback } from "react";
import type { ModelConfig } from "@/types/entities"; // Keep for potential future use or type consistency
import type { TrainingJob, TrainingJobSummary, TrainingParameters } from "@/types/training";

import { 
  BarChart3, Gauge, ArrowUp, ChevronDown, ChevronUp, Zap, CheckCircle, XCircle, DownloadCloud, Activity, ListFilter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import NeonAnalyzerChart from '@/components/visualizations/NeonAnalyzerChart';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";
const NONE_OPTION_VALUE = "none-option";

interface ParsedEpochMetric {
  epoch: number;
  training_loss?: number;
  validation_accuracy?: number;
  validation_loss?: number;
  avg_zpe_effect?: number;
  zpe_effects?: number[];
  timestamp?: string; // Keep if available from logs, otherwise can be omitted
}

export default function PerformancePage() {
  const [jobsList, setJobsList] = useState<TrainingJobSummary[]>([]);
  const [activeJob, setActiveJob] = useState<TrainingJob | null>(null);
  const [comparisonJob, setComparisonJob] = useState<TrainingJob | null>(null);
  
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingActiveJob, setIsLoadingActiveJob] = useState(false);
  const [isLoadingComparisonJob, setIsLoadingComparisonJob] = useState(false);
  
  const [metricType, setMetricType] = useState<"accuracy" | "loss">("accuracy");
  const [parsedMetricsCache, setParsedMetricsCache] = useState<Record<string, ParsedEpochMetric[]>>({});

  const fetchJobsList = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?limit=100`); // Fetch more jobs
      if (!response.ok) throw new Error("Failed to fetch jobs list");
      const data = await response.json();
      const completedJobs = (data.jobs || [])
        .filter((job: TrainingJobSummary) => job.status === "completed" || job.status === "running" || job.status === "stopped") // Allow running/stopped for selection
        .sort((a: TrainingJobSummary, b: TrainingJobSummary) => new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime());
      setJobsList(completedJobs);
      if (completedJobs.length > 0 && !activeJob) {
        handleSelectActiveJob(completedJobs[0].job_id); // Auto-select the latest job
      }
    } catch (error: any) {
      toast({ title: "Error fetching jobs", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingJobs(false);
    }
  }, [activeJob]); // Add activeJob to re-fetch if it becomes null, etc.

  useEffect(() => {
    fetchJobsList();
  }, [fetchJobsList]);

  const fetchJobDetails = async (jobId: string, isComparison: boolean) => {
    if (isComparison) setIsLoadingComparisonJob(true);
    else setIsLoadingActiveJob(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/status/${jobId}`);
      if (!response.ok) throw new Error(`Failed to fetch job details for ${jobId}`);
      const data: TrainingJob = await response.json();
      if (isComparison) setComparisonJob(data);
      else setActiveJob(data);
      
      // Pre-parse metrics
      if (data.log_messages) {
        const parsed = parseLogMessages(data.log_messages);
        setParsedMetricsCache(prev => ({ ...prev, [jobId]: parsed }));
      }

    } catch (error: any) {
      toast({ title: `Error fetching ${isComparison ? 'comparison' : 'active'} job`, description: error.message, variant: "destructive" });
      if (isComparison) setComparisonJob(null);
      else setActiveJob(null);
    } finally {
      if (isComparison) setIsLoadingComparisonJob(false);
      else setIsLoadingActiveJob(false);
    }
  };

  const handleSelectActiveJob = (jobId: string) => {
    if (jobId) fetchJobDetails(jobId, false);
    else setActiveJob(null);
  };

  const handleSelectComparisonJob = (jobId: string) => {
    if (jobId === NONE_OPTION_VALUE) {
      setComparisonJob(null);
    } else if (jobId) {
      fetchJobDetails(jobId, true);
    }
  };

  const parseLogMessages = (logs: string[]): ParsedEpochMetric[] => {
    const epochMetrics: Record<number, Partial<ParsedEpochMetric>> = {};

    logs.forEach(log => {
      const endEpochMatch = log.match(/E(\d+) END - TrainL: ([\d.-]+), ValAcc: ([\d.-]+)%, ValL: ([\d.-]+)/);
      const zpeMatch = log.match(/ZPE: \[([,\d\s.-]+)\]/);

      if (endEpochMatch) {
        const epoch = parseInt(endEpochMatch[1]);
        if (!epochMetrics[epoch]) epochMetrics[epoch] = { epoch };
        epochMetrics[epoch].training_loss = parseFloat(endEpochMatch[2]);
        epochMetrics[epoch].validation_accuracy = parseFloat(endEpochMatch[3]);
        epochMetrics[epoch].validation_loss = parseFloat(endEpochMatch[4]);
      } else if (zpeMatch) {
        // Try to find the most recent epoch for this ZPE log
        // This assumes ZPE log comes right after the epoch end log or standalone per epoch.
        let currentEpoch = -1;
        for (const ep in epochMetrics) {
            if (parseInt(ep) > currentEpoch) currentEpoch = parseInt(ep);
        }
        if (currentEpoch !== -1 && epochMetrics[currentEpoch]) {
            const zpeValues = zpeMatch[1].split(',').map(s => parseFloat(s.trim()));
            epochMetrics[currentEpoch].zpe_effects = zpeValues;
            epochMetrics[currentEpoch].avg_zpe_effect = zpeValues.reduce((a, b) => a + b, 0) / zpeValues.length;
        }
      }
    });
    return Object.values(epochMetrics).sort((a, b) => (a.epoch || 0) - (b.epoch || 0)) as ParsedEpochMetric[];
  };
  
  const getJobMetrics = (jobId?: string): ParsedEpochMetric[] => {
    if (!jobId || !parsedMetricsCache[jobId]) return [];
    return parsedMetricsCache[jobId];
  };

  const getLastEpochMetrics = (job: TrainingJob | null): ParsedEpochMetric | null => {
    if (!job) return null;
    const jobMetrics = getJobMetrics(job.job_id);
    if (jobMetrics.length > 0) return jobMetrics[jobMetrics.length - 1];
    // Fallback to job's final stats if no parsed logs
    return {
      epoch: job.current_epoch,
      validation_accuracy: job.accuracy,
      validation_loss: job.loss,
      zpe_effects: job.zpe_effects,
      avg_zpe_effect: job.zpe_effects && job.zpe_effects.length > 0 ? job.zpe_effects.reduce((a, b) => a + b, 0) / job.zpe_effects.length : undefined,
    };
  };
  
  const compareJobs = () => {
    if (!activeJob || !comparisonJob) return { diff: 0, isImprovement: false, percentChange: 0 };
    const activeMetrics = getLastEpochMetrics(activeJob);
    const comparisonMetrics = getLastEpochMetrics(comparisonJob);

    if (!activeMetrics || !comparisonMetrics) return { diff: 0, isImprovement: false, percentChange: 0 };
    
    const activeValue = metricType === "accuracy" ? (activeMetrics.validation_accuracy || 0) : (activeMetrics.validation_loss || Infinity);
    const comparisonValue = metricType === "accuracy" ? (comparisonMetrics.validation_accuracy || 0) : (comparisonMetrics.validation_loss || Infinity);

    const diff = metricType === "accuracy" ? (activeValue - comparisonValue) : (comparisonValue - activeValue);
    const isImprovement = diff > 0;

    let percentChange = 0;
    if (comparisonValue !== 0 && comparisonValue !== Infinity) {
        percentChange = (Math.abs(diff) / Math.abs(comparisonValue)) * 100;
    } else if (activeValue !== 0 && activeValue !== Infinity) {
        percentChange = 100;
    }
    
    return { diff, isImprovement, percentChange };
  };

  const getTrainingCurveData = () => {
    if (!activeJob) return [];
    const activeMetrics = getJobMetrics(activeJob.job_id);
    const comparisonMetrics = comparisonJob ? getJobMetrics(comparisonJob.job_id) : [];
    
    const maxEpochs = Math.max(
      activeMetrics.length > 0 ? Math.max(...activeMetrics.map(m => m.epoch)) : 0,
      comparisonMetrics.length > 0 ? Math.max(...comparisonMetrics.map(m => m.epoch)) : 0,
      1
    );

    const result = []; 
    const stepSize = maxEpochs <= 20 ? 1 : Math.max(1, Math.ceil(maxEpochs / 20));

    for (let epoch = 1; epoch <= maxEpochs; epoch += stepSize) {
      const activeM = activeMetrics.find(m=>m.epoch === epoch) || 
                      activeMetrics.reduce((closest, current)=> (Math.abs(current.epoch - epoch) < Math.abs(closest.epoch - epoch) ? current : closest), activeMetrics[0] || {epoch:0, validation_accuracy:0, validation_loss:0});
      
      const compareM = comparisonJob ? (comparisonMetrics.find(m=>m.epoch === epoch) || 
                      comparisonMetrics.reduce((closest, current)=> (Math.abs(current.epoch - epoch) < Math.abs(closest.epoch - epoch) ? current : closest), comparisonMetrics[0] || {epoch:0, validation_accuracy:0, validation_loss:0})) : null;
      
      const dataPoint: any = { epoch };
      const activeModelName = activeJob.parameters.modelName || "Active";
      const comparisonModelName = comparisonJob?.parameters.modelName || "Comparison";

      if (metricType === "accuracy") {
        dataPoint[`${activeModelName} Val Acc`] = activeM?.validation_accuracy;
        if (compareM && comparisonJob) {
          dataPoint[`${comparisonModelName} Val Acc`] = compareM.validation_accuracy;
        }
      } else { 
        dataPoint[`${activeModelName} Val Loss`] = activeM?.validation_loss;
        if (compareM && comparisonJob) {
          dataPoint[`${comparisonModelName} Val Loss`] = compareM.validation_loss;
        }
      }
      result.push(dataPoint);
    }
    return result;
  };
  
  const getZPEEffectData = (job: TrainingJob | null) => {
    if (!job) return [];
    const lastEpochMetric = getLastEpochMetrics(job);
    if (!lastEpochMetric || !lastEpochMetric.zpe_effects) return [];
    return lastEpochMetric.zpe_effects.map((effect, index) => ({ name: `Layer ${index + 1}`, value: effect }));
  };

  const getModelHealth = (job: TrainingJob | null) => {
    if (!job) return { status: "unknown", metrics: {} as any };
    const jobMetrics = getJobMetrics(job.job_id);
    if (jobMetrics.length === 0) return { status: "unknown", metrics: { finalAccuracy: job.accuracy, finalLoss: job.loss, zpeImpact: job.zpe_effects?.reduce((s,v)=>s+v,0)/6 || 0 } };
    
    const sortedMetrics = [...jobMetrics].sort((a, b) => (a.epoch || 0) - (b.epoch || 0));
    if (sortedMetrics.length === 0) return { status: "unknown", metrics: {} as any };

    const firstEpochMetric = sortedMetrics[0];
    const lastEpochMetric = sortedMetrics[sortedMetrics.length - 1];
    
    if(!firstEpochMetric || !lastEpochMetric) return { status: "unknown", metrics: {} as any };
    
    const epochsDiff = (lastEpochMetric.epoch || 0) - (firstEpochMetric.epoch || 0);
    // Use validation_accuracy for health assessment
    const accuracyDiff = (lastEpochMetric.validation_accuracy || 0) - (firstEpochMetric.validation_accuracy || 0);
    const convergenceRate = epochsDiff > 0 ? accuracyDiff / epochsDiff : 0;
    // For overfitting, need training accuracy too. If not parsed, use overall job accuracy.
    const lastTrainAcc = lastEpochMetric.training_loss !== undefined ? NaN : job.accuracy; // Placeholder if not parsed. Actual train acc needed.
    const overfittingGap = lastTrainAcc ? lastTrainAcc - (lastEpochMetric.validation_accuracy || 0) : 0; // Needs real train_acc
    const zpeImpact = lastEpochMetric.avg_zpe_effect || (lastEpochMetric.zpe_effects ? lastEpochMetric.zpe_effects.reduce((s, v) => s + v, 0) / lastEpochMetric.zpe_effects.length : 0);
    
    let status = "healthy";
    if (overfittingGap > 5) status = "overfitting";
    else if (convergenceRate < 0.05 && epochsDiff > 5 && (lastEpochMetric.epoch || 0) > 10) status = "slow_convergence";
    else if ((lastEpochMetric.validation_accuracy || 0) < 90) status = "underperforming";
    
    return { 
        status, 
        metrics: { 
            convergenceRate: convergenceRate || 0, 
            overfittingGap: overfittingGap || 0, 
            zpeImpact: zpeImpact || 0, 
            finalAccuracy: lastEpochMetric.validation_accuracy || job.accuracy || 0, 
            finalLoss: lastEpochMetric.validation_loss || job.loss || 0
        } 
    };
  };

  const getConfusionMatrixData = (job: TrainingJob | null) => { 
      const accuracyBase = job ? (job.accuracy || 95) / 100 : 0.95;
      // Same generative logic as before
      const matrix = [];
      for (let actual = 0; actual < 10; actual++) {
        const row = []; 
        const classAccuracy = Math.min(0.99, Math.max(0.7, accuracyBase + (Math.random() - 0.5) * 0.1));
        let rowSumTemp = 0;
        for (let predicted = 0; predicted < 10; predicted++) {
          if (actual === predicted) { 
            row[predicted] = Math.round(100 * classAccuracy);
          } else {
            const confusablePairs: Record<number, number[]> = { 1: [7], 2: [7], 3: [8, 5], 4: [9], 5: [3, 6], 6: [8, 5], 7: [1], 8: [3, 6, 0], 9: [4, 7], 0: [8, 6] };
            let errorProb = confusablePairs[actual]?.includes(predicted) ? Math.random() * (1 - classAccuracy) * 0.7 : Math.random() * (1 - classAccuracy) * 0.1;
            row[predicted] = Math.round(errorProb * 100);
          }
          rowSumTemp += row[predicted];
        }
        const diff = 100 - rowSumTemp; row[actual] += diff;
        for(let k=0; k<10; ++k) { if (row[k] < 0) { if (k === actual) { let deficit = row[k]; row[k] = 0; for(let l=0; l<10; ++l) { if(l !== k) row[l] += deficit / 9; } } else { row[actual] += row[k]; row[k] = 0; } } }
        let finalRowSum = row.reduce((s,v)=>s+v,0); if(finalRowSum !== 100) row[actual] += (100 - finalRowSum);
        matrix.push(row);
      }
      return matrix;
  };

  const getSummaryMetrics = (job: TrainingJob | null) => { 
    if (!job) return [];
    const lastMetrics = getLastEpochMetrics(job);
    if (!lastMetrics) return [];
    const health = getModelHealth(job);
    return [
      { title: "Validation Accuracy", value: `${(health.metrics.finalAccuracy || 0).toFixed(2)}%`, icon: CheckCircle, change: "", changeType: "neutral" },
      { title: "ZPE Impact Score", value: `${(health.metrics.zpeImpact || 0).toFixed(3)}`, icon: Zap, change: (health.metrics.zpeImpact || 0) > 0.3 ? "Strong" : "Moderate", changeType: (health.metrics.zpeImpact || 0) > 0.3 ? "positive" : "neutral" },
      { title: "Overfitting Gap", value: `${(health.metrics.overfittingGap || 0).toFixed(2)}%`, icon: Gauge, change: (health.metrics.overfittingGap || 0) < 2 ? "Minimal" : (health.metrics.overfittingGap || 0) < 5 ? "Acceptable" : "High", changeType: (health.metrics.overfittingGap || 0) < 5 ? "positive" : "negative" },
      { title: "Convergence Rate", value: `${((health.metrics.convergenceRate || 0) * 100).toFixed(2)}% / ep`, icon: ArrowUp, change: (health.metrics.convergenceRate || 0) > 0.2 ? "Fast" : (health.metrics.convergenceRate || 0) > 0.1 ? "Normal" : "Slow", changeType: (health.metrics.convergenceRate || 0) > 0.1 ? "positive" : "negative" }
    ];
  };

  const modelHealth = getModelHealth(activeJob);
  const confusionMatrix = getConfusionMatrixData(activeJob);
  const summaryMetrics = getSummaryMetrics(activeJob);
  const comparisonResult = compareJobs();
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  const accuracyColors = { validation: 'hsl(var(--chart-2))' }; // Simplified, train acc not easily parsed for main chart
  const lossColors = { validation: 'hsl(var(--destructive))' }; // Simplified

  if (isLoadingJobs && jobsList.length === 0) return <div className="container mx-auto p-6 text-center"><Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-primary"/>Fetching job list...</div>;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Model Performance Analysis</h1>
          <p className="text-muted-foreground">Analyze completed training jobs and compare their performance.</p>
        </div>
        <div className="flex gap-2">
            <Select onValueChange={handleSelectActiveJob} value={activeJob?.job_id || ""}>
              <SelectTrigger className="w-[280px]" disabled={isLoadingActiveJob}>
                <SelectValue placeholder={isLoadingActiveJob ? "Loading..." : "Select Active Job"} />
              </SelectTrigger>
              <SelectContent>
                {jobsList.map(job => <SelectItem key={job.job_id} value={job.job_id}>{job.model_name} ({job.job_id.slice(-6)})</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={handleSelectComparisonJob} value={comparisonJob?.job_id || NONE_OPTION_VALUE}>
              <SelectTrigger className="w-[280px]" disabled={isLoadingComparisonJob}>
                <SelectValue placeholder={isLoadingComparisonJob ? "Loading..." : "Select Comparison Job (Optional)"} />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value={NONE_OPTION_VALUE}>None</SelectItem>
                {jobsList.filter(j => j.job_id !== activeJob?.job_id).map(job => <SelectItem key={job.job_id} value={job.job_id}>{job.model_name} ({job.job_id.slice(-6)})</SelectItem>)}
              </SelectContent>
            </Select>
        </div>
      </div>
      
      {(!activeJob && !isLoadingActiveJob) && (
        <Card className="text-center py-10">
            <CardHeader><CardTitle>No Active Job Selected</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Please select a job from the dropdown above to view its performance analysis.</p>
            {jobsList.length === 0 && !isLoadingJobs && <p className="mt-2">No completed jobs found to analyze.</p>}
            </CardContent>
        </Card>
      )}

      {(isLoadingActiveJob) && <div className="text-center py-10"><Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-primary"/>Loading active job details...</div>}

      {activeJob && !isLoadingActiveJob && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {summaryMetrics.map((metric, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                      <metric.icon className={`h-4 w-4 ${metric.changeType === "positive" ? "text-green-400" : metric.changeType === "negative" ? "text-red-400" : "text-amber-400"}`} />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      {metric.change && <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {metric.changeType === "positive" ? <ChevronUp className="h-3 w-3 text-green-500" /> : metric.changeType === "negative" ? <ChevronDown className="h-3 w-3 text-red-500" /> : null}
                          {metric.change}
                      </p>}
                  </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-6 mb-6">
            <Card className="md:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle>Training Progress ({activeJob.parameters.modelName})</CardTitle><CardDescription>Performance metrics over training epochs</CardDescription></div>
                  <Tabs defaultValue="accuracy" onValueChange={(val) => setMetricType(val as "accuracy" | "loss")} className="w-auto">
                      <TabsList className="grid grid-cols-2 w-[180px]"><TabsTrigger value="accuracy">Accuracy</TabsTrigger><TabsTrigger value="loss">Loss</TabsTrigger></TabsList>
                  </Tabs>
              </CardHeader>
              <CardContent className="pt-0">
                  <div className="h-[350px]">
                    <NeonAnalyzerChart
                      traces={[
                        { data: getTrainingCurveData().map(d => d.active), color: '#00ffe7', label: `${activeJob?.parameters?.modelName || 'Active'} ${metricType === 'accuracy' ? 'Accuracy' : 'Loss'}` },
                        ...(comparisonJob ? [{ data: getTrainingCurveData().map(d => d.comparison), color: '#ff00ff', label: `${comparisonJob.parameters?.modelName || 'Comparison'} ${metricType === 'accuracy' ? 'Accuracy' : 'Loss'}` }] : [])
                      ]}
                      width={600}
                      height={320}
                      overlays={[
                        { text: metricType === 'accuracy' ? 'Accuracy' : 'Loss', color: '#39ff14', x: 120, y: 40, fontSize: 24 },
                        { text: `Model: ${activeJob?.parameters.modelName}`, color: '#00ffe7', x: 80, y: 300, fontSize: 16 }
                      ]}
                      showLegend
                    />
                  </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Job Comparison</CardTitle><CardDescription>Delta: {activeJob.parameters.modelName} vs {comparisonJob ? comparisonJob.parameters.modelName : 'N/A'}</CardDescription></CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                {comparisonJob ? (<>
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-medium capitalize">{metricType} Difference</h3>
                    <div className={`text-4xl font-bold ${comparisonResult.isImprovement ? "text-green-400" : "text-red-400"}`}>
                        {comparisonResult.isImprovement ? "+" : ""}{(comparisonResult.diff || 0).toFixed(metricType === 'accuracy' ? 2: 4)}{metricType === "accuracy" ? "%" : ""}
                    </div>
                    <p className="text-sm text-muted-foreground">{(comparisonResult.percentChange || 0).toFixed(1)}% {comparisonResult.isImprovement ? "improvement" : "decline"}</p>
                  </div>
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={[
                                    {name: activeJob.parameters.modelName, value: Math.abs(comparisonResult.diff) > 0.0001 ? 100 : 50 },
                                    {name: comparisonJob.parameters.modelName, value: Math.abs(comparisonResult.diff) > 0.0001 ? (100 - Math.abs(comparisonResult.percentChange)) : 50 }
                                ]} 
                                cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={5} dataKey="value"
                            >
                                <Cell fill={comparisonResult.isImprovement ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                                <Cell fill={'hsl(var(--muted))'} />
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}}
                                formatter={(value:number, name:string) => [`${name}: ${value.toFixed(1)}%`, null] }
                            />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full pt-2">
                    <div className="text-center">
                        <div className="text-sm font-medium">{activeJob.parameters.modelName}</div>
                        <div className="text-2xl font-semibold">{metricType === "accuracy" ? `${(getLastEpochMetrics(activeJob)?.validation_accuracy || 0).toFixed(2)}%`: ((getLastEpochMetrics(activeJob)?.validation_loss || 0)).toFixed(4)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-medium">{comparisonJob.parameters.modelName}</div>
                        <div className="text-2xl font-semibold">{metricType === "accuracy" ? `${(getLastEpochMetrics(comparisonJob)?.validation_accuracy || 0).toFixed(2)}%`: ((getLastEpochMetrics(comparisonJob)?.validation_loss || 0)).toFixed(4)}</div>
                    </div>
                  </div>
                </>) : (<p className="text-muted-foreground text-center py-10">Select a comparison job to see deltas.</p>)}
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue="detailed" className="space-y-6">
              <TabsList><TabsTrigger value="detailed">Detailed Analysis</TabsTrigger><TabsTrigger value="confusion">Confusion Matrix</TabsTrigger><TabsTrigger value="zpe">ZPE Effects</TabsTrigger></TabsList>
            <TabsContent value="detailed">
              <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                      <CardHeader><CardTitle>Model Health Assessment</CardTitle><CardDescription>Analysis of stability and performance for: <strong>{activeJob.parameters.modelName}</strong></CardDescription></CardHeader>
                      <CardContent className="pt-0">
                          <div className="flex items-center justify-between mb-6">
                              <div className="text-center"><h3 className="text-sm font-medium text-muted-foreground">Status</h3><div className="mt-1 flex items-center gap-2"><Badge className={modelHealth.status === "healthy" ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-500/30" : modelHealth.status === "overfitting" ? "bg-amber-100 text-amber-700 dark:bg-amber-700/20 dark:text-amber-300 border-amber-500/30" : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border-red-500/30"}>
  {typeof modelHealth.status === 'string' && modelHealth.status.length > 0
    ? modelHealth.status.replace('_', ' ').toUpperCase()
    : 'UNKNOWN'}
</Badge></div></div>
                              <div className="text-center"><h3 className="text-sm font-medium text-muted-foreground">Epochs</h3><div className="mt-1 text-2xl font-bold">{getJobMetrics(activeJob.job_id).length > 0 ? Math.max(...getJobMetrics(activeJob.job_id).map(m=>m.epoch)) : activeJob.current_epoch}</div></div>
                              <div className="text-center"><h3 className="text-sm font-medium text-muted-foreground">Last Update</h3><div className="mt-1 text-sm">{activeJob.end_time ? format(new Date(activeJob.end_time), "MMM d, yyyy HH:mm") : (activeJob.start_time ? format(new Date(activeJob.start_time), "MMM d, yyyy HH:mm"):"N/A")}</div></div>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <h3 className="text-sm font-medium mb-2">Performance Trajectory (Validation)</h3>
                                  <div className="h-52">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <AreaChart data={getJobMetrics(activeJob.job_id).map(m => ({epoch: m.epoch, accuracy: m.validation_accuracy}))}>
                                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)"/>
                                              <XAxis dataKey="epoch" fontSize={10} stroke="hsl(var(--muted-foreground))"/>
                                              <YAxis domain={[85, 100]} fontSize={10} tickFormatter={(v)=>`${v}%`} stroke="hsl(var(--muted-foreground))"/>
                                              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))"}}/>
                                              <Area type="monotone" dataKey="accuracy" fill="hsl(var(--chart-2), 0.5)" stroke="hsl(var(--chart-2))" name="Val Acc"/>
                                          </AreaChart>
                                      </ResponsiveContainer>
                                  </div>
                              </div>
                              <div>
                                  <h3 className="text-sm font-medium mb-2">Key Health Indicators</h3>
                                  <Table>
                                      <TableBody>
                                          <TableRow><TableCell className="font-medium">Train-Val Gap</TableCell><TableCell>{(modelHealth.metrics.overfittingGap || 0).toFixed(2)}%</TableCell><TableCell className="text-right"><Badge variant="outline" className={modelHealth.metrics.overfittingGap < 2 ? "border-green-500/50 text-green-400 bg-green-500/10" : modelHealth.metrics.overfittingGap < 5 ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-red-500/50 text-red-400 bg-red-500/10"}>{modelHealth.metrics.overfittingGap < 2 ? "Excellent" : modelHealth.metrics.overfittingGap < 5 ? "Good" : "Needs Attention"}</Badge></TableCell></TableRow>
                                          <TableRow><TableCell className="font-medium">ZPE Impact</TableCell><TableCell>Avg. {(modelHealth.metrics.zpeImpact || 0).toFixed(3)}</TableCell><TableCell className="text-right"><Badge variant="outline" className={(modelHealth.metrics.zpeImpact || 0) > 0.3 ? "border-green-500/50 text-green-400 bg-green-500/10" : (modelHealth.metrics.zpeImpact || 0) > 0.1 ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-stone-500/50 text-stone-400 bg-stone-500/10"}>{(modelHealth.metrics.zpeImpact || 0) > 0.3 ? "Strong" : (modelHealth.metrics.zpeImpact || 0) > 0.1 ? "Moderate" : "Weak"}</Badge></TableCell></TableRow>
                                          <TableRow><TableCell className="font-medium">Convergence</TableCell><TableCell>{((modelHealth.metrics.convergenceRate || 0) * 100).toFixed(2)}% per epoch</TableCell><TableCell className="text-right"><Badge variant="outline" className={(modelHealth.metrics.convergenceRate || 0) > 0.2 ? "border-green-500/50 text-green-400 bg-green-500/10" : (modelHealth.metrics.convergenceRate || 0) > 0.1 ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-red-500/50 text-red-400 bg-red-500/10"}>{(modelHealth.metrics.convergenceRate || 0) > 0.2 ? "Fast" : (modelHealth.metrics.convergenceRate || 0) > 0.1 ? "Normal" : "Slow"}</Badge></TableCell></TableRow>
                                      </TableBody>
                                  </Table>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
                <Card>
                  <CardHeader><CardTitle>Training Metrics Log</CardTitle><CardDescription>Detailed performance data by epoch for <strong>{activeJob.parameters.modelName}</strong></CardDescription></CardHeader>
                  <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                          <Table>
                              <TableHeader className="sticky top-0 bg-card z-10">
                                  <TableRow><TableHead>Epoch</TableHead><TableHead>Val. Acc.</TableHead><TableHead>Val. Loss</TableHead><TableHead>Avg. ZPE</TableHead></TableRow>
                              </TableHeader>
                              <TableBody>
                                  {getJobMetrics(activeJob.job_id).sort((a, b) => (b.epoch || 0) - (a.epoch || 0)).map((metric, i) => (
                                  <TableRow key={i}>
                                      <TableCell className="font-medium">{metric.epoch}</TableCell>
                                      <TableCell className="font-medium text-primary/90">{(metric.validation_accuracy || 0).toFixed(2)}%</TableCell>
                                      <TableCell className="text-destructive/90">{(metric.validation_loss || 0).toFixed(4)}</TableCell>
                                      <TableCell>
                                          <div className="flex items-center gap-2">
                                              <div className="w-12 bg-muted rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (metric.avg_zpe_effect || 0) * 200)}%` }}/></div>
                                              <span className="text-xs">{(metric.avg_zpe_effect || 0).toFixed(3)}</span>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                  ))}
                                  {getJobMetrics(activeJob.job_id).length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No per-epoch metrics parsed from logs. Showing final values if available.</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      </ScrollArea>
                  </CardContent>
                   <CardFooter className="border-t pt-4 mt-2">
                      <Button variant="outline" disabled><DownloadCloud className="w-4 h-4 mr-2" />Export Full Log (CSV)</Button>
                   </CardFooter>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="confusion">
              <Card>
                  <CardHeader><CardTitle>Confusion Matrix</CardTitle><CardDescription>Classification accuracy across classes for <strong>{activeJob.parameters.modelName}</strong> (Simulated)</CardDescription></CardHeader>
                  <CardContent>
                      <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-10 sticky left-0 bg-card z-10">Actual</TableHead>
                                      {Array(10).fill(0).map((_, i) => (<TableHead key={i} className="text-center">Pred. {i}</TableHead>))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {confusionMatrix.map((row, actual) => (
                                  <TableRow key={actual}>
                                      <TableCell className="font-bold sticky left-0 bg-card z-10">{actual}</TableCell>
                                      {row.map((value, predicted) => (<TableCell key={predicted} className={`text-center text-xs p-1.5 md:p-2 ${actual === predicted ? 'bg-green-500/20 text-green-300 font-semibold' : value > 5 ? 'bg-red-500/20 text-red-300' : value > 0 ? 'bg-amber-500/10 text-amber-300' : 'text-muted-foreground/50'}`}>{value}%</TableCell>))}
                                  </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                      <div className="grid md:grid-cols-3 gap-6 mt-8">
                          <div>
                              <h3 className="text-lg font-medium mb-2">Class Accuracy</h3>
                              <div className="h-60">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={confusionMatrix.map((row, i) => ({name: i.toString(), accuracy: row[i]}))}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)"/>
                                          <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))"/><YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} fontSize={10} stroke="hsl(var(--muted-foreground))"/>
                                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))"}}/>
                                          <Bar dataKey="accuracy" fill="hsl(var(--chart-2))" radius={[3,3,0,0]}/>
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div>
                              <h3 className="text-lg font-medium mb-2">Overall Accuracy</h3>
                              <div className="h-60 flex items-center justify-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                          <Pie data={[{ name: "Correct", value: activeJob?.accuracy || 0 },{ name: "Errors", value: 100 - (activeJob?.accuracy || 0) }]} 
                                              cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={3} dataKey="value" 
                                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                              labelLine={false}
                                              className="text-xs"
                                          >
                                              <Cell fill="hsl(var(--chart-2))" />
                                              <Cell fill="hsl(var(--destructive))" />
                                          </Pie>
                                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))"}}/>
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div>
                              <h3 className="text-lg font-medium mb-2">Top Confusions</h3>
                              <Table>
                                  <TableHeader><TableRow><TableHead className="text-xs p-1">Actual</TableHead><TableHead className="text-xs p-1">Predicted</TableHead><TableHead className="text-xs p-1">Rate</TableHead></TableRow></TableHeader>
                                  <TableBody>
                                      {confusionMatrix.flatMap((row, actual) => row.map((value, predicted) => actual !== predicted && value > 2 ? { actual, predicted, value } : null).filter(Boolean))
                                          .sort((a,b) => b!.value - a!.value).slice(0,5).map((error, i) => (
                                      <TableRow key={i}>
                                          <TableCell className="text-xs p-1">{error!.actual}</TableCell>
                                          <TableCell className="text-xs p-1">{error!.predicted}</TableCell>
                                          <TableCell className="text-xs p-1"><Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">{error!.value}%</Badge></TableCell>
                                      </TableRow>
                                      ))}
                                  </TableBody>
                              </Table>
                          </div>
                      </div>
                  </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="zpe">
              <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                      <CardHeader><CardTitle>ZPE Effects By Layer</CardTitle><CardDescription>Zero-point energy influence across network for <strong>{activeJob.parameters.modelName}</strong> (Final values)</CardDescription></CardHeader>
                      <CardContent>
                          <div className="h-80">
                              <NeonAnalyzerChart
                                traces={[
                                  { data: getZPEEffectData(activeJob).map(d => d.value), color: '#ffe066', label: 'ZPE Effect' }
                                ]}
                                width={600}
                                height={320}
                                overlays={[
                                  { text: 'ZPE Effects By Layer', color: '#39ff14', x: 120, y: 40, fontSize: 24 },
                                  { text: `Model: ${activeJob?.parameters.modelName}`, color: '#00ffe7', x: 80, y: 300, fontSize: 16 }
                                ]}
                                showLegend
                              />
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-6">
                              {getZPEEffectData(activeJob).map((data, i) => (
                              <div key={i} className="text-center p-1 bg-muted/30 rounded">
                                  <div className="text-xs text-muted-foreground mb-1">{data.name}</div>
                                  <div className="w-full bg-border rounded-full h-2 mb-1 overflow-hidden">
                                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, data.value * 200)}%` }}/>
                                  </div>
                                  <span className="text-xs font-medium">{data.value.toFixed(3)}</span>
                              </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
                <Card>
                  <CardHeader><CardTitle>ZPE Evolution During Training</CardTitle><CardDescription>Changes in ZPE impact per layer for <strong>{activeJob.parameters.modelName}</strong></CardDescription></CardHeader>
                  <CardContent>
                      <div className="h-80">
                          <NeonAnalyzerChart
                            traces={getJobMetrics(activeJob.job_id)[0]?.zpe_effects?.map((_, idx) => ({
                              data: getJobMetrics(activeJob.job_id).map(m => m.zpe_effects?.[idx] ?? 0),
                              color: ['#ffe066', '#ff00ff', '#00ffe7', '#39ff14', '#ffffff'][idx % 5],
                              label: `Layer ${idx + 1}`
                            })) || []}
                            width={600}
                            height={320}
                            overlays={[
                              { text: 'ZPE Evolution', color: '#39ff14', x: 120, y: 40, fontSize: 24 },
                              { text: `Model: ${activeJob?.parameters.modelName}`, color: '#00ffe7', x: 80, y: 300, fontSize: 16 }
                            ]}
                            showLegend
                          />
                      </div>
                      <div className="mt-6">
                          <h3 className="text-sm font-medium mb-2">ZPE Dynamics Summary</h3>
                          <div className="text-sm text-muted-foreground space-y-2">
                              <p>Layer-specific ZPE effects generally evolve during training. Stabilization or slight decay may occur as the model converges. Note the interplay between ZPE magnitudes and other parameters like quantum noise for holistic optimization.</p>
                          </div>
                      </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

