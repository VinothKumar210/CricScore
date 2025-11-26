import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface BattingStats {
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
  dismissalType: string;
  bowlerName: string;
  fielderName: string;
}

interface BowlingStats {
  playerName: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

interface MatchSummary {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  venue: string;
  overs: number;
  homeTeamRuns: number;
  homeTeamWickets: number;
  homeTeamOvers: number;
  awayTeamRuns: number;
  awayTeamWickets: number;
  awayTeamOvers: number;
  winningTeam: string;
  manOfTheMatchUser?: {
    id: string;
    profileName: string;
    username: string;
  };
  manOfTheMatchStats: any;
  firstInningsBatsmen: BattingStats[];
  firstInningsBowlers: BowlingStats[];
  secondInningsBatsmen: BattingStats[];
  secondInningsBowlers: BowlingStats[];
}

export default function MatchSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const { data: matchSummary, isLoading, error } = useQuery<MatchSummary>({
    queryKey: ['/api/match-summary', id],
    enabled: !!id,
  });

  const handlePDFDownload = async () => {
    if (!matchSummary) return;
    
    setIsGeneratingPDF(true);
    try {
      // Get the main content element to capture
      const element = document.getElementById('match-summary-content');
      if (!element) {
        toast({
          title: "Error",
          description: "Could not find match summary content to export.",
          variant: "destructive",
        });
        return;
      }

      // Apply PDF-friendly styling temporarily
      const originalStyle = element.style.cssText;
      element.style.cssText = `
        ${originalStyle}
        background-color: white !important;
        color: black !important;
        font-family: 'Arial', 'Helvetica', sans-serif !important;
        line-height: 1.4 !important;
      `;

      // Configure html2canvas options for stability and quality
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: false, // More stable
        backgroundColor: '#ffffff',
        logging: false,
        // Remove explicit width/height overrides for better stability
        removeContainer: true,
        foreignObjectRendering: false
      });

      // Restore original styling
      element.style.cssText = originalStyle;

      // Initialize PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Calculate scaling to fit width properly while maintaining readability
      const widthRatio = pdfWidth / canvasWidth;
      const scaledHeight = canvasHeight * widthRatio;

      // Determine if we need multiple pages
      const totalPages = Math.ceil(scaledHeight / pdfHeight);

      // Toast notification for multi-page generation
      if (totalPages > 1) {
        toast({
          title: "Generating PDF",
          description: `Creating ${totalPages} pages for complete match summary...`,
        });
      }

      // Generate pages by slicing the canvas
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        // Calculate the portion of canvas for this page
        const sourceY = (pageNum * pdfHeight) / widthRatio;
        const sourceHeight = Math.min(pdfHeight / widthRatio, canvasHeight - sourceY);
        
        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        
        if (!pageCtx) continue;
        
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sourceHeight;
        
