"use client";
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import NeonAnalyzerChart from '@/components/visualizations/NeonAnalyzerChart';

interface PerformanceEpochData {
  epoch: number;
  train_acc: number;
  val_acc: number;
  train_loss: number;
  val_loss: number;
  zpe_effect: number;
}

export default function LatestPerformance() {
  const generatePerformanceData = (): PerformanceEpochData[] => {
    const result: PerformanceEpochData[] = [];
    for (let epoch = 1; epoch <= 6; epoch++) {
      result.push({
        epoch,
        train_acc: 95 + (epoch / 6) * 4 + Math.random() * 0.5,
        val_acc: 94 + (epoch / 6) * 4.5 + Math.random() * 0.7,
        train_loss: 0.4 - (epoch / 6) * 0.35 + Math.random() * 0.05,
        val_loss: 0.5 - (epoch / 6) * 0.35 + Math.random() * 0.08,
        zpe_effect: 0.2 + (epoch / 6) * 0.3 + Math.random() * 0.05
      });
    }
    return result;
  };

  const [performanceData, setPerformanceData] = useState<PerformanceEpochData[]>([]);
  
  useEffect(() => {
    setPerformanceData(generatePerformanceData());
  }, []);

  const lastEpoch = performanceData.length > 0 ? performanceData[performanceData.length - 1] : null;

  if (performanceData.length === 0 || !lastEpoch) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-3 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <div className="pt-4">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <div className="grid grid-cols-6 gap-2">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="w-full h-2 mb-1" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="md:col-span-3 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline">Training Metrics</CardTitle>
          <CardDescription>
            Latest performance across epochs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <NeonAnalyzerChart
              traces={[
                { data: performanceData.map(p => p.train_acc), color: '#00ffe7', label: 'Train Acc' },
                { data: performanceData.map(p => p.val_acc), color: '#ff00ff', label: 'Val Acc' },
              ]}
              width={600}
              height={380}
              overlays={[
                { text: 'Training Metrics', color: '#39ff14', x: 120, y: 40, fontSize: 24 },
              ]}
              showLegend
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline">Latest Results</CardTitle>
          <CardDescription>Epoch {lastEpoch.epoch} performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Training Accuracy</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-semibold">
                      {lastEpoch.train_acc.toFixed(2)}%
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Validation Accuracy</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 font-semibold">
                      {lastEpoch.val_acc.toFixed(2)}%
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Training Loss</TableCell>
                  <TableCell className="text-right font-code">
                    {lastEpoch.train_loss.toFixed(4)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Validation Loss</TableCell>
                  <TableCell className="text-right font-code">
                    {lastEpoch.val_loss.toFixed(4)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">ZPE Effect (Avg)</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 font-semibold">
                      {lastEpoch.zpe_effect.toFixed(3)}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <div className="pt-4">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">ZPE Effects by Layer (Conceptual)</h3>
              <div className="grid grid-cols-6 gap-2">
                {[0.12, 0.18, 0.24, 0.35, 0.11, 0.09].map((value, i) => ( // Assuming static for now
                  <div key={i} className="text-center">
                    <div className="w-full bg-muted rounded-full h-2 mb-1">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(value / 0.35) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{i+1}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Test Time Augmentation (Conceptual)</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Validation:</span>
                <span className="font-medium">{lastEpoch.val_acc.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">With TTA:</span>
                <span className="font-medium text-green-400">{(lastEpoch.val_acc + 0.6 + Math.random() * 0.2).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

