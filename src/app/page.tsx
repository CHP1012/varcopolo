'use client';

import { useState } from 'react';
import DimensionGate from "@/components/templates/DimensionGate";
import ExplorationView from "@/components/templates/ExplorationView";
import { useSessionStore } from '@/store/useSessionStore';

export default function Home() {
  const [phase, setPhase] = useState<'GATE' | 'EXPLORE'>('GATE');

  // Optional: Check if session exists on load to restore EXPLORE phase
  // const { currentWorld } = useSessionStore();
  // useEffect(() => { if (currentWorld) setPhase('EXPLORE'); }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden">
      {/* Background Ambience (Optional) */}
      <div className="absolute inset-0 z-0 bg-background pointer-events-none" />

      {phase === 'GATE' ? (
        <div className="z-10 w-full h-screen">
          <DimensionGate onEnter={() => setPhase('EXPLORE')} />
        </div>
      ) : (
        <div className="z-10 w-full h-screen">
          <ExplorationView onExit={() => setPhase('GATE')} />
        </div>
      )}
    </main>
  );
}
