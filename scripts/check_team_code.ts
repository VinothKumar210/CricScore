
import { storage } from "../server/storage";
import { prisma } from "../server/db";

async function verifyTeamCode() {
    console.log("Fetching all teams...");
    const teams = await prisma.team.findMany();

    if (teams.length === 0) {
        console.log("No teams found in database.");
        return;
    }

    console.log(`Found ${teams.length} teams.`);
    const targetTeam = teams[0];
    const code = targetTeam.teamCode;
    const id = targetTeam.id;

    console.log(`Testing with Team: ${targetTeam.name}`);
    console.log(`ID: ${id}`);
    console.log(`Code: ${code}`);

    console.log("\n--- Testing getTeam(code) ---");
    const teamByCode = await storage.getTeam(code);
    if (teamByCode && teamByCode.id === id) {
        console.log("SUCCESS: Retrieved team by code correctly.");
    } else {
        console.error("FAILURE: Could not retrieve team by code.");
        console.log("Result:", teamByCode);
    }

    console.log("\n--- Testing getTeamStatistics(code) ---");
    const statsByCode = await storage.getTeamStatistics(code);
    // It might return undefined if no stats exist, but it shouldn't crash
    if (statsByCode) {
        console.log("SUCCESS: Retrieved stats by code.");
    } else {
        // Check if stats exist for ID
        const statsById = await storage.getTeamStatistics(id);
        if (statsById) {
            console.error("FAILURE: Stats exist for ID but could not retrieve by code.");
        } else {
            console.log("SUCCESS: No stats exist for this team, but method call succeeded (returned undefined).");
        }
    }

    console.log("\n--- Testing getTeamMembers(code) ---");
    const members = await storage.getTeamMembers(code);
    console.log(`SUCCESS: Retrieved ${members.length} members by code.`);

    console.log("\n--- Testing getGuestPlayers(code) ---");
    const guests = await storage.getGuestPlayers(code);
    console.log(`SUCCESS: Retrieved ${guests.length} guest players by code.`);
}

verifyTeamCode()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
