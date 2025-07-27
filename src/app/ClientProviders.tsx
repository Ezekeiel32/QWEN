'use client';
import { Toaster } from '@/components/ui/toaster';
import { ClientBackground } from './ClientBackground';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClientBackground />
      {children}
      <Toaster />
    </>
  );
} 