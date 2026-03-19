import { prisma } from '../lib/prisma';

export const aiNarrativeService = {
    async generateMatchRecap(matchId: string): Promise<string> {
        try {
            const match = await prisma.matchSummary.findUnique({
                where: { id: matchId },
                include: {
                    innings: {
                        include: {
                            battingPerformances: true,
                            bowlingPerformances: true
                        }
                    }
                }
            });

            if (!match) return "Match Data unavailable.";
            if (match.status !== 'COMPLETED') return "Match is not yet completed.";

            const homeTeam = match.homeTeamName;
            const awayTeam = match.awayTeamName;
            
            // Dummy logic: in a real application this would hit an LLM API like OpenAI or Gemini.
            // For now, we will construct a robust heuristic-based string narrative.
            
            let narrative = `The match between ${homeTeam} and ${awayTeam} concluded with an exciting finish. `;
            
            if (match.result === 'WIN') {
                 narrative += `${match.winningTeamName} took the victory. `;
                 
                 // Get some top performers
                 let allBatsmen: any[] = [];
                 let allBowlers: any[] = [];
                 
                 match.innings.forEach(inn => {
                     allBatsmen = [...allBatsmen, ...inn.battingPerformances];
                     allBowlers = [...allBowlers, ...inn.bowlingPerformances];
                 });
                 
                 allBatsmen.sort((a, b) => b.runs - a.runs);
                 allBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
                 
                 const topBatter = allBatsmen[0];
                 const topBowler = allBowlers[0];
                 
                 if (topBatter) {
                     narrative += `The batting highlights included a stellar ${topBatter.runs} off ${topBatter.balls} balls by ${topBatter.playerName}. `;
                 }
                 if (topBowler && topBowler.wickets >= 3) {
                     narrative += `With the ball, ${topBowler.playerName} was exceptional, taking ${topBowler.wickets} wickets for just ${topBowler.runs} runs. `;
                 }
                 
                 if (match.winMargin) {
                     narrative += `Ultimately, the margin of victory was ${match.winMargin}. `;
                 }

                 if (match.isSuperOver) {
                     narrative += `The match was so closely contested that it went to a dramatic Super Over to decide the outcome! `;
                 }
            } else if (match.result === 'TIE') {
                 narrative += `In an incredible sequence of events, both teams finished on the exact same score, resulting in a thrilling tie. `;
            } else if (match.result === 'NO_RESULT') {
                 narrative += `Unfortunately, external factors prevented a definitive result in this contest. `;
            }

            return narrative;
        } catch (error) {
            console.error('Failed to generate match recap:', error);
            return "An error occurred while analyzing the match details.";
        }
    }
};
