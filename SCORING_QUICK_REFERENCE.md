# Cricket Scoreboard - Quick Reference Guide

## How Scoring Works (Like Real Cricket)

### Basic Run Scoring
```
┌─────────────────────────────────────────────────┐
│  Button  │  Action          │  Strike Rotates? │
├──────────┼──────────────────┼──────────────────┤
│    0     │  Dot ball        │       No         │
│    1     │  Single run      │       Yes        │
│    2     │  Two runs        │       No         │
│    3     │  Three runs      │       Yes        │
│    4     │  Boundary (Four) │       No         │
│    6     │  Six             │       No         │
└─────────────────────────────────────────────────┘
```

### Over Progression Example
```
Over 1.1 ──► Ball 1 scored ──► Over 1.2
Over 1.2 ──► Ball 2 scored ──► Over 1.3
Over 1.3 ──► Ball 3 scored ──► Over 1.4
Over 1.4 ──► Ball 4 scored ──► Over 1.5
Over 1.5 ──► Ball 5 scored ──► Over 1.6
Over 1.6 ──► Ball 6 scored ──► Over 2.1 (New over, select new bowler)
```

### Strike Rotation Rules
```
ODD RUNS (1, 3, 5):
  Striker ⟷ Non-Striker swap positions

EVEN RUNS (0, 2, 4, 6):
  Striker ━ Non-Striker stay in same position

END OF OVER:
  Striker ⟷ Non-Striker ALWAYS swap
```

### Extras Explained
```
WIDE:
  - Team gets +1 run (can get more if batsmen run)
  - Does NOT count as a ball
  - Bowler's economy affected
  - Must re-bowl the ball

NO BALL:
  - Team gets +1 run (batsman can also score)
  - Does NOT count as a ball  
  - Must re-bowl the ball
  - Free hit in some formats

LEG BYE:
  - Runs scored without bat touching ball
  - Ball hits batsman's body
  - COUNTS as a legal ball
  - Runs added to team total, not batsman score

BYE:
  - Runs scored without bat or body
  - Ball goes past everyone
  - COUNTS as a legal ball
  - Runs added to team total, not batsman score
```

### Wicket Types
```
1. BOWLED: Ball hits stumps directly
2. CAUGHT: Fielder catches ball before it bounces
3. LBW: Ball would've hit stumps but hit leg
4. RUN OUT: Batsman out of crease while running
5. STUMPED: Batsman out of crease, keeper breaks stumps
6. HIT WICKET: Batsman knocks own stumps
```

### Real Cricket Example Scenario

**Match Situation**: Over 5, Score: 24/1
```
Ball 1: ┌────────────────────────────────┐
        │ Batsman hits 4 runs            │
        │ Score: 28/1, Over: 5.1         │
        │ Strike: Same batsman           │
        └────────────────────────────────┘

Ball 2: ┌────────────────────────────────┐
        │ Wide + 1 run                   │
        │ Score: 30/1, Over: 5.1 (same)  │
        │ Ball doesn't count, rebowl     │
        └────────────────────────────────┘

Ball 2: ┌────────────────────────────────┐
        │ Single run                     │
        │ Score: 31/1, Over: 5.2         │
        │ Strike: Rotates to other end   │
        └────────────────────────────────┘

Ball 3: ┌────────────────────────────────┐
        │ Wicket! (Caught)               │
        │ Score: 31/2, Over: 5.3         │
        │ New batsman comes in           │
        └────────────────────────────────┘

Ball 4: ┌────────────────────────────────┐
        │ Dot ball (0 runs)              │
        │ Score: 31/2, Over: 5.4         │
        │ Strike: Same batsman           │
        └────────────────────────────────┘

Ball 5: ┌────────────────────────────────┐
        │ 2 runs                         │
        │ Score: 33/2, Over: 5.5         │
        │ Strike: Same batsman           │
        └────────────────────────────────┘

Ball 6: ┌────────────────────────────────┐
        │ Six!                           │
        │ Score: 39/2, Over: 6.0         │
        │ Strike: Rotates (end of over)  │
        │ NEW BOWLER REQUIRED            │
        └────────────────────────────────┘
```

### Statistics Tracked

**For Each Batsman:**
- Runs scored
- Balls faced
- Number of 4s hit
- Number of 6s hit
- Strike rate = (Runs ÷ Balls) × 100
- How they got out

**For Each Bowler:**
- Overs bowled
- Runs given away
- Wickets taken
- Economy rate = Runs ÷ Overs

**For Each Team:**
- Total runs
- Wickets lost
- Overs played
- Current run rate
- Required run rate (2nd innings)

### Match Flow
```
START MATCH
    ↓
Toss (Who bats first?)
    ↓
Select Opening Batsmen (2)
    ↓
Select Opening Bowler (1)
    ↓
┌─────────────────────┐
│   FIRST INNINGS     │
│  Score runs until:  │
│  - 10 wickets fall  │
│  - All overs done   │
└─────────────────────┘
    ↓
Calculate Target = Score + 1
    ↓
┌─────────────────────┐
│   SECOND INNINGS    │
│   Chase target or   │
│   defend total      │
└─────────────────────┘
    ↓
MATCH RESULT
- Team 1 Wins (defended total)
- Team 2 Wins (chased target)
- Draw (scores tied)
```

### Real-Time Features

**Auto-Updates:**
- Live scoreboard refreshes every 5-10 seconds
- Spectators see real-time score updates
- No manual refresh needed

**Notifications:**
- Match start alerts
- Score update notifications
- Wicket fall alerts

**Undo Feature:**
- Made a mistake? Hit undo!
- Reverts last ball scored
- Restores previous state completely

---

**Need Help?** All the scoring works exactly like real cricket. Just score ball by ball, and the system handles everything automatically!
