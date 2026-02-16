# API Contracts

## Authentication
(See previous contracts)

## Match Finalization

### `POST /api/matches/:id/finalize`
- **Description:** Finalize a completed match. Triggers idempotent state processing.
- **Auth:** OWNER, CAPTAIN
- **Response:**
  - `200 OK`: `{ success: true, data: { message: 'Match finalized successfully' } }`
  - `404 Not Found`: Match not found.
  - `500 Internal Error`: Finalization failure (Transaction rolled back).
