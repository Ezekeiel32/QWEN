"use client";

import React, { useEffect, useRef } from 'react';
import type p5 from 'p5';

// No longer needs width/height props as it will fill its parent
interface ZPEParticleSketchProps {}

const ZPEParticleSketch: React.FC<ZPEParticleSketchProps> = () => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sketchRef.current) {
      import('p5').then(p5Module => {
        const P5 = p5Module.default;

        if (p5InstanceRef.current) {
          p5InstanceRef.current.remove(); // Cleanup previous instance
        }

        const sketch = (p: p5) => {
          // --- Start of user's p5.js code ---
          let particles: any[] = []; 
          const numParticles = 100;
          let zpeStrength = 0.05; 
          let zpeNoise = 0.02;   
          
          let scanner: {
            active: boolean;
            position: p5.Vector | null;
            radius: number;
            angle: number;
            speed: number;
            detectedParticles: any[];
          } = {
              active: false,
              position: null as p5.Vector | null,
              radius: 60,
              angle: 0,
              speed: 0.02,
              detectedParticles: [] as any[]
          };
          
          let tetrahedralMemory: {
            nodes: any[];
            connections: any[];
            capacity: number;
            scanHistory: any[];
            processingPower: number;
          } = {
              nodes: [] as any[], 
              connections: [] as any[],
              capacity: 12, 
              scanHistory: [] as any[],
              processingPower: 0
          };
          
          const TYPES = {
              QUARK: { size: 4, speed: 1.5, color: [0, 90, 95], memory: 2 }, // Hue, Saturation, Brightness
              LEPTON: { size: 2.5, speed: 2.2, color: [180, 85, 90], memory: 1 },
              GLUON: { size: 1.5, speed: 3, color: [280, 95, 100], memory: 3 }
          };
          
          let connections: any[] = [];
          
          class Particle {
              type: string;
              typeProps: { size: number; speed: number; color: number[]; memory: number };
              pos: p5.Vector;
              vel: p5.Vector;
              zpeOffset: number;
              size: number;
              baseColor: number[];
              scanned: boolean;
              inMemory: boolean;
              memoryNode: any; 
              dataValue: number;
              timeStored: number = 0;


              constructor(type?: string) {
                  this.type = type || this.randomType();
                  this.typeProps = TYPES[this.type as keyof typeof TYPES];
                  this.pos = P5.Vector.random3D().mult(100);
                  this.vel = P5.Vector.random3D().mult(this.typeProps.speed * 0.5);
                  this.zpeOffset = p.random(1000);
                  this.size = this.typeProps.size;
                  this.baseColor = [...this.typeProps.color]; // HSB
                  this.scanned = false;
                  this.inMemory = false;
                  this.memoryNode = null;
                  this.dataValue = p.floor(p.random(100));
              }
              
              randomType() {
                  const types = Object.keys(TYPES);
                  return types[p.floor(p.random(types.length))];
              }
              
              update() {
                  let perturbation = p.createVector(
                      p.noise(this.zpeOffset + p.frameCount * 0.01) - 0.5,
                      p.noise(this.zpeOffset + 1000 + p.frameCount * 0.01) - 0.5,
                      p.noise(this.zpeOffset + 2000 + p.frameCount * 0.01) - 0.5
                  ).mult(zpeStrength * (this.type === 'GLUON' ? 2 : 1));
                  
                  this.vel.add(perturbation);
                  this.vel.limit(this.typeProps.speed);
                  this.pos.add(this.vel);
                  
                  if (this.pos.mag() > 150) { // Boundary
                      this.pos.normalize().mult(150);
                      this.vel.mult(-0.5); // Bounce back
                  }
                  
                  if (this.scanned && p.frameCount % 60 === 0) { // Reset scanned status periodically
                      this.scanned = false;
                  }
              }
              
              display() {
                  p.push();
                  p.translate(this.pos.x, this.pos.y, this.pos.z);
                  
                  let hueShift = (p.frameCount * 0.2 + this.zpeOffset) % 60;
                  let hue = (this.baseColor[0] + hueShift) % 360;
                  let saturation = this.baseColor[1];
                  let brightness = this.baseColor[2];
                  
                  if (this.scanned) {
                      brightness = p.min(100, brightness + 20);
                      saturation = p.max(50, saturation - 20);
                  }
                  
                  if (this.inMemory) {
                      p.stroke(60, 100, 100); // Yellowish highlight for in-memory
                      p.strokeWeight(0.5);
                  } else {
                      p.noStroke();
                  }
                  
                  if (this.type === 'QUARK') {
                      p.fill(hue, saturation, brightness);
                      p.sphere(this.size);
                  } 
                  else if (this.type === 'LEPTON') {
                      p.fill(hue, saturation, brightness, 80); // Slightly transparent
                      if (!this.inMemory) {
                          p.stroke(hue, saturation - 20, brightness);
                          p.strokeWeight(0.5);
                      }
                      p.sphere(this.size);
                  } 
                  else if (this.type === 'GLUON') {
                      p.fill(hue, saturation, brightness, 70); // More transparent
                      if (!this.inMemory) {
                          p.stroke(hue, saturation - 20, brightness + 10);
                          p.strokeWeight(0.8);
                      }
                      p.rotateX(p.frameCount * 0.03);
                      p.rotateY(p.frameCount * 0.04);
                      p.torus(this.size, this.size * 0.4);
                  }
                  p.pop();
              }
          }
          
          class TetrahedralNode {
              pos: p5.Vector;
              originalPos: p5.Vector;
              index: number;
              size: number;
              active: boolean;
              storedParticle: Particle | null;
              processingPower: number;
              pulseSize: number;
              connections: number[];

              constructor(position: p5.Vector, nodeIndex: number) {
                  this.pos = position.copy();
                  this.originalPos = position.copy();
                  this.index = nodeIndex;
                  this.size = 5;
                  this.active = false;
                  this.storedParticle = null;
                  this.processingPower = 0;
                  this.pulseSize = 0;
                  this.connections = []; // Store indices of connected nodes
              }
              
              update() {
                  // Drift back to original position
                  let target = this.originalPos.copy();
                  let direction = P5.Vector.sub(target, this.pos);
                  direction.mult(0.1); // Spring-like behavior
                  this.pos.add(direction);
                  
                  if (this.active) {
                      this.pulseSize = 8 + p.sin(p.frameCount * 0.1) * 2;
                      if (this.storedParticle) {
                          this.processingPower = this.storedParticle.dataValue / 100; // Example power
                      }
                  } else {
                      this.pulseSize = p.max(0, this.pulseSize - 0.2);
                      this.processingPower *= 0.95; // Decay power if not active
                  }
              }
              
              display() {
                  p.push();
                  p.translate(this.pos.x, this.pos.y, this.pos.z);
                  
                  if (this.active) {
                      p.fill(60, 100, 100, 70); p.stroke(60, 100, 100); // Active color (yellowish)
                  } else {
                      p.fill(210, 70, 50, 50); p.stroke(210, 70, 80); // Inactive color (blueish)
                  }
                  p.strokeWeight(0.8); p.sphere(this.size);
                  
                  if (this.pulseSize > 0) { // Pulsing effect
                      p.noFill(); p.stroke(60, 100, 100, 30); p.strokeWeight(0.5); p.sphere(this.pulseSize);
                  }
                  
                  // Display stored particle representation
                  if (this.storedParticle) {
                      p.rotateY(p.frameCount * 0.05); // Gentle rotation
                      p.fill(this.storedParticle.baseColor[0], this.storedParticle.baseColor[1], this.storedParticle.baseColor[2], 50);
                      p.stroke(this.storedParticle.baseColor[0], this.storedParticle.baseColor[1], this.storedParticle.baseColor[2]);
                      p.strokeWeight(0.3);
                      if (this.storedParticle.type === 'QUARK') p.box(3);
                      else if (this.storedParticle.type === 'LEPTON') p.cylinder(2, 4);
                      else p.cone(2, 4); // GLUON
                  }
                  p.pop();
              }
          }
          
          function initTetrahedralMemory() {
              tetrahedralMemory.nodes = [];
              const baseSize = 60;
              const v1 = p.createVector(baseSize, 0, -baseSize/2);
              const v2 = p.createVector(-baseSize, 0, -baseSize/2);
              const v3 = p.createVector(0, 0, baseSize);
              const apex = p.createVector(0, baseSize * 1.5, 0);
              
              tetrahedralMemory.nodes.push(new TetrahedralNode(v1, 0));
              tetrahedralMemory.nodes.push(new TetrahedralNode(v2, 1));
              tetrahedralMemory.nodes.push(new TetrahedralNode(v3, 2));
              tetrahedralMemory.nodes.push(new TetrahedralNode(apex, 3));
              // Add more nodes for a complex structure
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v1, v2, 0.5), 4));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v2, v3, 0.5), 5));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v3, v1, 0.5), 6));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v1, apex, 0.5), 7));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v2, apex, 0.5), 8));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(v3, apex, 0.5), 9));
              const center = p.createVector(0, baseSize * 0.5, 0);
              tetrahedralMemory.nodes.push(new TetrahedralNode(center, 10));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(center, apex, 0.3), 11));
              tetrahedralMemory.nodes.push(new TetrahedralNode(P5.Vector.lerp(center, v1, 0.3), 12)); // Ensure index is 12 for capacity
              createTetrahedralConnections();
          }
          
          function createTetrahedralConnections() {
              // Basic tetrahedral connections
              addMemoryConnection(0, 1); addMemoryConnection(1, 2); addMemoryConnection(2, 0); // Base
              addMemoryConnection(0, 3); addMemoryConnection(1, 3); addMemoryConnection(2, 3); // To apex
              // Midpoints
              addMemoryConnection(4, 0); addMemoryConnection(4, 1); addMemoryConnection(5, 1);
              addMemoryConnection(5, 2); addMemoryConnection(6, 2); addMemoryConnection(6, 0);
              addMemoryConnection(7, 0); addMemoryConnection(7, 3); addMemoryConnection(8, 1);
              addMemoryConnection(8, 3); addMemoryConnection(9, 2); addMemoryConnection(9, 3);
              // Center connections
              addMemoryConnection(10, 11); addMemoryConnection(10, 12); addMemoryConnection(10, 4);
              addMemoryConnection(10, 5); addMemoryConnection(10, 6); addMemoryConnection(11, 3);
              addMemoryConnection(12, 0); // Corrected to use actual index 12
          }
          
          function addMemoryConnection(index1: number, index2: number) {
              let node1 = tetrahedralMemory.nodes[index1];
              let node2 = tetrahedralMemory.nodes[index2];
              if (!node1 || !node2) return; // Safety check
              node1.connections.push(index2); node2.connections.push(index1);
              tetrahedralMemory.connections.push({
                  from: index1, to: index2, active: false, strength: 0, pulsePhase: p.random(p.TWO_PI)
              });
          }
          
          function connectParticles() {
              connections = [];
              const gluons = particles.filter(pt => pt.type === 'GLUON');
              const quarks = particles.filter(pt => pt.type === 'QUARK');
              for (let gluon of gluons) {
                  let closestQuarks = findClosestParticles(gluon, quarks, 2);
                  for (let quark of closestQuarks) {
                      connections.push({ from: gluon, to: quark, strength: p.random(0.4, 0.8) });
                  }
              }
              // Temporary lepton connections
              if (p.frameCount % 30 === 0) { // Less frequent
                  const leptons = particles.filter(pt => pt.type === 'LEPTON');
                  if (leptons.length >= 2) {
                      for (let i = 0; i < p.min(5, leptons.length); i++) { // Limit number of connections
                          let lepton1 = leptons[p.floor(p.random(leptons.length))];
                          let lepton2 = findClosestParticles(lepton1, leptons, 1)[0]; // Find one closest
                          if (lepton1 && lepton2 && lepton1 !== lepton2) { // Ensure different and valid
                              connections.push({ from: lepton1, to: lepton2, strength: 0.3, lifetime: 20, age: 0 });
                          }
                      }
                  }
              }
          }
          
          function findClosestParticles(source: Particle, targetList: Particle[], count: number) {
              return targetList
                  .filter(pt => pt !== source) // Exclude self
                  .sort((a, b) => P5.Vector.dist(source.pos, a.pos) - P5.Vector.dist(source.pos, b.pos))
                  .slice(0, count);
          }
          
          function updateScanner() {
              if (!scanner.active) {
                  if (p.random() < 0.005) { // Chance to activate scanner
                      scanner.active = true;
                      scanner.position = P5.Vector.random3D().mult(100); // Random start
                      scanner.detectedParticles = [];
                  }
                  return;
              }
              // Scanner movement
              scanner.angle += scanner.speed;
              if (scanner.position) {
                scanner.position.x = p.sin(scanner.angle) * 120;
                scanner.position.z = p.cos(scanner.angle) * 120;
                scanner.position.y = p.sin(scanner.angle * 1.5) * 60; // Lissajous-like path
              }
              
              scanner.detectedParticles = [];
              for (let particle of particles) {
                  if (scanner.position && P5.Vector.dist(particle.pos, scanner.position) < scanner.radius) {
                      scanner.detectedParticles.push(particle);
                      particle.scanned = true;
                      if (!particle.inMemory) addToMemory(particle);
                  }
              }
              if (p.random() < 0.01) scanner.active = false; // Chance to deactivate
          }
          
          function renderScanner() {
              if (!scanner.active || !scanner.position) return;
              p.push();
              p.translate(scanner.position.x, scanner.position.y, scanner.position.z);
              p.noFill(); p.stroke(120, 100, 100, 20); p.strokeWeight(0.5); p.sphere(scanner.radius); // Scanner field
              p.fill(120, 100, 100, 50); p.noStroke(); p.sphere(5); // Scanner core
              // Lines to detected particles
              if (scanner.detectedParticles.length > 0) {
                  p.stroke(120, 100, 100, 70); p.strokeWeight(0.8);
                  for (let particle of scanner.detectedParticles) {
                      let relativePos = P5.Vector.sub(particle.pos, scanner.position!);
                      p.line(0, 0, 0, relativePos.x, relativePos.y, relativePos.z);
                  }
              }
              p.pop();
          }
          
          function addToMemory(particle: Particle) {
              let availableNodes = tetrahedralMemory.nodes.filter(n => !n.active);
              if (availableNodes.length === 0) { // If full, replace oldest
                  let oldestNode = tetrahedralMemory.nodes.reduce((oldest, current) => 
                      (!oldest.active || (current.active && oldest.storedParticle && current.storedParticle && oldest.storedParticle.timeStored < current.storedParticle.timeStored)) ? oldest : current
                  );
                  if (oldestNode.storedParticle) { // Release old particle
                      oldestNode.storedParticle.inMemory = false;
                      oldestNode.storedParticle.memoryNode = null;
                  }
                  oldestNode.active = false; oldestNode.storedParticle = null;
                  availableNodes = [oldestNode];
              }
              let selectedNode = availableNodes[p.floor(p.random(availableNodes.length))];
              selectedNode.active = true; selectedNode.storedParticle = particle;
              particle.inMemory = true; particle.memoryNode = selectedNode; particle.timeStored = p.frameCount;
              activateMemoryConnections(selectedNode);
              tetrahedralMemory.scanHistory.push({ particleType: particle.type, timeStamp: p.frameCount, dataValue: particle.dataValue });
              if (tetrahedralMemory.scanHistory.length > 20) tetrahedralMemory.scanHistory.shift();
              updateMemoryProcessingPower();
          }
          
          function activateMemoryConnections(node: any) { // node is TetrahedralNode
              for (let conn of tetrahedralMemory.connections) {
                  if (conn.from === node.index || conn.to === node.index) {
                      let otherNodeIndex = conn.from === node.index ? conn.to : conn.from;
                      let otherNode = tetrahedralMemory.nodes[otherNodeIndex];
                      if (otherNode.active) { // Connect if other node is also active
                          conn.active = true; conn.strength = 0.8;
                          // Stronger connection if same particle type
                          if (otherNode.storedParticle && node.storedParticle && otherNode.storedParticle.type === node.storedParticle.type) {
                              conn.strength = 1.0;
                          }
                      }
                  }
              }
          }
          
          function updateMemoryProcessingPower() {
              let totalPower = 0;
              for (let node of tetrahedralMemory.nodes) {
                  if (node.active && node.storedParticle) totalPower += node.processingPower;
              }
              let activeConnections = tetrahedralMemory.connections.filter(c => c.active);
              totalPower *= (1 + activeConnections.length / 20); // Boost by active connections
              tetrahedralMemory.processingPower = totalPower;
          }
          
          function renderConnections() {
              for (let i = connections.length - 1; i >= 0; i--) {
                  let c = connections[i];
                  if (c.lifetime) { // For temporary connections like lepton-lepton
                      c.age++;
                      if (c.age > c.lifetime) { connections.splice(i, 1); continue; }
                  }
                  let p1 = c.from.pos; let p2 = c.to.pos;
                  if (c.from.type === 'GLUON') { // Gluon-Quark
                      p.stroke(c.from.baseColor[0], 70, 100, c.strength * 100); p.strokeWeight(0.8 * c.strength);
                  } else { // Lepton-Lepton (temporary)
                      p.stroke(220, 80, 100, 50 * (1 - (c.age || 0)/(c.lifetime || 1))); p.strokeWeight(0.5);
                  }
                  p.line(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
              }
          }
          
          function renderMemoryConnections() {
              for (let conn of tetrahedralMemory.connections) {
                  let node1 = tetrahedralMemory.nodes[conn.from];
                  let node2 = tetrahedralMemory.nodes[conn.to];
                  if (conn.active) {
                      let pulse = (p.sin(p.frameCount * 0.2 + conn.pulsePhase) + 1) / 2; // Pulsing strength
                      p.stroke(60, 100, 100, 30 + conn.strength * 70 * pulse);
                      p.strokeWeight(0.5 + conn.strength * pulse);
                  } else {
                      p.stroke(210, 30, 50, 20); p.strokeWeight(0.3); // Faint inactive connection
                  }
                  p.line(node1.pos.x, node1.pos.y, node1.pos.z, node2.pos.x, node2.pos.y, node2.pos.z);
              }
          }
          
          function renderMemoryNodes() {
              for (let node of tetrahedralMemory.nodes) {
                  node.update(); node.display();
              }
          }

          p.setup = () => {
            if (sketchRef.current) {
              p.createCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight, p.WEBGL);
            } else {
              p.createCanvas(600,600, p.WEBGL); // Fallback
            }
            p.colorMode(p.HSB, 360, 100, 100, 100); // Hue, Saturation, Brightness, Alpha (0-100 for p5)
            
            for (let i = 0; i < numParticles; i++) {
                let type;
                if (i < numParticles * 0.5) type = 'QUARK';
                else if (i < numParticles * 0.8) type = 'LEPTON';
                else type = 'GLUON';
                particles.push(new Particle(type));
            }
            initTetrahedralMemory();
          };

          p.draw = () => {
              p.background(p.color('hsl(240, 8%, 10%)')); // Slightly darker than main background
              p.ambientLight(150);
              p.pointLight(p.color('hsl(0, 0%, 100%)'), p.sin(p.frameCount * 0.02) * 200, p.cos(p.frameCount * 0.02) * 200, 100 );
              p.pointLight(p.color('hsl(240, 80%, 80%)'), p.cos(p.frameCount * 0.01) * 150, p.sin(p.frameCount * 0.01) * 150, -50 );
              p.orbitControl(2,2,0.1);
              p.rotateX(p.frameCount * 0.002); p.rotateY(p.frameCount * 0.003);
              updateScanner();
              if (p.frameCount % 10 === 0) connectParticles(); // Connect less frequently
              // Update and render memory system
              for (let conn of tetrahedralMemory.connections) { // Decay active connections
                  if (conn.active) {
                      conn.strength *= 0.99;
                      if (conn.strength < 0.1) conn.active = false;
                  }
              }
              renderMemoryConnections(); renderMemoryNodes();
              renderConnections(); // Particle connections
              for (let pt of particles) { pt.update(); pt.display(); }
              renderScanner();
              zpeStrength = 0.05 + p.noise(p.frameCount * 0.02) * zpeNoise; // Dynamic ZPE strength
          };

          p.windowResized = () => {
            if (sketchRef.current) {
              p.resizeCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight);
            }
          }
          // --- End of user's p5.js code ---
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
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return <div ref={sketchRef} className="w-full h-full rounded-md border shadow-lg bg-card" />;
};

export default ZPEParticleSketch;
