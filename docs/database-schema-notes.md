# Database Schema Notes (Frozen Step 2)

## 1. Migration Strategy
Since we are in the initial development phase, we will use `prisma db push` for rapid prototyping on MongoDB.
- **Development:** `npx prisma db push`
- **Production:** MongoDB does not use SQL-like migrations. We will rely on Prisma's schema synchronization.
- **Breaking Changes:** If a breaking change is strictly necessary later, we will write a script to migrate data using the old schema before deploying the new one.

## 2. Key Design Decisions

### User & Authentication
- **Clerk Integration:** `clerkId` is the immutable link to the auth provider. `email` and `phoneNumber` are indexed for fast lookups during invites.
- **Auto-Username:** `autoUsername` serves as a stable fallback, while `username` is user-customizable.

### Team & Guest Players
- **Guest Handling:** `GuestPlayer` model allows adding players ad-hoc. It has optional `teamId`.
- **Merging:** If a Guest Player later signs up, we can link their `BattingPerformance` records to their new `User.id` efficiently because performances reference `guestPlayerId` OR `userId`.

### Match & Scoring
- **MatchOp Log:** The `MatchOp` model is critical for **Offline Scoring** and **Conflict Resolution**. It acts as an append-only log of every scoring action (Wide, Wicket, Run).
    - `clientOpId`: Idempotency key to prevent duplicate processing if client retries.
    - `opIndex`: Validates sequence order.
- **Relational Stats:** Unlike the old JSON blob approach, we store `BattingPerformance` and `BowlingPerformance` as separate rows. This enables powerful aggregation queries (e.g., "Total runs for Player X in 2026").

### Messaging
- **Polyglot Design:** `Message` model handles Text, Image, Polls, and System messages via a `type` enum.
- **Performance:** Indexed on `[conversationId, createdAt]` for fast pagination of chat history.

## 3. Scalability & Indexes
- **Geo-Spatial:** `Ground` and `MatchSeeker` have `[latitude, longitude]` indexes (though MongoDB requires special 2dsphere indexes, Prisma supports basic compound indexes which act as a good generalized filter). *Note: We may need raw MongoDB commands to add 2dsphere indexes.*
- **Stats:** `BattingPerformance` indexed by `userId` allows O(1) lookup for career stats aggregation.
- **Notifications:** Indexed by `[userId, isRead]` to quickly fetch unread count.

## 4. Known Risks & Mitigations
- **Transaction Limits:** MongoDB transactions are only available on Replica Sets. **Dev environment must run as a Replica Set.**
- **BallRecord Volume:** A T20 match has ~250 balls. 10k matches = 2.5M records. This is handleable by MongoDB, but we should plan an archiving strategy for old matches (move to `ArchivedBallRecord`) in Phase 10+.
