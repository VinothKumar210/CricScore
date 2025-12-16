import { useEffect, useState } from 'react';

useEffect(() => {
  const myTeamPlayers = localStorage.getItem('myTeamPlayers');
  const opponentTeamPlayers = localStorage.getItem('opponentTeamPlayers');
  const myTeamName = localStorage.getItem('myTeamName');
  const opponentTeamName = localStorage.getItem('opponentTeamName');
  const matchOvers = localStorage.getItem('matchOvers');

  if (myTeamPlayers && opponentTeamPlayers && myTeamName && opponentTeamName) {
    setMatchData({
      myTeamPlayers: JSON.parse(myTeamPlayers),
      opponentTeamPlayers: JSON.parse(opponentTeamPlayers),
      myTeamName,
      opponentTeamName,
      matchOvers: matchOvers || undefined
    });
  } else {
    setLocation('/local-match');
  }
}, [setLocation]);
{phase === 'toss-method' && (
  <div className="text-center space-y-6">
    <h3 className="text-xl font-semibold">Choose Toss Method</h3>
    <div className="flex flex-col gap-4 justify-center max-w-md">
      <Button onClick={() => handleTossMethodChoice('animated')}>🪙 Animated Coin Toss</Button>
      <Button onClick={() => handleTossMethodChoice('manual')} variant="outline">✏️ Enter Toss Result Manually</Button>
    </div>
  </div>
)}
const handleTossMethodChoice = (method: 'animated' | 'manual') => {
  setTossMethod(method);
  if (method === 'animated') {
    setIsFlipping(true);
    setResult(null);
    setPhase('toss-spinning');
  } else {
    setPhase('manual-entry');
  }
};

const handleOpponentChoice = (side: 'heads' | 'tails') => {
  const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
  setSelectedSide(side);
  setResult(coinResult);
  setIsFlipping(false);
  setTossWinner(side === coinResult ? 'opponent' : 'user');
  setPhase('determine-winner');
};
