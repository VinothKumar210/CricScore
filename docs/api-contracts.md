# API Contracts

## Authentication
(See previous contracts)

## Profile
(See previous contracts)

## Team Management
(See previous contracts)

## Match Management
(See previous contracts)

## Scoring Engine

### `POST /api/matches/:id/operations`
- **Description:** Submit a scoring operation. atomic and versioned.
- **Auth:** OWNER, CAPTAIN, VICE_CAPTAIN
- **Body:**
  ```json
  {
    "clientOpId": "uuid-v4",
    "expectedVersion": 5,
    "type": "DELIVER_BALL",
    "payload": {
       "runs": 4,
       "strikerId": "...",
       "bowlerId": "..."
    }
  }
  ```
- **Response:**
  - `200 OK`: `{ success: true, data: { status: 'SUCCESS', version: 6, op: MatchOp } }`
  - `409 Conflict`: `{ success: false, error: 'Version Mismatch', code: 'VERSION_CONFLICT', data: { currentVersion: 7 } }`

### `GET /api/matches/:id/state`
- **Description:** Get reconstructed match state.
- **Auth:** Bearer Token
- **Response:** `{ success: true, data: { state: MatchState } }`

### `GET /api/matches/:id/operations`
- **Description:** Get operations list for syncing.
- **Query:** `?since=5`
- **Response:** `{ success: true, data: { operations: MatchOp[] } }`
