# CricScore UI Architecture Blueprint

**Version:** 1.2.0 (Patch v1.2)
**Theme:** Utility-First / Material 3 Flat / High Density
**Core Color:** Deep Green (#166534)
**Typography:** Inter / Roboto (System Default)

---

## 1. Global Layout Architecture

### 1.1 Layout Types

1.  **AuthLayout**
    *   **Usage:** Login, OTP, Onboarding.
    *   **Structure:**
        *   Full screen background (Clean white).
        *   Centered content container (Max width 400px).
        *   No navigation bars.
        *   Focus on input fields and primary CTA.

2.  **DashboardLayout (App Shell)**
    *   **Usage:** Home, Market, Teams, Profile, Tournaments.
    *   **Structure:**
        *   **Top Bar:** Page Title (Left).
            *   **Right Actions:** `Search`, `MessageInbox` (Badge), `NotificationBell` (Badge).
        *   **Content Area:** Scrollable viewport. Padding: `16px` (Mobile), `24px` (Tablet).
        *   **Bottom Navigation:** 5 core tabs. Fixed at bottom.
        *   **FAB (Floating Action Button):** Context-aware (e.g., "Create Match" on Home, "Create Invite" on Market).

3.  **FullscreenScoringLayout**
    *   **Usage:** Live Match Scoring Interface.
    *   **Structure:**
        *   **Header:** Match Status, Teams, Current Score. Compact, sticky.
        *   **Main View:** Ball-by-ball inputs, Bowler/Batsman selector.
        *   **Footer:** 'Undo', 'Extras', 'Wicket'. Sticky.
        *   **Immersive Mode:** Hides browser chrome if possible. No bottom nav.

### 1.2 Navigation Model

*   **Primary Navigation (Bottom Bar):**
    1.  **Home:** Feed of Live/Recent matches.
    2.  **Marketplace:** Find/Post match invites (Map/List).
    3.  **Play:** Quick access to Scoring or "Start Match". central, emphasized.
    4.  **Teams:** My Teams, Roster Management.
    5.  **Profile:** My Stats, Settings.

*   **Header Navigation:**
    *   **Notifications:** Bell icon. Accessible globally. Shows unread badge.
    *   **Messaging:** Inbox icon. Accessible globally (and via Team view). Shows unread badge.

*   **Secondary Navigation:** Stack Navigation (Push/Pop) for drill-downs.

---

## 2. Role-Based UI Visibility Rules

The UI must stricly reflect the backend RBAC.

| Role | Visibility | Actions |
| :--- | :--- | :--- |
| **Guest / Public** | View Only | Read Match Scores, View Leaderboards. |
| **User (Auth)** | Interactive | Create Team, Join Team (Invite), Create Friendly Match. |
| **Team Member** | Limited | View internal team chats, view private team stats. |
| **Team Admin (Captain)** | Administrative | Edit Team Profile, Respond to Invites, Manage Roster. |
| **Scorer** | Operational | **Access Scoring Interface**, Edit Match State. |
| **Tournament Admin** | Power User | Generate Fixtures, Resolve Disputes, Edit Points Table. |

**Implementation Rule:** `RoleGuard` component wraps protected routes and buttons. If unauthorized, elements are **hidden** (not disabled), unless discovery is desired (then disabled with tooltip).

---

## 3. Backend State → UI Control Matrix (CRITICAL)

The UI is a direct reflection of the backend state machine.

| Match Status | Visible UI Components | Hidden / Disabled | Actions Available |
| :--- | :--- | :--- | :--- |
| `SCHEDULED` | Start Match Button, Toss Modal (if Admin) | Scoring Grid, Undo, Extras | `startMatch`, `recordToss` |
| `LIVE` | Scoring Grid (0-6), Extras, Wicket, Undo, Swap Batsman | Start Match | `recordBall`, `undoLastBall`, `retireBatter` |
| `INNINGS_BREAK` | Start 2nd Innings Button, Target Display | Scoring Grid, Wicket | `startInnings` |
| `COMPLETED` | Match Summary View, Scorecard (ReadOnly) | **ALL Scoring Controls** | `viewSummary`, `shareResult` |
| `ABANDONED` | Abandoned Banner (Reason) | **ALL Scoring Controls** | None |

### 3.1 Concurrency Handling
*   **Condition:** `expectedVersion` mismatch on API response.
*   **UI Reaction:**
    1.  **Toast:** "Sync Error. Refreshing state." (Yellow).
    2.  **Action:** Disable Control Pad immediately.
    3.  **Auto:** Trigger `GET /match/:id` to fetch latest state.
    4.  **Resume:** Re-enable controls once state is synced.

---

## 4. Marketplace UI Blueprint

### 4.1 /market Screen
*   **Top Filter Bar (Sticky):**
    *   **Row 1:** Search (Location/Team). Toggle: **Map** / **List**.
    *   **Row 2 (Chips):** `Date` (Picker), `Overs` (10/20/50), `Ball` (Leather/Tennis), `Radius` (Slider).
*   **List View (Feed):**
    *   Vertical list of `InviteCard`.
    *   **InviteCard Layout:**
        *   **Header:** Team Name • **Reliability Badge** (Green 95%+, Yellow 70-94%, Red <70%).
        *   **Body:** Date/Time (Bold) • Ground Name • Format (20 Overs, Leather).
        *   **Footer:** Distance (e.g., `5.2 km`) • **CTA:** "View" / "Propose".
*   **Map View:**
    *   Pins for each invite. Color-coded by format.
    *   Tap pin -> Shows generic `InviteCard` in bottom sheet.

### 4.2 Invite Detail Screen
*   **Match Info:** Full details (Fees, Umpire info, etc.).
*   **Map Preview:** Static map showing ground location.
*   **Proposal Section:**
    *   If Owner: List of incoming proposals (Accept/Reject/Counter).
    *   If Seeker: "Sent Proposal" status or "Draft Proposal" form.
    *   **Negotiation Chat:** Embedded chat for negotiating details.

---

## 5. Messaging UI Blueprint

### 5.1 Chat Screen Layout
*   **Header:**
    *   Team/User Name.
    *   **Online Indicator:** Green dot (Real-time presence).
    *   **Actions:** Mute, Search, Info.
*   **Message List:**
    *   **Bubble (Self):** Right-aligned. Deep Green bg. White text.
    *   **Bubble (Others):** Left-aligned. Grey bg. Black text. Name in small caption.
    *   **Density:** Compact padding (`8px` vertical, `12px` horizontal).
    *   **Meta:** Timestamp (`10:42 AM`) small grey inside bubble.
    *   **Read Receipt:** Double check (Grey -> Blue) for Self messages.
*   **Reaction Row:**
    *   Small emoji chips *below* message bubble.
    *   Tap to toggle (+1). Count displayed if > 1.
*   **Typing Indicator:**
    *   "Amar is typing..." (Bottom left).
    *   Auto-hides after 5s of inactivity.

### 5.2 Special Message Types
*   **Poll Card:**
    *   **Question:** Bold header.
    *   **Options:** List with progress bars (visual percentage).
    *   **Interaction:** Tap to vote. Optimistic update.
*   **Scheduled Message:**
    *   Small clock icon 🕒 before timestamp to indicate "Scheduled".

---

## 6. Stats & Analytics UI Blueprint

### 6.1 Profile / Team Stats
*   **Tab Switcher:** `Batting` | `Bowling` | `Fielding`.
*   **Compact Stats Cards:**
    *   Grid of 4 cards: `Matches`, `Runs/Wickets`, `Average`, `SR/Econ`.
    *   Style: Flat white card, Green accent border-left.
*   **Charts:**
    *   **Run Rate:** Line chart. Green (Self) vs Grey (Opponent).
    *   **Wagon Wheel:** (Future) Radar-style.
    *   **Style:** Minimalist. No heavy gradients/shadows.

### 6.2 Comparison Screen
*   **Layout:** Split view or Side-by-Side columns.
*   **Visuals:**
    *   **Radar Chart:** Overlaying two players (e.g., Power vs Consistency).
    *   **Table:** `CompactDataTable` (Row height `40px`).
        *   Cols: Metric, Player A, Player B, Diff (+/-).

---

## 7. Scoring Screen Layout Blueprint (Refined)

**Vertical Stack (Top to Bottom):**

1.  **Header (Sticky):**
    *   Row 1: Team Names (Short).
    *   Row 2: **BIG SCORE** `124/3`. Overs `14.2`.
2.  **Batsman Area:**
    *   Striker (Bold) vs Non-Striker. Runs(Balls).
3.  **Bowler Area:**
    *   Bowler Name. Figures.
4.  **This Over:**
    *   Horizontal scroll: `1` `4` `W` `0` `wd`.
5.  **Main Control Pad (The Grid):**
    *   **Row 1 (Runs):** `0`, `1`, `2`, `3`, `4`, `6`.
    *   **Row 2 (Extras):** `wd`, `nb`, `lb`, `b`.
    *   **Row 3 (Events):** `WICKET` (Red), `UNDO` (Grey).
    *   **Row 4 (Ops):** `Swap`, `Retire`.
6.  **Footer Info:** Projected Score.

### 7.1 API Lock Rule (CRITICAL)
*   **Trigger:** When a scoring button is pressed.
*   **Action:**
    1.  Apply optimistic update immediately.
    2.  **Disable entire control grid.**
    3.  Show small spinner in header corner.
    4.  Re-enable grid only after API resolves.
*   **Error Handling:**
    *   If error: Revert local state, Show error toast, Re-enable controls.
*   **Purpose:** Prevent rapid double taps that cause version conflicts despite backend unique constraint.

---

## 8. Performance Constraints

1.  **Re-renders:**
    *   Use `React.memo` for `ScorePanel`, `ControlPad`, and `MessageBubble`.
    *   Scoring screen should *only* re-render the Header and Timeline on score update, not the whole grid.
2.  **Virtualization:**
    *   Marketplace Feed and Message List **MUST** be virtualized (e.g., `TanStack Virtual`).
    *   Supports thousands of items without DOM bloat.
3.  **Socket Optimization:**
    *   Socket events (`score_update`, `new_message`) must update specific Redux/Zustand slices.
    *   Do not refetch entire data objects on socket event; patch local state.
4.  **Pagination:**
    *   Marketplace: Cursor-based pagination (Infinity Scroll).
    *   Scorecard: Load full match data at once (it's small JSON), but virtualize the ball-by-ball list.

---

## 9. Error & Edge Case UI

### 9.1 Offline Mode (Detailed)
*   **Network Disconnected:**
    *   **Banner:** Yellow top banner: “Offline Mode — Events queued”.
    *   **Counter:** “3 Unsynced Balls”.
    *   **Controls:** Grid remains enabled.
    *   **Storage:** Events stored in local queue (IndexedDB / localStorage).
    *   **Icon:** Cloud with slash.
*   **Network Reconnected:**
    *   **Indicator:** “Syncing…”
    *   **Action:** Replay queued events in order.
    *   **Failure:**
        *   Stop replay.
        *   Error: “Sync Conflict — Refreshing state”.
        *   Fetch latest match state.
    *   **Constraints:** While queue not empty, disable match finalization and tournament advancement.

### 9.2 Other Edges
*   **Rate Limited:** Toast: "Too fast! Wait 5s." Disable inputs.
*   **Unauthorized:** Redirect to Home.
*   **Match Expired:** "Match Abandoned" banner.

---

## 10. Tournament UI Blueprint (NEW)

### 10.1 /tournaments (List Screen)
*   **Top:** Search bar + Filter chips (Active, Completed, My Tournaments).
*   **List:** Vertical list of **TournamentCard**.
*   **TournamentCard Layout:**
    *   Name (Bold).
    *   Format (League / Knockout) • Status Badge.
    *   Teams Count (e.g., 8/8) • Start Date.
    *   **CTA:** View.

### 10.2 /tournaments/:id (Dashboard)
*   **Header:** Name, Format Badge, Status Badge.
*   **Tabs (Sticky):** `Overview`, `Fixtures`, `Points`, `Teams`.

#### Overview Tab
*   Description, Start/End date, Organizer.
*   **Quick Stats:** Total Teams, Total Matches, Completed Matches.
*   **Actions:** "Generate Fixtures" (Visible to Creator if status = REGISTRATION).

#### Fixtures Tab
*   Grouped by **Round** (League: Round 1, 2... | Knockout: QF, SF, Final).
*   **FixtureCard:** Team A vs Team B • Status • Winner.
*   **Bracket View (Knockout):** Toggle to visual tree view.

#### Points Table Tab
*   **Component:** `CompactDataTable` (Row height: 40px).
*   **Columns:** Pos, Team, P, W, L, T, NRR (3 decimals, prefix '+'), PTS.
*   **Sorting:** Points DESC -> NRR DESC.
*   **Visual:** "Tie" indicator badge if tied on points.

#### Teams Tab
*   List of registered teams.
*   Team Name • Captain • Matches Played.
*   **Actions:** Remove Team (Creator only, before fixtures).

---

## 11. Notification Screen UX (NEW)

### 11.1 /notifications
*   **Header:** Title "Notifications" • "Mark All Read".
*   **Tabs:** `All` | `Unread`.
*   **List Item Layout:**
    *   **Left Icon:** 🏏 (Match), 🏆 (Tournament), 📍 (Invite), 💬 (Message), 🔔 (System).
    *   **Center:** Title (Bold) • Body (1-2 lines) • Timestamp (Small grey).
    *   **Right:** Unread dot (if unread).
*   **Interactions:**
    *   Tap -> Navigate to screen.
    *   Swipe Right -> Mark Read.
    *   Swipe Left -> Delete (Future).
*   **Pagination:** Infinite Scroll.

---

## 12. Enum Mapping Rule (NEW)

### 12.0 Backend Enum → UI Mapping
All UI labels must map to backend enums. No hardcoded status strings in components.

**Example Implementation:**
```javascript
// constants.ts
export const MATCH_STATUS_LABELS = {
  SCHEDULED: t('match.status.scheduled'),
  LIVE: t('match.status.live'),
  INNINGS_BREAK: t('match.status.innings_break'),
  COMPLETED: t('match.status.completed'),
  ABANDONED: t('match.status.abandoned'),
};
```
**Rule:** Ensure strict 1:1 mapping with Prisma enums to prevent UI state drift.
