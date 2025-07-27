"use client";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Replace, Cog, Scaling, Box, Share2, Wrench, Rocket, ArrowRight, Wand2 } from 'lucide-react';
import { MiniHSQNNAdvisor } from "@/components/mini-hs-qnn-advisor";

const aiFlows = [
  { href: "/ai/configure-model", title: "AI Model Configurator", description: "Get AI advice for model parameters based on dataset description and PyTorch code.", icon: Wrench },
  { href: "/ai/hsqnn-advisor", title: "HS-QNN Parameter Advisor", description: "AI guidance for ZPE parameters in Hilbert Space Quantum Neural Network sequences.", icon: Rocket },
  { href: "/ai/implement-zpe", title: "Simulate ZPE Effects", description: "Simulate Zero-Point Energy effects on model accuracy and layer dynamics.", icon: Lightbulb },
  { href: "/ai/approximate-zpe", title: "Approximate ZPE Flow", description: "Dynamically approximate a ZPE flow parameter mimicking quantum states.", icon: Replace },
  { href: "/ai/adapt-zpe", title: "Adapt ZPE from Code", description: "Adapt ZPE flows based on PyTorch component code and layer data.", icon: Cog },
  { href: "/ai/show-scaled-output", title: "Scaled Quantum Output", description: "Simulate a pseudo-quantum circuit and visualize its scaled output.", icon: Scaling },
  { href: "/ai/quantize-model", title: "Quantize Colab Model", description: "Generate quantization code & report for a PyTorch model from Colab.", icon: Box },
  { href: "/ai/extract-high-gain-components", title: "Extract High-Gain Components", description: "Identify key model components for targeted quantum applications.", icon: Share2 },
  { href: "/ai/invoke-llm", title: "Generic LLM Invoker", description: "Directly interact with a large language model using custom prompts.", icon: Wand2 },
];

export default function AiFlowsHubPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-8 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Rocket className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-headline tracking-tight text-primary">GenAI Flows Hub</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Access a suite of specialized AI-powered tools for designing, analyzing, and optimizing your ZPE Quantum Neural Networks.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <MiniHSQNNAdvisor fullMode onApplyParameters={() => {}} onSaveConfig={() => {}} className="my-8" />
      </div>
    </div>
  );
}
