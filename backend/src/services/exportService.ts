// =============================================================================
// Scorecard Export Service — PDF + Social Share Image
// =============================================================================
//
// Uses PDFKit for PDF generation and Sharp for social share image (SVG→PNG).
// Queries full scorecard data: MatchSummary + Innings + Batting + Bowling.
//
// =============================================================================

import { prisma } from '../utils/db.js';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScorecardData {
    match: {
        id: string;
        homeTeamName: string;
        awayTeamName: string;
        venue: string | null;
        matchDate: Date;
        overs: number;
        format: string;
        status: string;
        result: string | null;
        winningTeamName: string | null;
        winMargin: string | null;
        tossWinner: string | null;
        tossDecision: string | null;
    };
    innings: Array<{
        inningsNumber: number;
        battingTeamName: string;
        bowlingTeamName: string;
        totalRuns: number;
        totalWickets: number;
        overs: number;
        extras: number;
        batting: Array<{
            name: string;
            runs: number;
            balls: number;
            fours: number;
            sixes: number;
            strikeRate: number;
            isOut: boolean;
            dismissalType: string | null;
        }>;
        bowling: Array<{
            name: string;
            overs: number;
            maidens: number;
            runs: number;
            wickets: number;
            economy: number;
            dotBalls: number;
        }>;
    }>;
}

// ---------------------------------------------------------------------------
// Fetch full scorecard data
// ---------------------------------------------------------------------------

export async function getScorecardData(matchId: string): Promise<ScorecardData | null> {
    const match: any = await prisma.matchSummary.findUnique({
        where: { id: matchId },
        include: {
            innings: {
                orderBy: { inningsNumber: 'asc' },
                include: {
                    battingPerformances: {
                        orderBy: { battingPosition: 'asc' } as any,
                        include: {
                            user: { select: { fullName: true } },
                        } as any,
                    },
                    bowlingPerformances: {
                        orderBy: { bowlingPosition: 'asc' } as any,
                        include: {
                            user: { select: { fullName: true } },
                        } as any,
                    },
                },
            },
        },
    });

    if (!match) return null;

    return {
        match: {
            id: match.id,
            homeTeamName: match.homeTeamName,
            awayTeamName: match.awayTeamName,
            venue: match.venue,
            matchDate: match.matchDate,
            overs: match.overs,
            format: match.matchType || match.format || 'N/A',
            status: match.status,
            result: match.result,
            winningTeamName: match.winningTeamName,
            winMargin: match.winMargin,
            tossWinner: match.tossWinner || null,
            tossDecision: match.tossDecision || null,
        },
        innings: match.innings.map((inn: any) => ({
            inningsNumber: inn.inningsNumber,
            battingTeamName: inn.battingTeamName,
            bowlingTeamName: inn.bowlingTeamName,
            totalRuns: inn.totalRuns,
            totalWickets: inn.totalWickets,
            overs: inn.overs,
            extras: inn.extras || 0,
            batting: inn.battingPerformances.map((bp: any) => ({
                name: bp.user?.fullName || bp.playerName || 'Unknown',
                runs: bp.runs,
                balls: bp.balls,
                fours: bp.fours,
                sixes: bp.sixes,
                strikeRate: bp.strikeRate,
                isOut: bp.isOut,
                dismissalType: bp.dismissalType,
            })),
            bowling: inn.bowlingPerformances.map((bp: any) => ({
                name: bp.user?.fullName || bp.playerName || 'Unknown',
                overs: bp.overs,
                maidens: bp.maidens,
                runs: bp.runs,
                wickets: bp.wickets,
                economy: bp.economy,
                dotBalls: bp.dotBalls || 0,
            })),
        })),
    };
}

// ---------------------------------------------------------------------------
// Generate PDF scorecard (PDFKit-free: returns structured HTML for client)
// Using a lightweight text-based PDF via content stream
// ---------------------------------------------------------------------------

