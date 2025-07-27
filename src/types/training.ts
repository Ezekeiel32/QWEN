export interface GpuInfo {
  id?: string;
  name?: string;
  utilization_gpu_percent?: number;
  utilization_memory_io_percent?: number; 
  memory_used_mb?: number;
  memory_total_mb?: number;
  memory_free_mb?: number; 
  memory_used_percent?: number; 
  temperature_c?: number;
  power_draw_w?: number;
  error?: string; 
  info?: string; 
}

export interface TrainingParameters {
  totalEpochs: number;
  batchSize: number;
  learningRate: number;
  weightDecay: number;
  momentumParams: number[];
  strengthParams: number[];
  noiseParams: number[];
  couplingParams: number[]; // Added couplingParams
  quantumCircuitSize: number;
  labelSmoothing: number;
  quantumMode: boolean;
  modelName: string;
  baseConfigId?: string | null; // Made optional and allow null
  channel_sizes?: number[]; // Add this line
  mixupAlpha: number; // Add this line for mixupAlpha
}

export interface TrainingJob {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed" | "stopped" | "unknown_interrupted";
  current_epoch: number;
  total_epochs: number;
  accuracy: number;
  loss: number;
  zpe_effects: number[];
  log_messages: string[];
  parameters: TrainingParameters; 
  start_time?: string | null;
  end_time?: string | null;
  gpu_info?: GpuInfo; 
  metrics_history?: any[];
  zpe_history?: any[];
}

// Summary for the jobs list
export interface TrainingJobSummary {
  job_id: string;
  model_name: string;
  status: TrainingJob["status"];
  accuracy: number;
  current_epoch: number;
  total_epochs: number;
  start_time?: string | null;
}
