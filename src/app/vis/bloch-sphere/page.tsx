"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Globe, PauseIcon, PlayIcon } from 'lucide-react';

const BlochSphereSketch = dynamic(
  () => import('@/components/visualizations/BlochSphereSketch'),
  { ssr: false, loading: () => <div className="h-[400px] w-[400px] flex items-center justify-center bg-muted rounded-md border shadow-lg"><p>Loading 3D Sketch...</p></div> }
);

export default function BlochSpherePage() {
  const [theta, setTheta] = useState(Math.PI / 2);
  const [phi, setPhi] = useState(0);
  const [evolving, setEvolving] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleThetaChange = (value: number[]) => setTheta(value[0]);
  const handlePhiChange = (value: number[]) => setPhi(value[0]);
  const toggleEvolution = () => setEvolving(e => !e);

  const psiString = `|ψ⟩ = cos(${(theta / 2).toFixed(2)})|0⟩ + e^(i${phi.toFixed(2)})sin(${(theta / 2).toFixed(2)})|1⟩`;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Globe className="h-7 w-7 text-primary" />
            Quantum Hilbert Space: 3D Bloch Sphere
          </CardTitle>
          <CardDescription>
            In quantum physics, a qubit&apos;s state lives in a 2D complex <b>Hilbert space</b>, spanned by basis states |0⟩ and |1⟩.
            The <b>Bloch sphere</b> visualizes this state as a vector on a 3D unit sphere, parameterized by angles θ (polar) and φ (azimuthal).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">
            The state is represented as: |ψ⟩ = cos(θ/2)|0⟩ + e<sup>iφ</sup>sin(θ/2)|1⟩.
          </p>
          <p className="text-sm text-muted-foreground">
            <b>Dynamic Evolution:</b> The state can evolve under a Hamiltonian (e.g., H = σ_x, causing precession around the x-axis).
            Here, evolution primarily affects φ.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <b>Interact:</b> Adjust θ and φ with sliders to set the initial state. Click the button to pause/resume time evolution of φ.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Controls</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theta-slider">Theta (θ): {theta.toFixed(2)} rad</Label>
                <Slider
                  id="theta-slider"
                  min={0}
                  max={Math.PI}
                  step={0.01}
                  value={[theta]}
                  onValueChange={handleThetaChange}
                  className="my-2"
                  aria-label="Theta slider"
                />
                <p className="text-xs text-muted-foreground">Polar angle: 0 (Up, |0⟩) to π (Down, |1⟩)</p>
              </div>
              <div>
                <Label htmlFor="phi-slider">Phi (φ): {phi.toFixed(2)} rad</Label>
                <Slider
                  id="phi-slider"
                  min={0}
                  max={2 * Math.PI}
                  step={0.01}
                  value={[phi]}
                  onValueChange={handlePhiChange}
                  className="my-2"
                  disabled={evolving}
                  aria-label="Phi slider"
                />
                <p className="text-xs text-muted-foreground">Azimuthal angle: 0 to 2π (Rotation around Z-axis)</p>
              </div>
              <Button onClick={toggleEvolution} className="w-full" aria-pressed={evolving}>
                {evolving ? <PauseIcon className="mr-2 h-4 w-4" /> : <PlayIcon className="mr-2 h-4 w-4" />}
                {evolving ? 'Pause Evolution' : 'Resume Evolution'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Current State</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-mono bg-muted p-2 rounded-md break-all">{psiString}</p>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 flex items-center justify-center">
          {mounted ? (
            <BlochSphereSketch theta={theta} phi={phi} evolving={evolving} />
          ) : (
            <div className="h-[400px] w-[400px] flex items-center justify-center bg-muted rounded-md border shadow-lg"><p>Initializing 3D Sketch...</p></div>
          )}
        </div>
      </div>
    </div>
  );
} 