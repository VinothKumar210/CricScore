import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';

type Phase = 'choose-side' | 'toss' | 'determine-winner' | 'choose-batting' | 'final';

export function CoinToss() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<Phase>('choose-side');
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [tossWinner, setTossWinner] = useState<'user' | 'opponent' | null>(null);
  const [battingChoice, setBattingChoice] = useState<'batting' | 'bowling' | null>(null);

  const handleSideSelection = (side: 'heads' | 'tails') => {
    setSelectedSide(side);
    setPhase('toss');
  };

  const handleToss = () => {
    setIsFlipping(true);
    setResult(null);

    // Simulate coin flip after animation
    setTimeout(() => {
      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(coinResult);
      setIsFlipping(false);
      
      // Determine toss winner based on user's choice vs actual result
      const winner = selectedSide === coinResult ? 'opponent' : 'user';
      setTossWinner(winner);
      setPhase('determine-winner');
    }, 2000);
  };

  const handleShowBattingChoice = () => {
    setPhase('choose-batting');
  };

  const handleBattingChoice = (choice: 'batting' | 'bowling') => {
    setBattingChoice(choice);
    setPhase('final');
  };

  const handleStartOver = () => {
    setPhase('choose-side');
    setSelectedSide(null);
    setResult(null);
    setTossWinner(null);
    setBattingChoice(null);
  };

  const getUserTeamRole = () => {
    if (!tossWinner || !battingChoice) return '';
    
    if (tossWinner === 'user') {
      return battingChoice === 'batting' ? 'batting first' : 'bowling first';
    } else {
      return battingChoice === 'batting' ? 'bowling first' : 'batting first';
    }
  };

  const getOpponentTeamRole = () => {
    if (!tossWinner || !battingChoice) return '';
    
    if (tossWinner === 'user') {
      return battingChoice === 'batting' ? 'bowling first' : 'batting first';
    } else {
      return battingChoice === 'batting' ? 'batting first' : 'bowling first';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Coin Toss</CardTitle>
          <p className="text-muted-foreground">
            {phase === 'choose-side' && "Choose your side and let's decide who bats first!"}
            {phase === 'toss' && "Ready to toss the coin!"}
            {phase === 'determine-winner' && "Let's see who won the toss!"}
            {phase === 'choose-batting' && `${tossWinner === 'user' ? 'You' : 'Opponent'} won the toss! Choose your preference.`}
            {phase === 'final' && "Toss complete! Here's the batting order."}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8">
          {/* Side Selection Phase */}
          {phase === 'choose-side' && (
            <div className="text-center space-y-6">
              <h3 className="text-xl font-semibold">Choose Your Side</h3>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => handleSideSelection('heads')}
                  className="px-8 py-4 text-lg"
                  data-testid="button-choose-heads"
                >
                  👑 Heads
                </Button>
                <Button 
                  onClick={() => handleSideSelection('tails')}
                  className="px-8 py-4 text-lg"
                  data-testid="button-choose-tails"
                >
                  🏏 Tails
                </Button>
              </div>
            </div>
          )}

          {/* Coin Display (for toss and result phases) */}
          {(phase === 'toss' || phase === 'determine-winner' || phase === 'choose-batting' || phase === 'final') && (
            <div className="text-center space-y-4">
              {selectedSide && (
                <p className="text-lg text-muted-foreground" data-testid="selected-side">
                  You chose: <span className="font-semibold">{selectedSide === 'heads' ? '👑 Heads' : '🏏 Tails'}</span>
                </p>
              )}
              
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div 
                  className={`
                    w-40 h-40 rounded-full border-8 border-yellow-400 bg-gradient-to-br from-yellow-300 to-yellow-500
                    flex items-center justify-center text-4xl font-bold text-yellow-800 shadow-lg
                    transform transition-transform duration-500 ease-in-out
                    ${isFlipping ? 'animate-spin' : ''}
                    ${result === 'tails' ? 'rotate-y-180' : ''}
                  `}
                  style={{
                    transformStyle: 'preserve-3d',
                    animation: isFlipping ? 'flipCoin 2s ease-in-out' : 'none'
                  }}
                  data-testid="coin-display"
                >
                  {/* Front Face (Heads) */}
                  <div 
                    className={`
                      absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500
                      flex items-center justify-center text-4xl font-bold text-yellow-800
                      ${result === 'tails' ? 'opacity-0' : 'opacity-100'}
                    `}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(0deg)'
                    }}
                  >
                    👑
                  </div>
                  
                  {/* Back Face (Tails) */}
                  <div 
                    className={`
                      absolute inset-0 rounded-full bg-gradient-to-br from-gray-300 to-gray-500
                      flex items-center justify-center text-4xl font-bold text-gray-800
                      ${result === 'heads' ? 'opacity-0' : 'opacity-100'}
                    `}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    🏏
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {result && phase !== 'toss' && (
                <div className="text-center space-y-2" data-testid="toss-result">
                  <h3 className="text-2xl font-bold text-primary">
                    It's {result.charAt(0).toUpperCase() + result.slice(1)}!
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {result === 'heads' ? '👑 The crown has spoken!' : '🏏 Cricket bat side up!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Toss Winner Display */}
          {phase === 'determine-winner' && tossWinner && (
            <div className="text-center space-y-4" data-testid="toss-winner">
              <h3 className="text-2xl font-bold text-primary">
                {tossWinner === 'user' ? '🎉 Your Team Won the Toss!' : '😔 Opponent Won the Toss!'}
              </h3>
              <p className="text-lg text-muted-foreground">
                {selectedSide === result 
                  ? `You guessed correctly, but the opponent wins the toss!`
                  : `You guessed wrong, but your team wins the toss!`
                }
              </p>
            </div>
          )}

          {/* Batting Choice Phase */}
          {phase === 'choose-batting' && (
            <div className="text-center space-y-6">
              <h3 className="text-xl font-semibold">
                {tossWinner === 'user' ? 'Choose Your Preference' : 'Choose Opponent\'s Preference'}
              </h3>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => handleBattingChoice('batting')}
                  className="px-8 py-4 text-lg"
                  data-testid="button-choose-batting"
                >
                  🏏 Batting First
                </Button>
                <Button 
                  onClick={() => handleBattingChoice('bowling')}
                  className="px-8 py-4 text-lg"
                  data-testid="button-choose-bowling"
                >
                  ⚾ Bowling First
                </Button>
              </div>
            </div>
          )}

          {/* Final Result Display */}
          {phase === 'final' && (
            <div className="text-center space-y-4" data-testid="final-result">
              <h3 className="text-2xl font-bold text-primary">Toss Complete!</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-lg font-semibold">
                  Your Team: <span className="text-primary">{getUserTeamRole()}</span>
                </p>
                <p className="text-lg font-semibold">
                  Opponent Team: <span className="text-primary">{getOpponentTeamRole()}</span>
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            {phase === 'toss' && (
              <Button 
                onClick={handleToss}
                disabled={isFlipping}
                className="w-full py-3 text-lg"
                data-testid="button-toss-coin"
              >
                {isFlipping ? 'Flipping...' : 'Toss Coin'}
              </Button>
            )}

            {phase === 'determine-winner' && (
              <Button 
                onClick={handleShowBattingChoice}
                className="w-full py-3 text-lg"
                data-testid="button-proceed-to-choice"
              >
                Proceed to Choice
              </Button>
            )}

            {phase === 'final' && (
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    // TODO: Navigate to match scoring page
                    console.log('Starting match with roles:', {
                      userTeam: getUserTeamRole(),
                      opponentTeam: getOpponentTeamRole()
                    });
                  }}
                  className="w-full py-3 text-lg"
                  data-testid="button-start-match"
                >
                  Start Match
                </Button>
                <Button 
                  onClick={handleStartOver}
                  variant="outline"
                  className="w-full"
                  data-testid="button-toss-again"
                >
                  Toss Again
                </Button>
              </div>
            )}
          </div>

          {/* Back to Setup */}
          <Button 
            onClick={() => setLocation('/local-match')}
            variant="ghost"
            className="mt-4"
            data-testid="button-back-to-setup"
          >
            ← Back to Match Setup
          </Button>
        </CardContent>
      </Card>

      {/* CSS Animation */}
      <style>{`
        @keyframes flipCoin {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          25% { transform: rotateY(450deg) rotateX(180deg); }
          50% { transform: rotateY(900deg) rotateX(360deg); }
          75% { transform: rotateY(1350deg) rotateX(180deg); }
          100% { transform: rotateY(1800deg) rotateX(0deg); }
        }
      `}</style>
    </div>
  );
}