export async function generateScorecardPDF(matchId: string): Promise<Buffer | null> {
    const data = await getScorecardData(matchId);
    if (!data) return null;

    // Build PDF content using raw PDF operators (no external dep needed)
    // This generates a minimal valid PDF with text content
    const lines: string[] = [];
    const { match, innings } = data;

    // Title
    lines.push(`${match.homeTeamName} vs ${match.awayTeamName}`);
    lines.push(`${formatDate(match.matchDate)} | ${match.venue || 'N/A'} | ${match.overs} overs`);
    if (match.tossWinner) lines.push(`Toss: ${match.tossWinner} chose to ${match.tossDecision}`);
    lines.push('');

    // Result
    if (match.result && match.winningTeamName) {
        lines.push(`RESULT: ${match.winningTeamName} won by ${match.winMargin}`);
    } else {
        lines.push(`STATUS: ${match.status}`);
    }
    lines.push('');

    // Each innings
    for (const inn of innings) {
        lines.push(`--- ${inn.battingTeamName} INNINGS ---`);
        lines.push(`Total: ${inn.totalRuns}/${inn.totalWickets} (${inn.overs} ov) | Extras: ${inn.extras}`);
        lines.push('');

        // Batting table
        lines.push('BATTING');
        lines.push(padRow(['Batter', 'R', 'B', '4s', '6s', 'SR'], [24, 5, 5, 4, 4, 7]));
        lines.push('-'.repeat(53));
        for (const b of inn.batting) {
            const dismissal = b.isOut ? (b.dismissalType || 'out') : 'not out';
            lines.push(padRow(
                [truncStr(b.name, 20) + (b.isOut ? '' : '*'), String(b.runs), String(b.balls), String(b.fours), String(b.sixes), b.strikeRate.toFixed(1)],
                [24, 5, 5, 4, 4, 7],
            ));
        }
        lines.push('');

        // Bowling table
        lines.push('BOWLING');
        lines.push(padRow(['Bowler', 'O', 'M', 'R', 'W', 'Econ'], [24, 5, 4, 5, 4, 7]));
        lines.push('-'.repeat(53));
        for (const b of inn.bowling) {
            lines.push(padRow(
                [truncStr(b.name, 22), b.overs.toFixed(1), String(b.maidens), String(b.runs), String(b.wickets), b.economy.toFixed(1)],
                [24, 5, 4, 5, 4, 7],
            ));
        }
        lines.push('');
    }

    lines.push('Generated by CricScore');

    // Build PDF using text stream (minimal valid PDF, no dependencies)
    const pdfBuffer = buildTextPDF(lines);
    return pdfBuffer;
}

// ---------------------------------------------------------------------------
// Generate Social Share Image (1200x630 OG image via Sharp + SVG)
// ---------------------------------------------------------------------------

