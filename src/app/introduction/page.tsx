"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Zap, Atom, Brain, CircuitBoard } from 'lucide-react';
import Link from "next/link";

const IntroductionPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-foreground p-4 overflow-hidden relative bg-background">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full filter blur-3xl animate-pulse opacity-50"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full filter blur-3xl animate-pulse opacity-50 animation-delay-2000"></div>
         <div className="absolute top-1/3 -right-1/4 w-1/3 h-1/3 bg-purple-500/5 rounded-full filter blur-3xl animate-pulse opacity-40 animation-delay-4000"></div>
      </div>

      <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center z-10">
        <section className="text-center max-w-4xl">
          <div className="mb-12">
            <Zap className="h-20 w-20 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-5xl md:text-7xl font-headline font-bold mb-6 leading-tight tracking-tight bg-gradient-to-r from-primary via-accent to-purple-400 bg-clip-text text-transparent">
              Welcome to Quantum Weaver
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-muted-foreground">
              Dive into the quantum realm, where Zero-Point Energy (ZPE) reshapes the future of Artificial Intelligence.
            </p>
          </div>
          

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-12">
            <div className="bg-card/70 backdrop-blur-md rounded-xl p-8 shadow-xl transform transition duration-500 hover:scale-105 hover:shadow-primary/20 border border-border">
              <div className="flex items-center mb-4">
                <Atom className="h-8 w-8 text-accent mr-3" />
                <h2 className="text-3xl font-semibold text-accent-foreground">Harnessing the Vacuum</h2>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                We&apos;re exploring the quantum vacuum, utilizing the fundamental hum of Zero-Point Energy. ZPE represents the baseline energy inherent in quantum systems, a dynamic field even in ostensibly empty space.
              </p>
            </div>

            <div className="bg-card/70 backdrop-blur-md rounded-xl p-8 shadow-xl transform transition duration-500 hover:scale-105 hover:shadow-primary/20 border border-border">
              <div className="flex items-center mb-4">
                 <Brain className="h-8 w-8 text-accent mr-3" />
                <h2 className="text-3xl font-semibold text-accent-foreground">Dawn of ZPE Intelligence</h2>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                 By innovatively encoding ZPE&apos;s principles, potentially through novel computational paradigms like advanced binary progressions, we engineer neural networks exhibiting remarkable adaptability and learning from true randomness.
              </p>
            </div>
          </div>
          
          <div className="bg-card/70 backdrop-blur-md rounded-xl p-8 shadow-xl transform transition duration-500 hover:scale-105 hover:shadow-primary/20 border border-border md:col-span-2 mb-12">
              <h2 className="text-3xl font-semibold mb-4 text-center text-accent-foreground">Exponential Computational Power</h2>
              <p className="text-lg leading-relaxed text-muted-foreground text-center">
                Zero-Point Energy, when its principles are integrated into neural architectures, offers a conceptual pathway to unlock significantly enhanced computational capabilities, pushing the boundaries of model efficiency and performance.
              </p>
          </div>

          <Button 
            size="lg" 
            className="mt-8 mb-4 px-10 py-6 text-lg font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 bg-purple-600 hover:bg-purple-700 text-white" 
            asChild
          >
            <Link href="/architecture">
              <CircuitBoard className="mr-2 h-5 w-5" /> Explore ZPE-QNN Model Architecture
            </Link>
          </Button>

          <p className="text-2xl md:text-3xl font-headline font-bold mt-8 text-primary animate-fade-in-up">
            Witness AI learning and adapting with quantum-inspired elegance!
          </p>

          <Button size="lg" className="mt-8 px-10 py-6 text-xl font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-transform duration-300 bg-primary hover:bg-primary/90" asChild>
            <Link href="/dashboard">Explore the Platform</Link>
          </Button>
        </section>
      </main>
       <style jsx>{`
        .animate-fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
         .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default IntroductionPage;

    