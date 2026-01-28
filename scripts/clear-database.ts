/**
 * Database Cleanup Script
 * Clears all data from the database while preserving the schema structure
 * 
 * Usage: npx tsx scripts/clear-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('Starting database cleanup...\n');

  try {
    // Delete in order to respect foreign key constraints
    // Start with tables that have dependencies on others

    // 1. Delete match-related records first (they reference users, teams, etc.)
    console.log('Clearing PlayerMatchHistory...');
    const playerMatchHistoryCount = await prisma.playerMatchHistory.deleteMany({});
    console.log(`  Deleted ${playerMatchHistoryCount.count} records`);

    console.log('Clearing OverHistory records...');
    const overHistoryCount = await prisma.overHistory.deleteMany({});
    console.log(`  Deleted ${overHistoryCount.count} records`);

    console.log('Clearing MatchSpectator records...');
    const matchSpectatorCount = await prisma.matchSpectator.deleteMany({});
    console.log(`  Deleted ${matchSpectatorCount.count} records`);

    console.log('Clearing MatchSummary records...');
    const matchSummaryCount = await prisma.matchSummary.deleteMany({});
    console.log(`  Deleted ${matchSummaryCount.count} records`);

    console.log('Clearing LocalMatch records...');
    const localMatchCount = await prisma.localMatch.deleteMany({});
    console.log(`  Deleted ${localMatchCount.count} records`);

    console.log('Clearing TeamMatchPlayer records...');
    const teamMatchPlayerCount = await prisma.teamMatchPlayer.deleteMany({});
    console.log(`  Deleted ${teamMatchPlayerCount.count} records`);

    console.log('Clearing TeamMatch records...');
    const teamMatchCount = await prisma.teamMatch.deleteMany({});
    console.log(`  Deleted ${teamMatchCount.count} records`);

    console.log('Clearing Match records...');
    const matchCount = await prisma.match.deleteMany({});
    console.log(`  Deleted ${matchCount.count} records`);

    // 2. Delete team-related records
    console.log('Clearing TeamStatistics...');
    const teamStatsCount = await prisma.teamStatistics.deleteMany({});
    console.log(`  Deleted ${teamStatsCount.count} records`);

    console.log('Clearing GuestPlayer records...');
    const guestPlayerCount = await prisma.guestPlayer.deleteMany({});
    console.log(`  Deleted ${guestPlayerCount.count} records`);

    console.log('Clearing TeamMember records...');
    const teamMemberCount = await prisma.teamMember.deleteMany({});
    console.log(`  Deleted ${teamMemberCount.count} records`);

    console.log('Clearing TeamInvitation records...');
    const teamInvitationCount = await prisma.teamInvitation.deleteMany({});
    console.log(`  Deleted ${teamInvitationCount.count} records`);

    console.log('Clearing Team records...');
    const teamCount = await prisma.team.deleteMany({});
    console.log(`  Deleted ${teamCount.count} records`);

    // 3. Delete user-related records
    console.log('Clearing CareerStats...');
    const careerStatsCount = await prisma.careerStats.deleteMany({});
    console.log(`  Deleted ${careerStatsCount.count} records`);

    console.log('Clearing Fixture records...');
    const fixtureCount = await prisma.fixture.deleteMany({});
    console.log(`  Deleted ${fixtureCount.count} records`);

    console.log('Clearing User records...');
    const userCount = await prisma.user.deleteMany({});
    console.log(`  Deleted ${userCount.count} records`);

    console.log('\n========================================');
    console.log('Database cleanup completed successfully!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`  Users: ${userCount.count}`);
    console.log(`  CareerStats: ${careerStatsCount.count}`);
    console.log(`  Teams: ${teamCount.count}`);
    console.log(`  TeamMembers: ${teamMemberCount.count}`);
    console.log(`  TeamInvitations: ${teamInvitationCount.count}`);
    console.log(`  TeamStatistics: ${teamStatsCount.count}`);
    console.log(`  GuestPlayers: ${guestPlayerCount.count}`);
    console.log(`  Matches: ${matchCount.count}`);
    console.log(`  TeamMatches: ${teamMatchCount.count}`);
    console.log(`  TeamMatchPlayers: ${teamMatchPlayerCount.count}`);
    console.log(`  LocalMatches: ${localMatchCount.count}`);
    console.log(`  MatchSummaries: ${matchSummaryCount.count}`);
    console.log(`  PlayerMatchHistories: ${playerMatchHistoryCount.count}`);
    console.log(`  MatchSpectators: ${matchSpectatorCount.count}`);
    console.log(`  OverHistory: ${overHistoryCount.count}`);
    console.log(`  Fixtures: ${fixtureCount.count}`);

  } catch (error) {
    console.error('Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearDatabase()
  .then(() => {
    console.log('\nScript finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
