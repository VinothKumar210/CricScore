# API Contracts

## Authentication
(See previous contracts)

## Profile
(See previous contracts)

## Team Management

### `POST /api/teams`
- **Description:** Create a new team. Authenticated user becomes OWNER and CAPTAIN.
- **Auth:** Bearer Token
- **Body:**
  ```json
  {
    "name": "Chennai Super Kings",
    "shortName": "CSK",
    "city": "Chennai"
  }
  ```
- **Response:** `{ success: true, data: { team: Team } }`

### `GET /api/teams/:id`
- **Description:** Get team details, members, and reliability score.
- **Auth:** Bearer Token (Any user)
- **Response:** `{ success: true, data: { team: Team & { reliability: number } } }`

### `PATCH /api/teams/:id`
- **Description:** Update team details.
- **Auth:** OWNER or CAPTAIN
- **Body:** `{ "name": "...", "city": "...", "bannerUrl": "..." }`
- **Response:** `{ success: true, data: { team: Team } }`

### `DELETE /api/teams/:id`
- **Description:** Delete team permanently.
- **Auth:** OWNER only
- **Response:** `{ success: true, data: { message: "Team deleted successfully" } }`

### `POST /api/teams/:id/members`
- **Description:** Add a user to the team directly.
- **Auth:** OWNER, CAPTAIN, VICE_CAPTAIN
- **Body:** `{ "userId": "...", "role": "PLAYER" }`
- **Response:** `{ success: true, data: { member: TeamMember } }`

### `DELETE /api/teams/:id/members/:memberId`
- **Description:** Remove a member.
- **Auth:** OWNER or CAPTAIN (Captain cannot remove Owner)
- **Response:** `{ success: true, data: { message: "Member removed" } }`

### `PATCH /api/teams/:id/members/:memberId`
- **Description:** Change a member's role.
- **Auth:** OWNER or CAPTAIN
- **Body:** `{ "role": "VICE_CAPTAIN" }`
- **Response:** `{ success: true, data: { member: TeamMember } }`

### `POST /api/teams/join`
- **Description:** Join team using an invite code.
- **Auth:** Bearer Token
- **Body:** `{ "joinCode": "A7B2-9XZ1" }`
- **Response:** `{ success: true, data: { member: TeamMember } }`

### `GET /api/teams/:id/qr`
- **Description:** Get QR code and invite code for a team.
- **Auth:** Team Member
- **Response:** 
  ```json
  { 
    "success": true, 
    "data": { 
      "inviteCode": "A7B2-9XZ1", 
      "qrCode": "data:image/png;base64,..." 
    } 
  }
  ```
