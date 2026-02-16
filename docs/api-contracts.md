# API Contracts

## Authentication

### `GET /api/auth/me`
- **Description:** Get current authenticated user details.
- **Auth:** Bearer Token (Firebase ID Token)
- **Response:**
  ```json
  { "success": true, "data": { "user": User } }
  ```
- **Errors:** `401 NO_TOKEN`, `401 TOKEN_EXPIRED`, `401 INVALID_TOKEN`

---

## Profile

### `PATCH /api/profile`
- **Description:** Update the authenticated user's profile fields.
- **Auth:** Bearer Token (Firebase ID Token)
- **Body (all fields optional):**
  ```json
  {
    "fullName": "Vinoth Kumar",
    "username": "vinoth_42",
    "description": "Opening batsman",
    "dateOfBirth": "1998-05-15",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "country": "India",
    "jerseyNumber": 7,
    "role": "BATSMAN",
    "battingHand": "RIGHT_HANDED",
    "battingPosition": "OPENER",
    "bowlingStyle": "RIGHT_ARM_MEDIUM",
    "bowlingSubType": "RIGHT_ARM_MEDIUM",
    "onboardingComplete": true,
    "profilePictureUrl": "https://..."
  }
  ```
- **Enum Values:**
  - `role`: `BATSMAN`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER_BATSMAN`
  - `battingHand`: `RIGHT_HANDED`, `LEFT_HANDED`
  - `battingPosition`: `OPENER`, `TOP_ORDER`, `MIDDLE_ORDER`, `LOWER_ORDER`, `FINISHER`
  - `bowlingStyle`: `RIGHT_ARM_FAST`, `RIGHT_ARM_MEDIUM`, `LEFT_ARM_FAST`, `LEFT_ARM_MEDIUM`, `RIGHT_ARM_SPIN`, `LEFT_ARM_SPIN`
  - `bowlingSubType`: `RIGHT_ARM_FAST`, `RIGHT_ARM_MEDIUM`, `LEFT_ARM_FAST`, `LEFT_ARM_MEDIUM`, `RIGHT_ARM_OFF_SPIN`, `RIGHT_ARM_LEG_SPIN`, `LEFT_ARM_ORTHODOX`, `LEFT_ARM_CHINAMAN`, `SLOW_LEFT_ARM`
- **Response:**
  ```json
  { "success": true, "data": { "user": User } }
  ```
- **Errors:** `400 INVALID_ENUM`, `400 INVALID_TYPE`, `400 NO_FIELDS`, `409 USERNAME_TAKEN`

### `GET /api/profile/username-available?username=xyz`
- **Description:** Check if a username is available (case-insensitive).
- **Auth:** Bearer Token (Firebase ID Token)
- **Query Params:** `username` (required, min 3 chars)
- **Response:**
  ```json
  { "success": true, "data": { "username": "xyz", "available": true } }
  ```
- **Errors:** `400 MISSING_PARAM`
