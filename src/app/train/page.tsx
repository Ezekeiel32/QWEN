import { Suspense } from "react";
import TrainModelClient from './TrainModelClient';

export default function TrainPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TrainModelClient />
    </Suspense>
  );
}