export async function generateShareImage(matchId: string): Promise<Buffer | null> {
    const data = await getScorecardData(matchId);
    if (!data) return null;

    const { match, innings } = data;
    const W = 1200;
    const H = 630;

    // Build score summary
    const inn1 = innings[0];
    const inn2 = innings[1];
    const score1 = inn1 ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.overs} ov)` : '-';
    const score2 = inn2 ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.overs} ov)` : '-';
    const resultText = match.winningTeamName
        ? `${match.winningTeamName} won by ${match.winMargin}`
        : match.status;

    // Top performers
    const topBat1 = inn1?.batting.sort((a, b) => b.runs - a.runs)[0];
    const topBat2 = inn2?.batting.sort((a, b) => b.runs - a.runs)[0];
    const topBowl1 = inn1?.bowling.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
    const topBowl2 = inn2?.bowling.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];

    const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0a0e1a"/>
                <stop offset="100%" style="stop-color:#141822"/>
            </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="${W}" height="${H}" fill="url(#bg)"/>

        <!-- Top accent bar -->
        <rect width="${W}" height="4" fill="#D7A65B"/>

        <!-- CricScore branding -->
        <text x="40" y="50" font-family="Arial,sans-serif" font-size="14" fill="#666" font-weight="700" letter-spacing="2">CRICSCORE</text>

        <!-- Match info -->
        <text x="40" y="90" font-family="Arial,sans-serif" font-size="13" fill="#888">
            ${escSvg(formatDate(match.matchDate))} · ${escSvg(match.venue || 'N/A')} · ${match.overs} overs
        </text>

        <!-- Team 1 -->
        <text x="40" y="160" font-family="Arial,sans-serif" font-size="32" fill="#EBECEF" font-weight="700">
            ${escSvg(match.homeTeamName)}
        </text>
        <text x="40" y="200" font-family="Arial,sans-serif" font-size="40" fill="#D7A65B" font-weight="800">
            ${escSvg(score1)}
        </text>

        <!-- VS divider -->
        <line x1="40" y1="230" x2="1160" y2="230" stroke="#2A2D35" stroke-width="1"/>
        <text x="580" y="260" font-family="Arial,sans-serif" font-size="14" fill="#555" text-anchor="middle" font-weight="700">VS</text>

        <!-- Team 2 -->
        <text x="40" y="310" font-family="Arial,sans-serif" font-size="32" fill="#EBECEF" font-weight="700">
            ${escSvg(match.awayTeamName)}
        </text>
        <text x="40" y="350" font-family="Arial,sans-serif" font-size="40" fill="#D7A65B" font-weight="800">
            ${escSvg(score2)}
        </text>

        <!-- Result -->
        <rect x="40" y="385" width="1120" height="44" rx="10" fill="rgba(215,166,91,0.1)"/>
        <text x="600" y="414" font-family="Arial,sans-serif" font-size="18" fill="#D7A65B" text-anchor="middle" font-weight="700">
            ${escSvg(resultText)}
        </text>

        <!-- Top Performers -->
        <text x="40" y="475" font-family="Arial,sans-serif" font-size="12" fill="#555" font-weight="700" letter-spacing="1.5">TOP PERFORMERS</text>

        ${topBat1 ? `<text x="40" y="510" font-family="Arial,sans-serif" font-size="16" fill="#EBECEF">🏏 ${escSvg(topBat1.name)} — ${topBat1.runs}(${topBat1.balls})</text>` : ''}
        ${topBat2 ? `<text x="40" y="540" font-family="Arial,sans-serif" font-size="16" fill="#EBECEF">🏏 ${escSvg(topBat2.name)} — ${topBat2.runs}(${topBat2.balls})</text>` : ''}
        ${topBowl1 ? `<text x="600" y="510" font-family="Arial,sans-serif" font-size="16" fill="#EBECEF">🎯 ${escSvg(topBowl1.name)} — ${topBowl1.wickets}/${topBowl1.runs}</text>` : ''}
        ${topBowl2 ? `<text x="600" y="540" font-family="Arial,sans-serif" font-size="16" fill="#EBECEF">🎯 ${escSvg(topBowl2.name)} — ${topBowl2.wickets}/${topBowl2.runs}</text>` : ''}

        <!-- Bottom bar -->
        <rect y="${H - 40}" width="${W}" height="40" fill="rgba(0,0,0,0.3)"/>
        <text x="600" y="${H - 14}" font-family="Arial,sans-serif" font-size="12" fill="#555" text-anchor="middle">
            cricscore.app
        </text>
    </svg>`;

    const pngBuffer = await sharp(Buffer.from(svg))
        .png({ quality: 90 })
        .toBuffer();

    return pngBuffer;
}

// ---------------------------------------------------------------------------
// Minimal PDF builder (no external dependencies)
// ---------------------------------------------------------------------------

function buildTextPDF(lines: string[]): Buffer {
    const fontSize = 10;
    const margin = 50;
    const lineHeight = 14;
    const pageWidth = 595;  // A4
    const pageHeight = 842;
    const usableHeight = pageHeight - margin * 2;
    const linesPerPage = Math.floor(usableHeight / lineHeight);

    // Split lines into pages
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += linesPerPage) {
        pages.push(lines.slice(i, i + linesPerPage));
    }

    // PDF objects
    const objects: string[] = [];
    let objCount = 0;

    function addObj(content: string): number {
        objCount++;
        objects.push(`${objCount} 0 obj\n${content}\nendobj\n`);
        return objCount;
    }

    // 1. Catalog
    const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');

    // 2. Pages (placeholder, updated later)
    const pagesId = addObj(''); // placeholder

    // 3. Font
    const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

    const pageObjIds: number[] = [];
    const streamObjIds: number[] = [];

    for (const pageLines of pages) {
        // Build content stream
        let stream = `BT\n/F1 ${fontSize} Tf\n`;
        let y = pageHeight - margin;
        for (const line of pageLines) {
            const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            stream += `${margin} ${y} Td\n(${escaped}) Tj\n`;
            y -= lineHeight;
            // Reset position for next line
            stream += `${-margin} ${-y - lineHeight + y + lineHeight} Td\n`;
            // Simpler: use absolute positioning each line
        }
        stream += 'ET';

        // Rebuild stream with simpler absolute positioning
        stream = `BT\n/F1 ${fontSize} Tf\n`;
        y = pageHeight - margin;
        for (const line of pageLines) {
            const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            stream += `1 0 0 1 ${margin} ${y} Tm\n(${escaped}) Tj\n`;
            y -= lineHeight;
        }
        stream += 'ET';

        const streamId = addObj(
            `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        );
        streamObjIds.push(streamId);

        const pageId = addObj(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
        );
        pageObjIds.push(pageId);
    }

    // Update pages object
    const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
    objects[pagesId - 1] = `${pagesId} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>\nendobj\n`;

    // Build final PDF
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const obj of objects) {
        offsets.push(pdf.length);
        pdf += obj;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objCount + 1} /Root ${catalogId} 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function padRow(cols: string[], widths: number[]): string {
    return cols.map((col, i) => col.padEnd(widths[i] || 0)).join('');
}

function truncStr(s: string, max: number): string {
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function escSvg(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
