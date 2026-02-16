# API Contracts

## Authentication
(See previous contracts)

## Stats Engine

### `GET /api/stats/player/:id`
- **Description:** Get aggregated career stats for a player.
- **Auth:** Bearer Token
- **Response:**
  - `200 OK`: `{ success: true, data: { matches: 10, totalRuns: 450, battingAverage: 45.0 } }`

### `GET /api/stats/player/:id/form`
- **Description:** Get recent match form (last 10).
- **Auth:** Bearer Token
- **Response:**
  - `200 OK`: `{ success: true, data: [ { date: '2023-01-01', runs: 50, result: 'WIN' } ] }`

### `GET /api/stats/team/:id`
- **Description:** Get team aggregate stats.
- **Auth:** Bearer Token
- **Response:**
  - `200 OK`: `{ success: true, data: { matches: 5, wins: 3, winPercentage: 60 } }`

### `GET /api/stats/leaderboard`
- **Description:** Get global leaderboard.
- **Query:** `?category=runs|wickets&limit=10`
- **Auth:** Bearer Token
- **Response:**
  - `200 OK`: `{ success: true, data: [ { userId: '...', name: 'John', _sum: { runs: 500 } } ] }`
