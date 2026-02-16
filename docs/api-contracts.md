# API Contracts

## Authentication
(See previous contracts)

## Profile
(See previous contracts)

## Team Management
(See previous contracts)

## Match Management

### `POST /api/matches`
- **Description:** Create a new match.
- **Auth:** OWNER, CAPTAIN, VICE_CAPTAIN (of either home or away team? Currently implementation trusts authed user to pick valid teams, creating logic might need refinement on specific team permissions if strict).
- **Body:**
  ```json
  {
    "matchType": "TEAM_MATCH",
    "homeTeamId": "...",
    "awayTeamId": "...",
    "overs": 20,
    "ballType": "RED_TENNIS",
    "powerplayEnabled": true,
    "venue": "Cheapauk",
    "matchDate": "2026-05-12T10:00:00Z"
  }
  ```
- **Response:** `{ success: true, data: { match: MatchSummary } }`

### `GET /api/matches/:id`
- **Description:** Get match details.
- **Auth:** Bearer Token
- **Response:** `{ success: true, data: { match: MatchSummary & { homeTeam, awayTeam } } }`

### `GET /api/matches`
- **Description:** List matches with filters.
- **Auth:** Bearer Token
- **Query Params:** `?teamId=...&status=LIVE&date=2026-05-12`
- **Response:** `{ success: true, data: { matches: MatchSummary[] } }`

### `PATCH /api/matches/:id/status`
- **Description:** Update match status (Lifecycle).
- **Auth:** OWNER, CAPTAIN (of participating teams)
- **Body:** `{ "status": "LIVE" }`
- **Response:** `{ success: true, data: { match: MatchSummary } }`
