# API Contracts

## Auth & Profile (Phase 1)

### `GET /api/auth/me`
- **Description:** Get current authenticated user details.
- **Auth:** Bearer Token (Clerk)
- **Response:** `{ success: true, data: { user: User } }`

### `POST /api/webhooks/clerk`
- **Description:** Handle Clerk webhooks (user.created, user.updated)
- **Payload:** Clerk User JSON
- **Response:** 200 OK

### `PUT /api/profile`
- **Description:** Update user profile details (wizard completion)
- **Auth:** Bearer Token (Clerk)
- **Body:**
  ```json
  {
    "username": "vinoth_42",
    "role": "BATSMAN", // Enum: BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER_BATSMAN
    "battingStyle": "RIGHT_HANDED",
    "city": "Chennai",
    "onboardingComplete": true
  }
  ```
- **Response:** `User` object
