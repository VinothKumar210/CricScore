# Todo / Roadmap

## Completed
- [x] **STEP 1:** Project Initialization
- [x] **STEP 2:** Schema Freeze (Full Prisma schema defined)
- [x] **STEP 3:** Project Init (npm create, dependencies, config)
- [x] **STEP 4:** Firebase Auth + Profile System

## Next Steps
- [ ] **STEP 5:** Team System (Team CRUD, membership, invite codes, roles)
- [ ] **STEP 6:** Match Setup (Match creation, team selection, formats)
- [ ] **STEP 7:** Scoring Engine (Ball-by-ball state machine)

## Technical Debt & Cleanup
- [ ] Configure ESLint/Prettier for monorepo
- [ ] Set up Husky pre-commit hooks
- [ ] Profile Wizard UI (Frontend)

## Future Constraints
- **State Machine:** Ensure the Client-side scoring state machine is thoroughly tested (Phase 3).
- **Transactions:** Verify MongoDB replica set is enabled (required for Prisma transactions).
