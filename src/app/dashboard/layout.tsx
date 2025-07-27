import React from 'react';
import LatestPerformance from '@/components/dashboard/LatestPerformance';
import ModelSummary from '@/components/dashboard/ModelSummary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {children} {/* This will render the DashboardPage content */}
      <LatestPerformance />
      <ModelSummary />
    </div>
  );
}
