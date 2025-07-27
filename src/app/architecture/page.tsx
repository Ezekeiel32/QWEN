"use client";

import React from "react";
import { 
  CircuitBoard, 
  Braces, 
  Layers, 
  Zap, 
  Atom, 
  Network,
  ArrowRightLeft,
  ArrowLeftRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ModelArchitecture() {
  return (
    <div className="p-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Model Architecture</h1>
          <p className="text-muted-foreground">
            Detailed structure of the ZPE Quantum Neural Network
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="layers">Layer Structure</TabsTrigger>
            <TabsTrigger value="quantum">Quantum Integration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircuitBoard className="h-5 w-5 text-primary" />
                    Network Summary
                  </CardTitle>
                  <CardDescription>
                    High-level overview of the ZPE neural network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                        <Layers className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Convolutional Backbone</h3>
                        <p className="text-sm text-muted-foreground">
                          Four convolutional layers with increasing channel dimensions (64-128-256-512)
                          providing hierarchical feature extraction. Each layer includes batch normalization, 
                          GELU activation, and SE blocks.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                        <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">ZPE Flow Integration</h3>
                        <p className="text-sm text-muted-foreground">
                          Zero-Point Energy flow applied after each layer with dynamically adjusted 
                          parameters. Flow momentum, strength, noise, and coupling are fine-tuned
                          per layer to optimize performance.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                        <Network className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Skip Connections</h3>
                        <p className="text-sm text-muted-foreground">
                          Residual connections between layers enable better gradient flow and 
                          information preservation. Each skip connection includes a 1×1 convolution
                          for dimension matching.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                        <Atom className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Quantum Noise Injection</h3>
                        <p className="text-sm text-muted-foreground">
                          Strategically applied quantum noise using a 32-qubit circuit simulation.
                          Applied primarily to the 4th layer where feature complexity is highest.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Braces className="h-5 w-5 text-primary" />
                    Architecture Diagram
                  </CardTitle>
                  <CardDescription>
                    Visual representation of network components
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-h-[500px] flex items-center justify-center">
                  <div className="w-full h-full py-8">
                    <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="50" y="150" width="80" height="200" rx="8" className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-500" />
                      <text x="90" y="250" textAnchor="middle" className="text-sm font-medium fill-foreground">Input</text>
                      <text x="90" y="270" textAnchor="middle" className="text-xs fill-muted-foreground">1×28×28</text>
                      <rect x="160" y="150" width="60" height="200" rx="8" className="fill-indigo-100 dark:fill-indigo-900/30 stroke-indigo-500" />
                      <text x="190" y="250" textAnchor="middle" className="text-sm font-medium fill-foreground">Conv1</text>
                      <text x="190" y="270" textAnchor="middle" className="text-xs fill-muted-foreground">64×14×14</text>
                      <rect x="250" y="150" width="60" height="200" rx="8" className="fill-indigo-100 dark:fill-indigo-900/30 stroke-indigo-500" />
                      <text x="280" y="250" textAnchor="middle" className="text-sm font-medium fill-foreground">Conv2</text>
                      <text x="280" y="270" textAnchor="middle" className="text-xs fill-muted-foreground">128×7×7</text>
                      <rect x="340" y="150" width="60" height="200" rx="8" className="fill-indigo-100 dark:fill-indigo-900/30 stroke-indigo-500" />
                      <text x="370" y="250" textAnchor="middle" className="text-sm font-medium fill-foreground">Conv3/4</text>
                      <text x="370" y="270" textAnchor="middle" className="text-xs fill-muted-foreground">256-512</text>
                      <rect x="430" y="150" width="60" height="200" rx="8" className="fill-green-100 dark:fill-green-900/30 stroke-green-500" />
                      <text x="460" y="250" textAnchor="middle" className="text-sm font-medium fill-foreground">FC</text>
                      <text x="460" y="270" textAnchor="middle" className="text-xs fill-muted-foreground">2048/512/10</text>
                      <line x1="130" y1="250" x2="160" y2="250" className="stroke-foreground/40 stroke-2" />
                      <line x1="220" y1="250" x2="250" y2="250" className="stroke-foreground/40 stroke-2" />
                      <line x1="310" y1="250" x2="340" y2="250" className="stroke-foreground/40 stroke-2" />
                      <line x1="400" y1="250" x2="430" y2="250" className="stroke-foreground/40 stroke-2" />
                      <rect x="160" y="100" width="60" height="30" rx="4" className="fill-purple-300/30 stroke-purple-500" />
                      <text x="190" y="120" textAnchor="middle" className="text-xs fill-purple-700 dark:fill-purple-300">ZPE Flow</text>
                      <line x1="190" y1="130" x2="190" y2="150" className="stroke-purple-500 stroke-1 stroke-dashed" />
                      <rect x="250" y="100" width="60" height="30" rx="4" className="fill-purple-300/30 stroke-purple-500" />
                      <text x="280" y="120" textAnchor="middle" className="text-xs fill-purple-700 dark:fill-purple-300">ZPE Flow</text>
                      <line x1="280" y1="130" x2="280" y2="150" className="stroke-purple-500 stroke-1 stroke-dashed" />
                      <rect x="340" y="100" width="60" height="30" rx="4" className="fill-purple-300/30 stroke-purple-500" />
                      <text x="370" y="120" textAnchor="middle" className="text-xs fill-purple-700 dark:fill-purple-300">ZPE Flow</text>
                      <line x1="370" y1="130" x2="370" y2="150" className="stroke-purple-500 stroke-1 stroke-dashed" />
                      <rect x="430" y="100" width="60" height="30" rx="4" className="fill-purple-300/30 stroke-purple-500" />
                      <text x="460" y="120" textAnchor="middle" className="text-xs fill-purple-700 dark:fill-purple-300">ZPE Flow</text>
                      <line x1="460" y1="130" x2="460" y2="150" className="stroke-purple-500 stroke-1 stroke-dashed" />
                      <rect x="310" y="390" width="120" height="40" rx="4" className="fill-orange-100 dark:fill-orange-900/30 stroke-orange-500" />
                      <text x="370" y="415" textAnchor="middle" className="text-xs fill-orange-700 dark:fill-orange-300">Quantum Circuit (32 qubits)</text>
                      <line x1="370" y1="390" x2="370" y2="350" className="stroke-orange-500 stroke-1 stroke-dashed" />
                      <path d="M 130 200 C 145 200, 145 200, 160 200" className="stroke-green-500 stroke-1" />
                      <path d="M 220 200 C 235 200, 235 200, 250 200" className="stroke-green-500 stroke-1" />
                      <path d="M 310 200 C 325 200, 325 200, 340 200" className="stroke-green-500 stroke-1" />
                      <path d="M 400 200 C 415 200, 415 200, 430 200" className="stroke-green-500 stroke-1" />
                      <circle cx="145" cy="200" r="3" className="fill-green-500" />
                      <circle cx="235" cy="200" r="3" className="fill-green-500" />
                      <circle cx="325" cy="200" r="3" className="fill-green-500" />
                      <circle cx="415" cy="200" r="3" className="fill-green-500" />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Parameter Summary</CardTitle>
                <CardDescription>Key hyperparameters and network configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">Convolutional Settings</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex justify-between"><span>Filter Sizes:</span><span>3×3</span></li>
                      <li className="flex justify-between"><span>Activation:</span><span>GELU</span></li>
                      <li className="flex justify-between"><span>Pooling:</span><span>Max 2×2</span></li>
                      <li className="flex justify-between"><span>Channel Dimensions:</span><span>64/128/256/512</span></li>
                      <li className="flex justify-between"><span>Squeeze-Excite:</span><span>r=16</span></li>
                    </ul>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">ZPE Parameters</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex justify-between"><span>Momentum Range:</span><span>0.65-0.9</span></li>
                      <li className="flex justify-between"><span>Strength Range:</span><span>0.27-0.6</span></li>
                      <li className="flex justify-between"><span>Noise Range:</span><span>0.22-0.35</span></li>
                      <li className="flex justify-between"><span>Coupling Range:</span><span>0.7-0.85</span></li>
                      <li className="flex justify-between"><span>Max Amplitude:</span><span>±0.3</span></li>
                    </ul>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold text-primary">Training Settings</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex justify-between"><span>Optimizer:</span><span>AdamW</span></li>
                      <li className="flex justify-between"><span>Learning Rate:</span><span>0.001-0.005</span></li>
                      <li className="flex justify-between"><span>Weight Decay:</span><span>1e-4</span></li>
                      <li className="flex justify-between"><span>Dropout:</span><span>0.05-0.25</span></li>
                      <li className="flex justify-between"><span>Label Smoothing:</span><span>0.03</span></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="layers" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Convolutional Layers</CardTitle><CardDescription>Detailed structure of the convolutional backbone</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {[
                      { badge: "Conv1", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", title: "First Convolutional Block", in: "1×28×28", out: "64×14×14", params: "~1.8K", conv: "3×3, 64" },
                      { badge: "Conv2", badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300", title: "Second Convolutional Block", in: "64×14×14", out: "128×7×7", params: "~73K", conv: "3×3, 128" },
                    ].map(block => (
                    <div key={block.badge} className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-muted/50"><h3 className="flex items-center gap-2 font-semibold"><Badge className={block.badgeClass}>{block.badge}</Badge><span>{block.title}</span></h3></div>
                      <div className="p-4">
                        <div className="grid grid-cols-5 gap-2 text-sm">
                          <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 flex items-center justify-center text-center">Conv2D<br/>{block.conv}</div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-center justify-center text-center">BatchNorm</div>
                          <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-2 flex items-center justify-center text-center">GELU</div>
                          <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 flex items-center justify-center text-center">SE Block<br/>r=16</div>
                          <div className="bg-orange-100 dark:bg-orange-900/30 rounded p-2 flex items-center justify-center text-center">MaxPool<br/>2×2</div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground"><p>Input: {block.in} → Output: {block.out}</p><p>Parameters: {block.params}</p></div>
                      </div>
                    </div>
                    ))}
                     <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-muted/50"><h3 className="flex items-center gap-2 font-semibold"><Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300">Conv3/4</Badge><span>Deeper Convolutional Blocks</span></h3></div>
                      <div className="p-4">
                        <div className="grid grid-cols-5 gap-2 text-sm">
                          <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 flex items-center justify-center text-center">Conv2D<br/>3×3, 256/512</div>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 flex items-center justify-center text-center">BatchNorm</div>
                          <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-2 flex items-center justify-center text-center">GELU</div>
                          <div className="bg-green-100 dark:bg-green-900/30 rounded p-2 flex items-center justify-center text-center">SE Block<br/>r=16</div>
                          <div className="bg-orange-100 dark:bg-orange-900/30 rounded p-2 flex items-center justify-center text-center">MaxPool<br/>2×2</div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          <div className="flex gap-8"><div><p><strong>Conv3:</strong></p><p>Input: 128×7×7 → Output: 256×3×3</p><p>Parameters: ~295K</p></div><div><p><strong>Conv4:</strong></p><p>Input: 256×3×3 → Output: 512×1×1</p><p>Parameters: ~1.2M</p></div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader><CardTitle>Additional Components</CardTitle><CardDescription>Auxiliary modules and network enhancements</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-muted/50"><h3 className="flex items-center gap-2 font-semibold"><Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">ZPE</Badge><span>Zero-Point Energy Flow</span></h3></div>
                      <div className="p-4">
                        <div className="space-y-4">
                          <div className="bg-purple-100/50 dark:bg-purple-900/20 p-3 rounded-lg text-sm"><pre className="whitespace-pre-wrap font-mono text-xs">{`def apply_zpe(self, x, zpe_idx):\n    flow_expanded = self.zpe_flows[zpe_idx].view(1, -1, 1, 1)\n    return x * flow_expanded`}</pre></div>
                          <p className="text-sm text-muted-foreground">ZPE flow provides channel-wise modulation based on momentum-governed perturbations. The flow parameters evolve during training through:</p>
                          <div className="text-sm"><ol className="list-decimal ml-4 space-y-1"><li>Previous flow state preservation via momentum</li><li>Generation of perturbations based on batch statistics</li><li>Optional quantum noise integration</li><li>Controlled coupling across channels</li></ol></div>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-muted/50"><h3 className="flex items-center gap-2 font-semibold"><Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">SE</Badge><span>Squeeze-Excitation Block</span></h3></div>
                      <div className="p-4">
                        <div className="flex justify-center my-2">
                          <div className="flex flex-col items-center gap-2"><div className="bg-blue-100 dark:bg-blue-900/30 rounded w-24 py-1 text-center text-sm">Input Features</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-amber-100 dark:bg-amber-900/30 rounded w-24 py-1 text-center text-sm">Global Pooling</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-green-100 dark:bg-green-900/30 rounded w-24 py-1 text-center text-sm">FC (c/r)</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-purple-100 dark:bg-purple-900/30 rounded w-24 py-1 text-center text-sm">GELU</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-green-100 dark:bg-green-900/30 rounded w-24 py-1 text-center text-sm">FC (c)</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-red-100 dark:bg-red-900/30 rounded w-24 py-1 text-center text-sm">Sigmoid</div><ArrowLeftRight className="h-5 w-5 text-muted-foreground" /></div>
                          <div className="ml-4 mt-20 flex flex-col items-center gap-2"><div className="bg-blue-100 dark:bg-blue-900/30 rounded w-24 py-1 text-center text-sm">Input Features</div><ArrowRightLeft className="h-5 w-5 text-muted-foreground rotate-90" /><div className="bg-indigo-100 dark:bg-indigo-900/30 rounded w-24 py-1 text-center text-sm">Scale Features</div></div>
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground"><p>SE blocks provide adaptive feature recalibration, dynamically emphasizing informative channels while suppressing less useful ones.</p></div>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 border-b bg-muted/50"><h3 className="flex items-center gap-2 font-semibold"><Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">FC</Badge><span>Fully Connected Layers</span></h3></div>
                      <div className="p-4">
                        <div className="bg-orange-100/50 dark:bg-orange-900/20 p-3 rounded-lg text-sm"><pre className="whitespace-pre-wrap font-mono text-xs">{`self.fc = nn.Sequential(\n    nn.Flatten(), \n    nn.Linear(512, 2048), nn.GELU(), nn.Dropout(0.25),\n    nn.Linear(2048, 512), nn.GELU(), nn.Dropout(0.25),\n    nn.Linear(512, 10)\n)`}</pre></div>
                        <div className="mt-4 text-sm text-muted-foreground"><p>The fully connected section processes flattened features through three layers with decreasing dropout rates. GELU activation provides non-linearity with smooth gradients.</p></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="quantum" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Quantum Integration</CardTitle><CardDescription>Architecture details of quantum noise generation and application</CardDescription></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3 text-primary">Quantum Circuit Architecture</h3>
                    <div className="bg-muted p-4 rounded-lg mb-4"><pre className="whitespace-pre-wrap text-xs font-mono">{`def generate_quantum_noise(self, num_channels, zpe_idx):\n    qubits_per_run = 32\n    # ... (rest of cirq code) ...\n    return torch.tensor(perturbation, device=self.device, dtype=torch.float32)`}</pre></div>
                    <div className="space-y-2"><h4 className="font-medium text-sm">Implementation Notes:</h4><ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1"><li>Quantum circuit runs on a classical simulator (cirq)</li><li>Each qubit undergoes Hadamard gate and random rotations</li><li>Measurement results are transformed via tanh function</li><li>Multiple circuit runs handle large channel counts</li></ul></div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-primary">Quantum-Classical Integration</h3>
                    <div className="bg-purple-100/50 dark:bg-purple-900/20 p-3 rounded-lg text-sm mb-4"><pre className="whitespace-pre-wrap font-mono text-xs">{`def perturb_zpe_flow(self, data, zpe_idx):\n    # ... (classical noise or quantum noise based on zpe_idx) ...\n    # Apply momentum update\n    # ...`}</pre></div>
                    <div className="space-y-4">
                      <div><h4 className="font-medium text-sm">Integration Strategy:</h4><ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1 mt-2"><li>Quantum noise selectively applied to 4th conv layer</li><li>Other layers use classical noise with correlation</li><li>Momentum-based update rule for both noise types</li><li>Perturbations bounded via tanh and clamping</li></ul></div>
                      <div><h4 className="font-medium text-sm">Theoretical Advantages:</h4><ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1 mt-2"><li>Higher-quality exploration with quantum randomness</li><li>Focused computational resources via layer-specific application</li><li>Stable state evolution with momentum</li><li>Feature relationship preservation via correlation</li></ul></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Quantum Circuit Visualization</CardTitle><CardDescription>Simplified view of the quantum circuit for a single qubit</CardDescription></CardHeader>
                <CardContent className="min-h-[250px] flex items-center justify-center">
                  <svg width="400" height="200" className="max-w-full">
                    <line x1="50" y1="100" x2="350" y2="100" className="stroke-foreground stroke-2" /><text x="30" y="105" textAnchor="middle" className="fill-foreground text-sm">|0⟩</text>
                    <rect x="80" y="80" width="40" height="40" className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-500" /><text x="100" y="105" textAnchor="middle" className="fill-blue-800 dark:fill-blue-400 text-sm font-medium">H</text>
                    <rect x="160" y="80" width="40" height="40" className="fill-purple-100 dark:fill-purple-900/30 stroke-purple-500" /><text x="180" y="105" textAnchor="middle" className="fill-purple-800 dark:fill-purple-400 text-sm font-medium">Rz</text>
                    <rect x="240" y="80" width="40" height="40" className="fill-green-100 dark:fill-green-900/30 stroke-green-500" /><text x="260" y="105" textAnchor="middle" className="fill-green-800 dark:fill-green-400 text-sm font-medium">Rx</text>
                    <path d="M 320,80 L 320,120 L 330,100 Z" className="fill-orange-100 dark:fill-orange-900/30 stroke-orange-500" />
                    <text x="100" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">Superposition</text><text x="180" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">Phase Rotation</text><text x="260" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">X Rotation</text><text x="320" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">Measure</text>
                    <text x="100" y="165" textAnchor="middle" className="fill-muted-foreground text-xs">|0⟩ → |+⟩</text><text x="180" y="165" textAnchor="middle" className="fill-muted-foreground text-xs">θ ∈ [0, 2π]</text><text x="260" y="165" textAnchor="middle" className="fill-muted-foreground text-xs">φ ∈ [0, π]</text><text x="320" y="165" textAnchor="middle" className="fill-muted-foreground text-xs">|0⟩ or |1⟩</text>
                  </svg>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Performance Impact</CardTitle><CardDescription>Observed effects of quantum noise application</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 flex flex-col items-center"><div className="text-3xl font-bold text-green-600 dark:text-green-400">+1.8%</div><div className="text-sm text-muted-foreground mt-1">Accuracy Improvement</div></div>
                      <div className="border rounded-lg p-4 flex flex-col items-center"><div className="text-3xl font-bold text-blue-600 dark:text-blue-400">-12%</div><div className="text-sm text-muted-foreground mt-1">Overfitting Reduction</div></div>
                      <div className="border rounded-lg p-4 flex flex-col items-center"><div className="text-3xl font-bold text-purple-600 dark:text-purple-400">+15%</div><div className="text-sm text-muted-foreground mt-1">Faster Convergence</div></div>
                      <div className="border rounded-lg p-4 flex flex-col items-center"><div className="text-3xl font-bold text-amber-600 dark:text-amber-400">5-10×</div><div className="text-sm text-muted-foreground mt-1">Generation Cost</div></div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg"><h4 className="font-medium mb-2">Key Findings</h4><ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1"><li>Most effective when applied to high-level feature layers</li><li>Benefits increase with model depth and complexity</li><li>Optimal coupling values are model-specific</li><li>Performance improvement justifies computational overhead</li><li>Effects are most pronounced on complex, ambiguous examples</li></ul></div>
                    <div className="flex items-center justify-between gap-4 border-t pt-4"><div className="flex items-center gap-2"><Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Research Status</Badge><span className="text-sm font-medium">Active Investigation</span></div><div className="flex items-center gap-2"><Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Implementation</Badge><span className="text-sm font-medium">Simulation-Based</span></div></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

    