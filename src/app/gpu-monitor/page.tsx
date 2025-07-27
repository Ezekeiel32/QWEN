'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { TrendingUp, Thermometer, Gauge, Bolt, HardDrive as Memory, Fan, Cpu, Clock, LucideIcon } from 'lucide-react';
import MetricDisplayCard from '@/components/ui/MetricDisplayCard'; // Import the new component

interface GpuInfo {
  id: string;
  name: string;
  utilization_gpu_percent: number;
  utilization_memory_io_percent: number;
  memory_total_mb: number;
  memory_used_mb: number;
  memory_free_mb: number;
  memory_used_percent: number;
  temperature_c: number;
  power_draw_w: number | null;
  fan_speed_percent: number | null;
}

interface CpuInfo {
  overall_usage_percent: number;
  current_frequency_mhz: number | null;
}

interface SystemStats {
  gpu_info: GpuInfo | { error?: string; info?: string } | null;
  cpu_info: CpuInfo | { error?: string } | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";

export default function GPUMonitorPage() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/system-stats`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: SystemStats = await response.json();
        
        if (data.gpu_info && 'error' in data.gpu_info) {
 setError(data.gpu_info.error as string | null);
             setSystemStats(null);
        } else if (data.gpu_info && 'info' in data.gpu_info) { // Display info messages as errors for simplicity in the UI
 setError((data.gpu_info.info || 'GPU information is not available.') as string | null); // Display info messages as errors for simplicity in the UI
            setSystemStats(null);
 }
        else {
          setSystemStats(data);
          setError(null);
        }

      } catch (error: any) { // Changed error message handling slightly for clarity
        setError(`Failed to fetch system stats: ${error.message || 'Unknown error'}`);
        setSystemStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStats();
    const intervalId = setInterval(fetchSystemStats, 5000); // Fetch every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div className="container mx-auto py-10">Loading system stats...</div>;
  }

  if (error) {
    return <div className="container mx-auto py-10 text-red-500">Error: {error}</div>;
  }

  if (!systemStats) {
    return <div className="container mx-auto py-10">No system data available.</div>;
  }

  const { gpu_info, cpu_info } = systemStats;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">System Monitor</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* GPU Metrics */}
        {/* Explicitly check if gpu_info is of type GpuInfo before accessing properties */}
        {gpu_info && typeof gpu_info === 'object' && !('error' in gpu_info) && !('info' in gpu_info) && (
            <>
                {/* Ensure gpu_info has the necessary properties before rendering */}
                {'utilization_gpu_percent' in gpu_info && (
                    <MetricDisplayCard
                        title="GPU Utilization"
                        value={gpu_info.utilization_gpu_percent.toFixed(1)}
                        unit="%"
                        icon={TrendingUp as LucideIcon}
                        percentage={gpu_info.utilization_gpu_percent}
                    />
                )}
                 {'memory_used_mb' in gpu_info && 'memory_total_mb' in gpu_info && 'memory_used_percent' in gpu_info && (
                     <MetricDisplayCard
                        title="GPU Memory Usage"
                        value={gpu_info.memory_used_mb.toFixed(0)}
                        unit="MB" 
                        icon={Memory as LucideIcon}
                        percentage={gpu_info.memory_used_percent}
                     />
                 )}
                 {'temperature_c' in gpu_info && (
                    <MetricDisplayCard
                        title="GPU Temperature"
                        value={gpu_info.temperature_c.toFixed(1)}
                        unit="°C"
                        icon={Thermometer as LucideIcon}
                    />
                 )}
                 {'power_draw_w' in gpu_info && gpu_info.power_draw_w !== null && (
                     <MetricDisplayCard
                         title="GPU Power Draw"
                         value={gpu_info.power_draw_w.toFixed(1)}
                         unit="W"
                         icon={Bolt as LucideIcon}
                     />
                 )}
                 {'fan_speed_percent' in gpu_info && gpu_info.fan_speed_percent !== null && (
                    <MetricDisplayCard
                        title="GPU Fan Speed"
                        value={gpu_info.fan_speed_percent.toFixed(0)}
                        unit="%"
                        icon={Fan as LucideIcon}
                        percentage={gpu_info.fan_speed_percent}
                    />
                 )}
            </>
        )}

        {/* CPU Metrics */}
        {/* Explicitly check if cpu_info is of type CpuInfo before accessing properties */}
        {cpu_info && typeof cpu_info === 'object' && !('error' in cpu_info) && 'overall_usage_percent' in cpu_info && (
 <>
 {/* Ensure cpu_info has the necessary properties before rendering */}
 <MetricDisplayCard
 title="CPU Utilization"
 value={cpu_info.overall_usage_percent.toFixed(1)}
 unit="%"
 icon={Cpu as LucideIcon}
 percentage={cpu_info.overall_usage_percent}
 />
 {/* Only show CPU frequency if it exists */}
 {cpu_info && typeof cpu_info === 'object' && 'current_frequency_mhz' in cpu_info && cpu_info.current_frequency_mhz !== null && (
 <MetricDisplayCard
 title="CPU Frequency"
 value={cpu_info.current_frequency_mhz.toFixed(0)}
 unit="MHz"
 icon={Clock}
 />
 )}
 {/* Moved CPU Utilization card inside the main CPU check */}

            </>
        )}
      </div>
    </div>
  );
}
