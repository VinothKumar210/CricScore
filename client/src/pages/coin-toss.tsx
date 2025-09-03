import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';

export function CoinToss() {
  const [, setLocation] = useLocation();
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleToss = () => {
    setIsFlipping(true);
    setShowResult(false);
    setResult(null);

    // Simulate coin flip after animation
    setTimeout(() => {
      const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(coinResult);
      setIsFlipping(false);
      setShowResult(true);
    }, 2000);
  };

  const handleContinue = () => {
    // TODO: Navigate to match setup or scoring page
    console.log('Continue with toss result:', result);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Coin Toss</CardTitle>
          <p className="text-muted-foreground">
            Let's decide who bats first!
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8">
          {/* Coin Display */}
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
          {showResult && result && (
            <div className="text-center space-y-2" data-testid="toss-result">
              <h3 className="text-2xl font-bold text-primary">
                It's {result.charAt(0).toUpperCase() + result.slice(1)}!
              </h3>
              <p className="text-lg text-muted-foreground">
                {result === 'heads' ? '👑 The crown has spoken!' : '🏏 Cricket bat side up!'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            {!showResult ? (
              <Button 
                onClick={handleToss}
                disabled={isFlipping}
                className="w-full py-3 text-lg"
                data-testid="button-toss-coin"
              >
                {isFlipping ? 'Flipping...' : 'Toss Coin'}
              </Button>
            ) : (
              <div className="space-y-3">
                <Button 
                  onClick={handleContinue}
                  className="w-full py-3 text-lg"
                  data-testid="button-continue-match"
                >
                  Continue Match
                </Button>
                <Button 
                  onClick={() => {
                    setShowResult(false);
                    setResult(null);
                  }}
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