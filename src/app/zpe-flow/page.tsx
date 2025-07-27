"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";

import { adviseHSQNNParameters, type HSQNNAdvisorInput, type HSQNNAdvisorOutput } from "@/ai/flows/hs-qnn-parameter-advisor";
import type { TrainingParameters, TrainingJob, TrainingJobSummary } from "@/types/training";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrainCircuit, Lightbulb, Terminal, Wand2, ArrowRight, RefreshCw, SlidersHorizontal } from "lucide-react";
import { MiniHSQNNAdvisor } from "@/components/mini-hs-qnn-advisor";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9006/api";

const TrainingParametersSchema = z.object({
  totalEpochs: z.number().int().min(1).max(200),
  batchSize: z.number().int().min(8).max(256),
  learningRate: z.number().min(0.00001).max(0.1),
  weightDecay: z.number().min(0).max(0.1),
  momentumParams: z.array(z.number().min(0).max(1)).length(6, "Must have 6 momentum parameters"),
  strengthParams: z.array(z.number().min(0).max(1)).length(6, "Must have 6 strength parameters"),
  noiseParams: z.array(z.number().min(0).max(1)).length(6, "Must have 6 noise parameters"),
  couplingParams: z.array(z.number().min(0).max(1)).length(6, "Must have 6 coupling parameters"),
  quantumCircuitSize: z.number().int().min(4).max(64),
  labelSmoothing: z.number().min(0).max(0.5),
  quantumMode: z.boolean(),
  modelName: z.string().min(3, "Model name must be at least 3 characters"),
  baseConfigId: z.string().nullable().optional(),
});

const HSQNNAdvisorInputSchemaClient = z.object({
  previousJobId: z.string().min(1, "Please select a previous job."),
  hnnObjective: z.string().min(20, "Objective must be at least 20 characters long.").max(500, "Objective is too long."),
});

interface ZpeHistoryEntry {
  epoch: number;
  zpeEffects: number[];
  zpe_effects: number[];
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

type AdvisorFormValues = z.infer<typeof HSQNNAdvisorInputSchemaClient>;

export default function HSQNNParameterAdvisorPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <MiniHSQNNAdvisor fullMode={true} onApplyParameters={() => {}} onSaveConfig={() => {}} />
    </div>
  );
}