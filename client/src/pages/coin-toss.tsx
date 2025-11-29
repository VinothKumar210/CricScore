import { useState } from 'react';
import { useLocation } from 'wouter';

export function CoinToss() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<'toss-method'>('toss-method');

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <p>Coin Toss Component</p>
    </div>
  );
}
