"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Atom } from 'lucide-react';

const ZPEParticleSketch = dynamic(
  () => import('@/components/visualizations/ZPEParticleSketch'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex-1 w-full flex items-center justify-center bg-muted rounded-md border shadow-lg min-h-[400px]">
        <p>Loading ZPE Particle Simulation...</p>
      </div>
    ) 
  }
);

export default function ZPEParticleSimulationPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 flex flex-col h-full">
      <Card className="mb-6 shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Atom className="h-7 w-7 text-primary" />
            ZPE Particle Physics Simulation
          </CardTitle>
          <CardDescription>
            An interactive 3D visualization exploring concepts of Zero-Point Energy, particle interactions,
            a scanning system, and tetrahedral memory modules. This is a creative interpretation and
            demonstration of dynamic particle systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">
            The simulation features various particle types (Quarks, Leptons, Gluons) with unique properties,
            ZPE-induced perturbations, and a dynamic tetrahedral memory structure that interacts with scanned particles.
          </p>
          <p className="text-sm text-muted-foreground">
            Use your mouse to orbit and explore the 3D scene.
          </p>
        </CardContent>
      </Card>
      <div className="w-full flex-1 min-h-0"> 
        {mounted ? (
          <ZPEParticleSketch />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded-md border shadow-lg">
            <p>Initializing 3D Sketch...</p>
          </div>
        )}
      </div>
    </div>
  );
} 