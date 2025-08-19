
// GitHub Pages Data Manager - Loads from JSON instead of CSV
class FPLDataManager {
    constructor() {
        this.gameweekData = new Map();
        this.currentGameweek = 1;
        this.currentMonth = 'August';
    }

    async initialize() {
        console.log('🔄 Initializing GitHub Pages data manager...');
        try {
            const availableGameweeks = await this.detectGameweekFolders();
            console.log('📁 Available gameweeks:', availableGameweeks);
            
            if (availableGameweeks.length > 0) {
                // Load the first available gameweek
                await this.loadGameweekData(availableGameweeks[0]);
                console.log('✅ Data manager initialized successfully');
                return true; // Return success
            } else {
                console.warn('⚠️ No gameweek data found');
                return false; // Return failure
            }
        } catch (error) {
            console.error('❌ Failed to initialize data manager:', error);
            return false; // Return failure
        }
    }

    async loadJSONFile(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Failed to load ${path}:`, error);
            return null;
        }
    }

    async detectGameweekFolders() {
        // For GitHub Pages, we'll manually check for known gameweeks
        const availableGameweeks = [];
        
        // Only check for gw1 initially to reduce 404 errors
        const gw1Data = await this.loadJSONFile(`./data/gw1.json`);
        if (gw1Data) {
            availableGameweeks.push(`gw1`);
            console.log(`✓ Found gameweek 1`);
        }
        
        return availableGameweeks;
    }

    async loadGameweekData(gameweek) {
        console.log(`📊 Loading ${gameweek} data...`);
        const gwData = await this.loadJSONFile(`./data/${gameweek}.json`);
        if (!gwData) {
            console.warn(`No data found for ${gameweek}`);
            return;
        }

        // Process the data similar to the original CSV version
        const standings = this.processStandingsData(gwData.standings || []);
        const draft = this.processDraftData(gwData.starting_draft || [], gwData.standings || []);
        
        // Process final results (prioritize over partial results)
        const finalResults = this.processFinalResultsData(gwData.final_results_gw1 || []);
        
        // Process partial results for live data (fallback if no final results)
        const partialResults = this.processPartialResultsData(gwData.partial_results_gw1 || []);
        
        // Process player performance data
        const playerData = this.processPlayerData(gwData);
        
        // Calculate standings from final results if no standings exist
        let calculatedStandings = standings;
        if (finalResults.length > 0 && standings.length === 0) {
            calculatedStandings = this.calculateStandingsFromResults(finalResults);
            console.log('📊 Calculated standings from results:', calculatedStandings.length, 'teams');
        }
        
        console.log('📊 Original standings:', standings.length, 'teams');
        console.log('📊 Calculated standings:', calculatedStandings.length, 'teams');
        console.log('📊 Draft teams:', draft.teams.length, 'teams');
        
        // Merge standings data with draft teams for complete leaderboard info
        const leaderboardTeams = this.mergeStandingsWithDraft(calculatedStandings, draft.teams);
        
        const processedData = {
            fixtures: this.parseFixturesData(gwData.fixture_list || []),
            standings: standings,
            draft: {
                teams: leaderboardTeams,
                originalDraftTeams: draft.teams  // Keep original draft teams for draft picks display
            },
            plFixtures: this.parsePLFixtures(gwData.pl_gw1 || gwData.pl_gw2 || []),
            transferHistory: gwData.transfer_history || { waivers: [], freeAgents: [], trades: [] },
            finalResults: finalResults,
            partialResults: partialResults,
            playerData: playerData,
            timestamp: new Date().toISOString()
        };

        this.gameweekData.set(gameweek, processedData);
        console.log(`✅ Loaded ${gameweek} data:`, processedData);
    }

    parseFixturesData(fixtureData) {
        // Convert the fixture data to expected format
        if (!Array.isArray(fixtureData)) return [];
        
        return fixtureData.map(fixture => ({
            gameweek: fixture.gameweek || 1,
            homeTeam: fixture.homeTeam || '',
            awayTeam: fixture.awayTeam || ''
        }));
    }

    parsePLFixtures(plData) {
        // Convert PL fixtures to expected format
        if (!Array.isArray(plData)) return [];
        
        return plData.map(fixture => ({
            date: fixture.date || '',
            time: fixture.time || '',
            homeTeam: fixture.homeTeam || '',
            awayTeam: fixture.awayTeam || ''
        }));
    }

    processStandingsData(standingsData) {
        // Convert standings data to leaderboard format expected by script.js
        if (!Array.isArray(standingsData)) return [];
        
        return standingsData.map((standing, index) => ({
            position: standing.Rank !== '-' ? parseInt(standing.Rank) : index + 1,
            teamName: standing['Team Name'] || '',
            manager: standing.Manager || '',
            points: parseInt(standing.Pts) || 0,
            wins: parseInt(standing.W) || 0,
            draws: parseInt(standing.D) || 0,
            losses: parseInt(standing.L) || 0,
            gwPoints: 0, // Will be updated when we have gameweek data
            form: 'N/A' // Will be updated when we have form data
        }));
    }

    processDraftData(draftData, standingsData) {
        // Convert draft data to the expected format
        if (!Array.isArray(draftData) || draftData.length === 0) {
            console.warn('No draft data available');
            return { teams: [] };
        }
        
        const teamMap = {};
        
        // First, get manager names from standings if available
        const managerLookup = {};
        if (Array.isArray(standingsData)) {
            standingsData.forEach(standing => {
                if (standing.Manager && standing['Team Name']) {
                    managerLookup[standing.Manager] = standing['Team Name'];
                }
            });
        }
        
        // Process draft data - handle different formats
        draftData.forEach(pick => {
            // Extract manager and player info from various possible formats
            const possibleManagers = Object.keys(pick).filter(key => 
                key !== 'Round' && key !== 'Pick' && key !== 'Player' && pick[key]
            );
            
            possibleManagers.forEach(teamName => {
                const player = pick[teamName];
                if (player && player.trim()) {
                    // Find the manager for this team name
                    const managerName = Object.keys(managerLookup).find(manager => 
                        managerLookup[manager] === teamName
                    ) || teamName;
                    
                    // Extract first name for display (for team dropdown)
                    const firstName = managerName.split(' ')[0];
                    
                    if (!teamMap[teamName]) {
                        teamMap[teamName] = {
                            manager: managerName,
                            teamName: teamName,
                            firstName: firstName,
                            draftPicks: []
                        };
                    }
                    teamMap[teamName].draftPicks.push(player.trim());
                }
            });
        });

        const teams = Object.values(teamMap);
        console.log('📝 Processed draft teams:', teams.length);
        return { teams };
    }

    processPartialResultsData(partialResultsData) {
        // Process partial results data for live standings
        if (!Array.isArray(partialResultsData)) return [];
        
        return partialResultsData.map(result => ({
            gameweek: result.gameweek || 1,
            day: result.day || 1,
            homeTeam: result.homeTeam || '',
            homeManager: result.homeManager || '',
            homeScore: result.homeScore || 0,
            awayTeam: result.awayTeam || '',
            awayManager: result.awayManager || '',
            awayScore: result.awayScore || 0
        }));
    }

    processFinalResultsData(finalResultsData) {
        // Process final results data for locked-in standings
        if (!Array.isArray(finalResultsData)) return [];
        
        return finalResultsData.map(result => ({
            gameweek: result.gameweek || 1,
            homeTeam: result.homeTeam || '',
            homeManager: result.homeManager || '',
            homeScore: result.homeScore || 0,
            awayTeam: result.awayTeam || '',
            awayManager: result.awayManager || '',
            awayScore: result.awayScore || 0,
            isFinal: true
        }));
    }

    processPlayerData(gwData) {
        // Process all player performance data from different gameweeks
        const allPlayers = {};
        
        // Look for player data files (players_gw1, players_gw2, etc.)
        Object.keys(gwData).forEach(key => {
            if (key.startsWith('players_gw')) {
                const gameweek = key.replace('players_gw', '');
                const players = gwData[key] || [];
                
                players.forEach(player => {
                    const playerKey = `${player.name}_${player.team}`;
                    if (!allPlayers[playerKey]) {
                        allPlayers[playerKey] = {
                            name: player.name,
                            team: player.team,
                            position: player.position,
                            cost: player.Cost || 0,  // Add cost property for analytics
                            gameweeks: {},
                            totalPoints: 0,
                            bestGameweek: null,
                            worstGameweek: null
                        };
                    }
                    
                    // Add gameweek data - handle JSON property names
                    const playerPoints = player.Pts || player.points || 0;
                    const roundPts = player['Round Pts'] || player.roundPts || playerPoints;
                    
                    allPlayers[playerKey].gameweeks[gameweek] = {
                        points: playerPoints,
                        roundPts: roundPts,
                        otherStats: player
                    };
                    
                    // Update totals
                    allPlayers[playerKey].totalPoints += playerPoints;
                    
                    // Track best/worst gameweeks
                    if (!allPlayers[playerKey].bestGameweek || 
                        playerPoints > allPlayers[playerKey].gameweeks[allPlayers[playerKey].bestGameweek].points) {
                        allPlayers[playerKey].bestGameweek = gameweek;
                    }
                    
                    if (!allPlayers[playerKey].worstGameweek || 
                        playerPoints < allPlayers[playerKey].gameweeks[allPlayers[playerKey].worstGameweek].points) {
                        allPlayers[playerKey].worstGameweek = gameweek;
                    }
                });
            }
        });
        
        return Object.values(allPlayers);
    }

    calculateStandingsFromResults(results) {
        // Calculate standings from final/partial results
        const standings = {};
        
        // Initialize standings for each team
        results.forEach(result => {
            for (const [teamKey, managerKey, scoreKey] of [
                ['homeTeam', 'homeManager', 'homeScore'],
                ['awayTeam', 'awayManager', 'awayScore']
            ]) {
                const team = result[teamKey];
                const manager = result[managerKey];
                
                if (team && !standings[team]) {
                    standings[team] = {
                        teamName: team,
                        manager: manager || '',
                        points: 0,
                        gwPoints: 0,
                        played: 0,
                        wins: 0,
                        draws: 0,
                        losses: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        goalDifference: 0
                    };
                }
            }
        });
        
        // Calculate stats from results
        results.forEach(result => {
            const homeTeam = result.homeTeam;
            const awayTeam = result.awayTeam;
            const homeScore = result.homeScore || 0;
            const awayScore = result.awayScore || 0;
            
            if (standings[homeTeam] && standings[awayTeam]) {
                // Update stats
                standings[homeTeam].played += 1;
                standings[awayTeam].played += 1;
                standings[homeTeam].goalsFor += homeScore;
                standings[homeTeam].goalsAgainst += awayScore;
                standings[awayTeam].goalsFor += awayScore;
                standings[awayTeam].goalsAgainst += homeScore;
                standings[homeTeam].gwPoints += homeScore;
                standings[awayTeam].gwPoints += awayScore;
                
                // Determine result
                if (homeScore > awayScore) {
                    standings[homeTeam].wins += 1;
                    standings[homeTeam].points += 3;
                    standings[awayTeam].losses += 1;
                } else if (awayScore > homeScore) {
                    standings[awayTeam].wins += 1;
                    standings[awayTeam].points += 3;
                    standings[homeTeam].losses += 1;
                } else {
                    standings[homeTeam].draws += 1;
                    standings[homeTeam].points += 1;
                    standings[awayTeam].draws += 1;
                    standings[awayTeam].points += 1;
                }
            }
        });
        
        // Calculate goal difference
        Object.values(standings).forEach(team => {
            team.goalDifference = team.goalsFor - team.goalsAgainst;
        });
        
        // Sort standings
        const sortedStandings = Object.values(standings).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gwPoints !== a.gwPoints) return b.gwPoints - a.gwPoints;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        
        // Add positions
        sortedStandings.forEach((team, index) => {
            team.position = index + 1;
        });
        
        return sortedStandings;
    }

    mergeStandingsWithDraft(standings, draftTeams) {
        console.log('🔗 mergeStandingsWithDraft called with:', standings.length, 'standings,', draftTeams.length, 'draft teams');
        
        // Merge standings data (which has leaderboard info) with draft teams (which has draft picks)
        const mergedTeams = standings.map(standing => {
            // Find corresponding draft team by team name
            const draftTeam = draftTeams.find(team => team.teamName === standing.teamName);
            
            return {
                position: standing.position,
                teamName: standing.teamName,
                manager: standing.manager,
                firstName: standing.manager.split(' ')[0], // Extract first name for dropdown
                points: standing.points,
                wins: standing.wins,
                draws: standing.draws,
                losses: standing.losses,
                gwPoints: standing.gwPoints,
                form: standing.form,
                draftPicks: draftTeam ? draftTeam.draftPicks : []
            };
        });
        
        console.log('🔗 Merged standings with draft data:', mergedTeams.length, 'teams');
        return mergedTeams;
    }

    // Methods for player data access
    getAllPlayers() {
        const allPlayers = [];
        for (const [gameweek, data] of this.gameweekData) {
            if (data.playerData) {
                allPlayers.push(...data.playerData);
            }
        }
        return allPlayers;
    }

    getPlayersByTeam(teamName) {
        const allPlayers = this.getAllPlayers();
        return allPlayers.filter(player => player.team === teamName);
    }

    getTopPerformers(limit = 10) {
        const allPlayers = this.getAllPlayers();
        return allPlayers
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, limit);
    }

    getPlayersByPosition(position) {
        const allPlayers = this.getAllPlayers();
        return allPlayers.filter(player => player.position === position);
    }

    getCurrentGameweek() {
        return this.currentGameweek;
    }

    getCurrentGameweekData() {
        const gameweek = `gw${this.currentGameweek}`;
        return this.gameweekData.get(gameweek);
    }

    getDataSummary() {
        const availableGameweeks = Array.from(this.gameweekData.keys())
            .map(gw => parseInt(gw.replace('gw', '')))
            .sort((a, b) => a - b);

        return {
            availableGameweeks: availableGameweeks,
            currentGameweek: this.currentGameweek,
            totalGameweeks: availableGameweeks.length
        };
    }

    isDataLoaded() {
        return this.gameweekData.size > 0;
    }

    getAvailableGameweekNumbers() {
        return Array.from(this.gameweekData.keys())
            .map(gw => parseInt(gw.replace('gw', '')))
            .sort((a, b) => a - b);
    }

    async loadGameweekDataIfNeeded(gameweek) {
        const gwKey = `gw${gameweek}`;
        if (!this.gameweekData.has(gwKey)) {
            await this.loadGameweekData(gwKey);
        }
        return this.gameweekData.get(gwKey);
    }

    // Methods needed for partial results functionality
    getAllPartialResults() {
        const allResults = [];
        for (const [gameweek, data] of this.gameweekData) {
            if (data.partialResults) {
                allResults.push(...data.partialResults);
            }
        }
        return allResults;
    }

    getPartialResults(gameweek = null) {
        if (gameweek) {
            // Convert gameweek number to string key (e.g., 1 -> "gw1")
            const gameweekKey = typeof gameweek === 'number' ? `gw${gameweek}` : gameweek;
            const data = this.gameweekData.get(gameweekKey);
            return data ? data.partialResults : [];
        }
        return this.getAllPartialResults();
    }

    // Methods for final results functionality
    getAllFinalResults() {
        const allResults = [];
        for (const [gameweek, data] of this.gameweekData) {
            if (data.finalResults) {
                allResults.push(...data.finalResults);
            }
        }
        return allResults;
    }

    getFinalResults(gameweek = null) {
        if (gameweek) {
            // Convert gameweek number to string key (e.g., 1 -> "gw1")
            const gameweekKey = typeof gameweek === 'number' ? `gw${gameweek}` : gameweek;
            const data = this.gameweekData.get(gameweekKey);
            return data ? data.finalResults : [];
        }
        return this.getAllFinalResults();
    }

    // Get results with final results taking priority over partial results
    getResults(gameweek = null) {
        const finalResults = this.getFinalResults(gameweek);
        if (finalResults.length > 0) {
            return finalResults; // Use final results if available
        }
        return this.getPartialResults(gameweek); // Fallback to partial results
    }
}
