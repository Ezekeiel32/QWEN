"use client";

import React, { useEffect, useRef } from 'react';
import type p5 from 'p5';

interface BlochSphereSketchProps {
  theta: number;
  phi: number;
  evolving: boolean;
  width?: number;
  height?: number;
}

const BlochSphereSketch: React.FC<BlochSphereSketchProps> = ({
  theta: initialTheta,
  phi: initialPhi,
  evolving: initialEvolving,
  width = 400, // Default width if not filling parent
  height = 400, // Default height
}) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const timeRef = useRef(0); 
  const currentPhiRef = useRef(initialPhi); // Ref to store current evolving phi

  useEffect(() => {
    if (typeof window !== 'undefined' && sketchRef.current) {
      import('p5').then(p5Module => {
        const P5 = p5Module.default;

        if (p5InstanceRef.current) {
          p5InstanceRef.current.remove(); 
        }
        
        // Ensure the sketchRef has dimensions before creating canvas
        const parentWidth = sketchRef.current!.offsetWidth;
        const parentHeight = sketchRef.current!.offsetHeight;
        const canvasSize = Math.min(parentWidth, parentHeight, 400);


        const sketch = (p: p5) => {
          let currentTheta = initialTheta;
          // currentPhi is managed by currentPhiRef to persist across prop changes when evolving
          let currentEvolving = initialEvolving;

          p.setup = () => {
            p.createCanvas(canvasSize, canvasSize, p.WEBGL);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(16); // Base text size
            currentPhiRef.current = initialPhi; // Initialize currentPhiRef
          };
          
           p.updateWithProps = (props: BlochSphereSketchProps) => {
            currentTheta = props.theta;
            currentEvolving = props.evolving;
            if (!currentEvolving) { // If not evolving, update phi directly from props
                currentPhiRef.current = props.phi;
                timeRef.current = 0; // Reset time if we stop evolving
            } else {
                 // if evolution starts, and phi was manually set, use that as the new base
                if (!initialEvolving && currentEvolving) { // Check if it just started evolving
                    currentPhiRef.current = props.phi; // Sync with slider before starting evolution
                    timeRef.current = 0; // Reset time for evolution from current slider phi
                }
            }
          };
          
          // Initial call to set up based on props
          p.updateWithProps({ theta: initialTheta, phi: initialPhi, evolving: initialEvolving, width: canvasSize, height: canvasSize });


          p.draw = () => {
            p.background(p.color('hsl(var(--card))')); // Use CSS variable for background
            p.orbitControl(2,2,0.1); // Adjust sensitivity for better control

            if (currentEvolving) {
              currentPhiRef.current = (initialPhi + timeRef.current) % (2 * Math.PI); // Ensure phi wraps around
              timeRef.current += 0.02;
            }
            
            // Sphere properties
            const sphereRadius = p.min(canvasSize * 0.35, 100); // Responsive radius
            const axisLength = sphereRadius * 1.3;
            const labelOffset = sphereRadius * 1.45;
            const sphereDetail = Math.max(8, Math.floor(sphereRadius / 10)); // Detail based on size

            // Draw Bloch sphere (wireframe)
            p.push();
            p.noFill();
            p.stroke(p.color('hsl(var(--muted-foreground))')); // Use CSS variable
            p.strokeWeight(0.5);
            p.sphere(sphereRadius, sphereDetail, sphereDetail - 4 > 0 ? sphereDetail -4 : 8);
            p.pop();

            // Draw axes
            p.strokeWeight(1.5);
            // X-axis (red-ish, from chart colors)
            p.stroke(p.color('hsl(var(--chart-3))')); 
            p.line(-axisLength, 0, 0, axisLength, 0, 0);
            // Y-axis (green-ish)
            p.stroke(p.color('hsl(var(--chart-4))')); 
            p.line(0, -axisLength, 0, 0, axisLength, 0);
            // Z-axis (blue-ish, primary)
            p.stroke(p.color('hsl(var(--primary))'));
            p.line(0, 0, -axisLength, 0, 0, axisLength);

            // Label axes
            const labelSize = Math.max(10, sphereRadius / 8);
            p.push();
            p.fill(p.color('hsl(var(--foreground))'));
            p.noStroke();
            p.textSize(labelSize);
            
            // Defensive: get cam, pan, tilt
            let cam = (p as any)._renderer?.camera;
            const pan = typeof cam?.pan === 'function' ? cam.pan() : 0;
            const tilt = typeof cam?.tilt === 'function' ? cam.tilt() : 0;

            p.push(); p.translate(labelOffset, 0, 0); p.rotateY(-pan); p.rotateX(-tilt); p.text("X |+⟩", 0, 0); p.pop();
            p.push(); p.translate(0, labelOffset, 0); p.rotateY(-pan); p.rotateX(-tilt); p.text("Y |+i⟩", 0, 0); p.pop();
            p.push(); p.translate(0, 0, labelOffset); p.rotateY(-pan); p.rotateX(-tilt); p.text("Z |0⟩", 0, 0); p.pop();
            p.push(); p.translate(0, 0, -labelOffset);p.rotateY(-pan); p.rotateX(-tilt); p.text(" |1⟩", 0, 0); p.pop();
            p.pop();


            // Calculate Bloch vector components
            const x = Math.sin(currentTheta) * Math.cos(currentPhiRef.current);
            const y = Math.sin(currentTheta) * Math.sin(currentPhiRef.current);
            const z = Math.cos(currentTheta);

            // Draw state vector
            p.push();
            p.stroke(p.color('hsl(var(--accent))')); // Use CSS variable
            p.strokeWeight(2.5);
            p.line(0, 0, 0, x * sphereRadius, y * sphereRadius, z * sphereRadius);
            
            p.fill(p.color('hsl(var(--accent))')); // Use CSS variable
            p.noStroke();
            p.translate(x * sphereRadius, y * sphereRadius, z * sphereRadius);
            p.sphere(sphereRadius * 0.05); // Smaller sphere for the tip
            p.pop();
          };
          
          (p as any).customProps = (newProps: BlochSphereSketchProps) => {
             p.updateWithProps(newProps);
          };

          p.windowResized = () => {
            if (sketchRef.current) {
              const newSize = Math.min(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight, 400);
              p.resizeCanvas(newSize, newSize);
            }
          };
        };

        p5InstanceRef.current = new P5(sketch, sketchRef.current!);
      });
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, []); // Runs once on mount

  useEffect(() => {
    if (p5InstanceRef.current && (p5InstanceRef.current as any).customProps) {
        (p5InstanceRef.current as any).customProps({ theta: initialTheta, phi: initialPhi, evolving: initialEvolving, width, height });
    }
     if (!initialEvolving) { // If evolution is paused by prop change
        currentPhiRef.current = initialPhi; // Ensure the ref matches the slider
        timeRef.current = 0; // Reset internal time to avoid jump on resume if phi was changed
    }
  }, [initialTheta, initialPhi, initialEvolving, width, height]);


  return <div ref={sketchRef} className="w-full h-full aspect-square max-w-[400px] max-h-[400px] mx-auto rounded-md border shadow-lg bg-card" />;
};

export default BlochSphereSketch;
