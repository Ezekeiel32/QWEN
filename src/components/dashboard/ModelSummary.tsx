"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircuitBoard, Zap, Shield, Atom } from "lucide-react";

export default function ModelSummary() {
  return (
    <Card className="bg-card/80 backdrop-blur-sm"> 
      <CardHeader>
        <CardTitle className="font-headline">Model Architecture Key Features</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-md">
              <CircuitBoard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-accent-foreground">Network Structure</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Convolutional backbone with 4 conv layers (64-128-256-512 channels) and 3 fully connected layers (2048-512-10). Employs GELU activations and SE Blocks for dynamic feature recalibration.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
             <div className="p-2 bg-primary/10 rounded-md">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-accent-foreground">ZPE Flow Layers</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Zero-Point Energy flow applied after each major block, featuring tunable momentum, strength, noise, and coupling parameters for adaptive network modulation.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-md">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-accent-foreground">Advanced Regularization</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Integrates skip connections for improved gradient flow, dropout (0.05-0.25), and label smoothing (0.03) to enhance generalization and prevent overfitting.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-md">
             <Atom className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-accent-foreground">Quantum Integration</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Strategic quantum noise injection, simulated via a 32-qubit circuit, primarily targets the 4th convolutional layer to enhance feature representation at high complexity stages.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
