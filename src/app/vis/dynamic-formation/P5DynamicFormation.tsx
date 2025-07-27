"use client";
import React, { useEffect, useRef } from 'react';
import type p5 from 'p5';

interface P5DynamicFormationProps {
  // Props for customization can be added here
  particleCount?: number;
}

const P5DynamicFormation: React.FC<P5DynamicFormationProps> = ({ particleCount = 100 }) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sketchRef.current) {
      import('p5').then(p5Module => {
        const P5 = p5Module.default;

        if (p5InstanceRef.current) {
          p5InstanceRef.current.remove();
        }

        const sketch = (p: p5) => {
          let particles: { pos: p5.Vector, vel: p5.Vector, color: p5.Color }[] = [];
          let attractors: p5.Vector[] = [];

          p.setup = () => {
            if (sketchRef.current) {
                p.createCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight, p.WEBGL);
            } else {
                p.createCanvas(600, 400, p.WEBGL); // Fallback
            }
            
            for (let i = 0; i < particleCount; i++) {
              particles.push({
                pos: P5.Vector.random3D().mult(p.random(100, 200)),
                vel: P5.Vector.random3D().mult(p.random(0.1, 0.5)),
                color: p.color(p.random(180, 240), 80, 90, 150) // HSL-like with alpha
              });
            }

            for (let i = 0; i < 3; i++) {
                attractors.push(P5.Vector.random3D().mult(150));
            }
            p.colorMode(p.HSB, 360, 100, 100, 255);
          };

          p.draw = () => {
            p.background(p.color('hsl(240, 8%, 12%)')); // Dark background, slightly different from main
            p.orbitControl(2,2,0.1);
            
            // Update attractors
            attractors.forEach(attractor => {
                attractor.x = p.sin(p.frameCount * 0.005 + attractor.x * 0.1) * 200;
                attractor.y = p.cos(p.frameCount * 0.005 + attractor.y * 0.1) * 200;
                attractor.z = p.sin(p.frameCount * 0.003 + attractor.z * 0.1) * 150;
                
                p.push();
                p.noStroke();
                p.fill(0,0,100,50); // Whiteish attractor core
                p.translate(attractor.x, attractor.y, attractor.z);
                p.sphere(5);
                p.pop();
            });


            particles.forEach(pt => {
              let totalForce = p.createVector();
              attractors.forEach(attractor => {
                  let forceDir = P5.Vector.sub(attractor, pt.pos);
                  let distSq = forceDir.magSq();
                  if(distSq > 100) { // Avoid extreme forces at close range
                    forceDir.normalize().mult(300 / (distSq + 100)); // Attraction force
                    totalForce.add(forceDir);
                  }
              });

              // Add some ZPE-like random jitter
              let jitter = P5.Vector.random3D().mult(0.2);
              totalForce.add(jitter);

              pt.vel.add(totalForce.mult(0.01));
              pt.vel.limit(2);
              pt.pos.add(pt.vel);

              p.push();
              p.translate(pt.pos.x, pt.pos.y, pt.pos.z);
              p.noStroke();
              
              // Dynamic color based on velocity or distance
              let speed = pt.vel.mag();
              let hue = p.map(speed, 0, 2, 180, 300); // Blue to magenta
              p.fill(hue, 80, 90, 200); // HSB with Alpha
              p.sphere(3 + speed * 0.5); // Size based on speed
              p.pop();
              
              // Draw connections to nearby particles (conceptual entanglement/field lines)
              particles.forEach(otherPt => {
                  if (pt !== otherPt) {
                      let d = P5.Vector.dist(pt.pos, otherPt.pos);
                      if (d < 30) { // Connect if close enough
                          p.stroke(hue, 50, 100, p.map(d, 0, 30, 100, 0)); // Fades with distance
                          p.strokeWeight(0.5);
                          p.line(pt.pos.x, pt.pos.y, pt.pos.z, otherPt.pos.x, otherPt.pos.y, otherPt.pos.z);
                      }
                  }
              });
            });
          };
          
          p.windowResized = () => {
            if (sketchRef.current) {
              p.resizeCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight);
            }
          }
        };

        p5InstanceRef.current = new P5(sketch, sketchRef.current!);
      });
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }
    };
  }, [particleCount]);

  return <div ref={sketchRef} className="w-full h-full rounded-md border shadow-lg" />;
};

export default P5DynamicFormation;
