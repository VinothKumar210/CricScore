import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export default function BowlerSelection() {
  const [, setLocation] = useLocation();
  const [matchState, setMatchState] = useState(null);

  useEffect(() => {
    const savedMatchState = localStorage.getItem('currentMatchState');
    if (savedMatchState) {
      setMatchState(JSON.parse(savedMatchState));
    } else {
      setLocation('/scoreboard');
    }
  }, [setLocation]);

  if (!matchState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold">Bowler Selection</h1>
    </div>
  );
}
