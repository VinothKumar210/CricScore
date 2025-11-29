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