        // Draw the slice onto the page canvas
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, canvasWidth, sourceHeight);
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvasWidth, sourceHeight,
          0, 0, canvasWidth, sourceHeight
        );
        
        // Convert page canvas to image data
        const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
        
        // Add new page if not the first page
        if (pageNum > 0) {
          pdf.addPage();
        }
        
        // Add the page image to PDF with proper scaling
        const pageScaledHeight = sourceHeight * widthRatio;
        pdf.addImage(
          pageImgData,
          'PNG',
          0,
          0,
          pdfWidth,
          pageScaledHeight
        );
      }

      // Generate filename with team names and date
      const homeTeam = matchSummary.homeTeamName.replace(/[^a-zA-Z0-9]/g, '_');
      const awayTeam = matchSummary.awayTeamName.replace(/[^a-zA-Z0-9]/g, '_');
      const matchDate = new Date(matchSummary.matchDate).toISOString().split('T')[0];
      const filename = `Cricket_Match_${homeTeam}_vs_${awayTeam}_${matchDate}.pdf`;

      // Download the PDF
      pdf.save(filename);
      
      // Success notification
      toast({
        title: "PDF Generated",
        description: `Match summary exported successfully as ${filename}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Show user-friendly error message
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate PDF. You can use your browser's print function as an alternative.",
        variant: "destructive",
      });
      
      // Don't automatically trigger print - let user decide
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatOvers = (overs: number): string => {
    if (overs === 0) return '0.0';
    
    // Handle cricket format where overs are stored as decimal (e.g., 14.5 = 14 overs 3 balls)
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 6);
    const clampedBalls = Math.min(Math.max(balls, 0), 5);
    
    return clampedBalls === 0 ? `${wholeOvers}.0` : `${wholeOvers}.${clampedBalls}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Loading match summary...</div>
      </div>
    );
  }

  if (error || !matchSummary) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          Failed to load match summary. Please try again.
        </div>
      </div>
    );
  }

  const BattingTable = ({ stats, inningsTitle }: { stats: BattingStats[], inningsTitle: string }) => {
    if (!stats || stats.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              🏏 {inningsTitle} - Batting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              No batting data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            🏏 {inningsTitle} - Batting
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile-friendly card layout for smaller screens */}
          <div className="block md:hidden space-y-4">
            {stats.map((stat, index) => (
              <div key={index} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800" data-testid={`batting-card-${inningsTitle}-${index}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium" data-testid={`text-batsman-${stat.playerName}`}>
                    {stat.playerName || 'Unknown Player'}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" data-testid={`text-runs-${stat.runs}`}>
                      {stat.runs || 0} ({stat.balls || 0})
                    </div>
                    <div className="text-sm text-muted-foreground">
                      SR: {stat.strikeRate || '0.00'}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">4s:</span> {stat.fours || 0} | 
                    <span className="font-medium">6s:</span> {stat.sixes || 0}
                  </div>
                  <div className="text-right">
                    {stat.dismissalType || 'Not Out'}
                    {stat.dismissalType && stat.dismissalType !== 'Not Out' && (
                      <div className="text-xs text-muted-foreground">
                        {stat.bowlerName && `b: ${stat.bowlerName}`}
                        {stat.fielderName && ` c: ${stat.fielderName}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batsman</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Balls</TableHead>
                  <TableHead className="text-right">4s</TableHead>
                  <TableHead className="text-right">6s</TableHead>
                  <TableHead className="text-right">SR</TableHead>
                  <TableHead>Dismissal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={index} data-testid={`batting-row-${inningsTitle}-${index}`}>
                    <TableCell className="font-medium" data-testid={`text-batsman-${stat.playerName}`}>
                      {stat.playerName || 'Unknown Player'}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-runs-${stat.runs}`}>
                      {stat.runs || 0}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-balls-${stat.balls}`}>
                      {stat.balls || 0}
                    </TableCell>
                    <TableCell className="text-right">{stat.fours || 0}</TableCell>
                    <TableCell className="text-right">{stat.sixes || 0}</TableCell>
                    <TableCell className="text-right">{stat.strikeRate || '0.00'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{stat.dismissalType || 'Not Out'}</div>
                        {stat.dismissalType && stat.dismissalType !== 'Not Out' && (
                          <div className="text-muted-foreground text-xs">
                            {stat.bowlerName && `b: ${stat.bowlerName}`}
                            {stat.fielderName && ` c: ${stat.fielderName}`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const BowlingTable = ({ stats, inningsTitle }: { stats: BowlingStats[], inningsTitle: string }) => {
    if (!stats || stats.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              ⚾ {inningsTitle} - Bowling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-4">
              No bowling data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            ⚾ {inningsTitle} - Bowling
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile-friendly card layout for smaller screens */}
          <div className="block md:hidden space-y-4">
            {stats.map((stat, index) => (
              <div key={index} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800" data-testid={`bowling-card-${inningsTitle}-${index}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium" data-testid={`text-bowler-${stat.playerName}`}>
                    {stat.playerName || 'Unknown Player'}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" data-testid={`text-wickets-${stat.wickets}`}>
                      {stat.wickets || 0}/{stat.runs || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatOvers(stat.overs || 0)} overs
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="font-medium">Maidens:</span> {stat.maidens || 0}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">Economy:</span> {stat.economy || '0.00'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bowler</TableHead>
                  <TableHead className="text-right">Overs</TableHead>
                  <TableHead className="text-right">Maidens</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Wickets</TableHead>
                  <TableHead className="text-right">Economy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat, index) => (
                  <TableRow key={index} data-testid={`bowling-row-${inningsTitle}-${index}`}>
                    <TableCell className="font-medium" data-testid={`text-bowler-${stat.playerName}`}>
                      {stat.playerName || 'Unknown Player'}
                    </TableCell>
                    <TableCell className="text-right">{formatOvers(stat.overs || 0)}</TableCell>
                    <TableCell className="text-right">{stat.maidens || 0}</TableCell>
                    <TableCell className="text-right" data-testid={`text-runs-conceded-${stat.runs}`}>
                      {stat.runs || 0}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-wickets-${stat.wickets}`}>
                      {stat.wickets || 0}
                    </TableCell>
                    <TableCell className="text-right">{stat.economy || '0.00'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header with navigation and PDF download */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Button
          variant="outline"
          onClick={() => setLocation('/dashboard')}
          className="flex items-center gap-2"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={handlePDFDownload}
          disabled={isGeneratingPDF}
          className="flex items-center gap-2"
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4" />
          {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      {/* Match Summary Content - Wrappable for PDF generation */}
      <div id="match-summary-content">
        {/* Match Header */}
        <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold" data-testid="text-match-title">
              Cricket Match Summary
            </h1>
            <div className="text-lg text-muted-foreground">
              {formatDate(matchSummary.matchDate)} • {matchSummary.venue || 'Unknown Venue'}
            </div>
            
            {/* Teams and Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center my-8">
              {/* Home Team */}
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-home-team">
                  {matchSummary.homeTeamName}
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="text-home-score">
                  {matchSummary.homeTeamRuns}/{matchSummary.homeTeamWickets}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-home-overs">
                  ({formatOvers(matchSummary.homeTeamOvers || 0)} overs)
                </div>
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-4xl font-bold text-muted-foreground">VS</div>
              </div>

              {/* Away Team */}
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-away-team">
                  {matchSummary.awayTeamName}
                </div>
                <div className="text-3xl font-bold text-primary" data-testid="text-away-score">
                  {matchSummary.awayTeamRuns}/{matchSummary.awayTeamWickets}
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-away-overs">
                  ({formatOvers(matchSummary.awayTeamOvers || 0)} overs)
                </div>
              </div>
            </div>

            {/* Match Result */}
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="text-match-result">
                {matchSummary.winningTeam === 'Draw' 
                  ? '🤝 Match Drawn' 
                  : `🏆 ${matchSummary.winningTeam} Won`
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Innings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-first-innings-title">
          First Innings
        </h2>
        <BattingTable stats={matchSummary.firstInningsBatsmen || []} inningsTitle="First" />
        <BowlingTable stats={matchSummary.firstInningsBowlers || []} inningsTitle="First" />
      </div>

      {/* Second Innings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4" data-testid="text-second-innings-title">
          Second Innings
        </h2>
        <BattingTable stats={matchSummary.secondInningsBatsmen || []} inningsTitle="Second" />
        <BowlingTable stats={matchSummary.secondInningsBowlers || []} inningsTitle="Second" />
      </div>

      {/* Man of the Match */}
      {matchSummary.manOfTheMatchUser && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center items-center gap-2">
                <Trophy className="h-8 w-8 text-amber-500" />
                <h2 className="text-2xl font-bold">Man of the Match</h2>
              </div>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400" data-testid="text-mom-name">
                {matchSummary.manOfTheMatchUser.profileName || matchSummary.manOfTheMatchUser.username || 'Unknown Player'}
              </div>
              {matchSummary.manOfTheMatchUser.username && (
                <div className="text-sm text-muted-foreground" data-testid="text-mom-username">
                  @{matchSummary.manOfTheMatchUser.username}
                </div>
              )}
              {matchSummary.manOfTheMatchStats && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 max-w-md mx-auto">
                  <div className="text-sm font-medium mb-2">Performance Score</div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-mom-score">
                    {matchSummary.manOfTheMatchStats?.performanceScore || 0} points
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Enhanced Styles for both PDF capture and print */}
      <style>{`
        /* PDF capture styling */
        #match-summary-content {
          background-color: white;
          color: black;
          font-family: 'Arial', 'Helvetica', sans-serif;
        }
        
        #match-summary-content .card {
          border: 2px solid #d1d5db !important;
          border-radius: 8px;
          box-shadow: none;
          background-color: white;
          margin-bottom: 1.5rem;
        }
        
        #match-summary-content .card-header {
          border-bottom: 2px solid #d1d5db !important;
          background-color: #f9fafb;
          padding: 1rem;
        }
        
        #match-summary-content .card-content {
          padding: 1rem;
        }
        
        #match-summary-content table {
          border-collapse: collapse;
          width: 100%;
          border: 2px solid #d1d5db;
        }
        
        #match-summary-content th,
        #match-summary-content td {
          border: 1px solid #d1d5db !important;
          padding: 8px 12px;
          text-align: left;
        }
        
        #match-summary-content th {
          background-color: #f3f4f6 !important;
          font-weight: bold;
        }
        
        #match-summary-content .text-center {
          text-align: center;
        }
        
        #match-summary-content .text-right {
          text-align: right;
        }
        
        /* Print media styles for browser print fallback */
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 12px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .container {
            max-width: none !important;
            margin: 0 !important;
            padding: 1rem !important;
          }
          
          h1, h2 {
            page-break-after: avoid;
            margin-bottom: 1rem !important;
          }
          
          h1 {
            font-size: 24px !important;
          }
          
          h2 {
            font-size: 18px !important;
          }
          
          .card {
            break-inside: avoid;
            margin-bottom: 1.5rem !important;
            border: 2px solid #d1d5db !important;
            border-radius: 8px !important;
            box-shadow: none !important;
          }
          
          .card-header {
            padding: 1rem !important;
            border-bottom: 2px solid #d1d5db !important;
            background-color: #f9fafb !important;
          }
          
          .card-content {
            padding: 1rem !important;
          }
          
          table {
            page-break-inside: avoid;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 2px solid #d1d5db !important;
          }
          
          th, td {
            border: 1px solid #d1d5db !important;
            padding: 8px 12px !important;
            text-align: left !important;
          }
          
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .text-right {
            text-align: right !important;
          }
        }
      `}</style>
    </div>
  );
}