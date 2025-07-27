"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IterationCw } from 'lucide-react';

const P5DynamicFormation = dynamic(
  () => import('./P5DynamicFormation'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex-1 w-full flex items-center justify-center bg-muted rounded-md border shadow-lg min-h-[400px]">
        <p>Loading Dynamic Formation Sketch...</p>
      </div>
    ) 
  }
);

export default function DynamicFormationPage() {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 flex flex-col h-full">
      <Card className="mb-6 shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <IterationCw className="h-7 w-7 text-primary" />
            Dynamic Particle Formation
          </CardTitle>
          <CardDescription>
            Conceptual 3D visualization of particles interacting under simulated forces,
            representing emergent complex behaviors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">
            Observe particles influenced by dynamic attractors and ZPE-like jitter.
            Lines between nearby particles conceptually represent field interactions or entanglement.
          </p>
          <p className="text-sm text-muted-foreground">
            Use your mouse to orbit and explore the 3D scene.
          </p>
        </CardContent>
      </Card>

      <div className="w-full flex-1 min-h-0"> 
        {mounted ? (
          <P5DynamicFormation />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted rounded-md border shadow-lg min-h-[400px]">
            <p>Initializing 3D Sketch...</p>
          </div>
        )}
      </div>
    </div>
  );
}
