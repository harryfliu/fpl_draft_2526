
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
                // Load data from all available gameweeks (like local version)
                await this.loadAllGameweekData();
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
        
        // Check for available gameweeks
        for (let gw = 1; gw <= 38; gw++) {
            const gwData = await this.loadJSONFile(`./data/gw${gw}.json`);
            if (gwData) {
                availableGameweeks.push(`gw${gw}`);
                // Store the raw JSON data in gameweekData for processing
                this.gameweekData.set(`gw${gw}`, gwData);
                console.log(`✓ Found gameweek ${gw}`);
            }
        }
        
        // Set current gameweek to the highest available
        if (availableGameweeks.length > 0) {
            const highestGW = Math.max(...availableGameweeks.map(gw => parseInt(gw.replace('gw', ''))));
            this.currentGameweek = highestGW;
            console.log(`🏆 Set current gameweek to ${highestGW}`);
        }
        
        return availableGameweeks;
    }

    async loadAllGameweekData() {
        console.log('📥 Loading data from all gameweeks...');
        const availableGameweeks = Array.from(this.gameweekData.keys());
        
        for (const gameweek of availableGameweeks) {
            await this.loadGameweekData(gameweek);
        }
        console.log('✅ Loaded data from all gameweeks');
    }

    async loadGameweekData(gameweek) {
        console.log(`📊 Loading ${gameweek} data...`);
        const gwData = await this.loadJSONFile(`./data/${gameweek}.json`);
        if (!gwData) {
            console.warn(`No data found for ${gameweek}`);
            return;
        }

        // Process final results (prioritize over partial results)
        const finalResults = this.processFinalResultsData(gwData.final_results_gw1 || gwData.final_results_gw2 || []);
        
        // Process partial results for live data (fallback if no final results)
        const partialResults = this.processPartialResultsData(gwData.partial_results_gw1 || gwData.partial_results_gw2 || []);
        
        // Create standings from results if no standings data exists
        let standings = this.createStandingsFromResults(finalResults, partialResults);
        
        // If no standings created (no results yet), try to get standings from previous gameweek
        if (standings.length === 0) {
            const gameweekNum = parseInt(gameweek.replace('gw', ''));
            if (gameweekNum > 1) {
                const previousGameweek = `gw${gameweekNum - 1}`;
                const previousData = this.gameweekData.get(previousGameweek);
                if (previousData && previousData.standings && previousData.standings.length > 0) {
                    console.log(`📊 Using standings from ${previousGameweek} for ${gameweek} (no results yet)`);
                    standings = previousData.standings;
                }
            }
        }
        
        // Process draft data with the standings (either from results or previous gameweek)
        const draft = this.processDraftData(gwData.starting_draft || [], standings);
        
        // Process player performance data
        let playerData = this.processPlayerData(gwData);
        
        // If no player data for current gameweek, try to get it from previous gameweek
        if (playerData.length === 0) {
            const gameweekNum = parseInt(gameweek.replace('gw', ''));
            if (gameweekNum > 1) {
                const previousGameweek = `gw${gameweekNum - 1}`;
                const previousData = this.gameweekData.get(previousGameweek);
                if (previousData && previousData.playerData && previousData.playerData.length > 0) {
                    console.log(`⚽ Using player data from ${previousGameweek} for ${gameweek} (no player data yet)`);
                    playerData = previousData.playerData;
                }
            }
        }
        
        // Merge standings data with draft teams for complete leaderboard info
        const leaderboardTeams = this.mergeStandingsWithDraft(standings, draft.teams);
        
        const processedData = {
            fixtures: this.parseFixturesData(gwData.fixture_list || []),
            standings: standings,
            draft: {
                teams: leaderboardTeams,
                originalDraftTeams: draft.teams  // Keep original draft teams for draft picks display
            },
            plFixtures: this.parsePLFixtures(gwData[`pl_gw${gameweek.replace('gw', '')}`] || []),
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

    createStandingsFromResults(finalResults, partialResults) {
        // Create standings data from final results (prioritize) or partial results
        const results = finalResults.length > 0 ? finalResults : partialResults;
        if (results.length === 0) return [];
        
        // Get unique teams from results
        const teams = new Set();
        results.forEach(result => {
            teams.add(result.homeTeam);
            teams.add(result.awayTeam);
        });
        
        // Create standings for each team
        const standings = Array.from(teams).map(teamName => {
            // Find manager name from results
            const result = results.find(r => r.homeTeam === teamName || r.awayTeam === teamName);
            const manager = result ? (result.homeTeam === teamName ? result.homeManager : result.awayManager) : teamName;
            
            // Calculate points, wins, draws, losses from results
            let points = 0, wins = 0, draws = 0, losses = 0;
            let gwPoints = 0;
            
            results.forEach(result => {
                if (result.homeTeam === teamName || result.awayTeam === teamName) {
                    const isHome = result.homeTeam === teamName;
                    const teamScore = isHome ? result.homeScore : result.awayScore;
                    const opponentScore = isHome ? result.awayScore : result.homeScore;
                    
                    // Add GW points
                    gwPoints += teamScore || 0;
                    
                    // Calculate league points (3 for win, 1 for draw, 0 for loss)
                    if (teamScore > opponentScore) {
                        points += 3;
                        wins += 1;
                    } else if (teamScore === opponentScore) {
                        points += 1;
                        draws += 1;
                    } else {
                        losses += 1;
                    }
                }
            });
            
            return {
                position: 0, // Will be set by sorting
                teamName: teamName,
                manager: manager,
                points: points,
                wins: wins,
                draws: draws,
                losses: losses,
                gwPoints: gwPoints,
                form: 'N/A' // Will be updated when we have form data
            };
        });
        
        // Sort by points (highest first), then by goal difference
        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.gwPoints - a.gwPoints;
        });
        
        // Set positions
        standings.forEach((standing, index) => {
            standing.position = index + 1;
        });
        
        console.log('📊 Created standings from results:', standings.length, 'teams');
        return standings;
    }

    processDraftData(draftData, standingsData) {
        // Convert draft data to the expected format
        if (!Array.isArray(draftData) || draftData.length === 0) {
            console.warn('No draft data available');
            return { teams: [] };
        }
        
        console.log('📝 processDraftData called with:');
        console.log('📝 draftData length:', draftData.length);
        console.log('📝 standingsData length:', standingsData ? standingsData.length : 'undefined');
        console.log('📝 standingsData sample:', standingsData ? standingsData[0] : 'undefined');
        
        const teamMap = {};
        
        // First, get manager names from standings if available
        const managerLookup = {};
        if (Array.isArray(standingsData)) {
            standingsData.forEach(standing => {
                console.log('📝 Processing standing:', standing);
                if (standing.Manager && standing['Team Name']) {
                    managerLookup[standing.Manager] = standing['Team Name'];
                    console.log(`📝 Added manager lookup: ${standing.Manager} -> ${standing['Team Name']}`);
                } else if (standing.manager && standing.teamName) {
                    // Handle lowercase property names
                    managerLookup[standing.manager] = standing.teamName;
                    console.log(`📝 Added manager lookup (lowercase): ${standing.manager} -> ${standing.teamName}`);
                }
            });
        }
        
        console.log('📝 Final managerLookup:', managerLookup);
        
        // Process draft data - handle different formats
        draftData.forEach(pick => {
            console.log('📝 Processing draft pick:', pick);
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
                    console.log(`📝 Added player ${player.trim()} to team ${teamName} (manager: ${managerName})`);
                }
            });
        });

        const teams = Object.values(teamMap);
        console.log('📝 Processed draft teams:', teams.length);
        console.log('📝 Final teams:', teams);
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
        
        console.log('⚽ processPlayerData called with:', Object.keys(gwData));
        
        // Look for player data files (players_gw1, players_gw2, etc.)
        Object.keys(gwData).forEach(key => {
            if (key.startsWith('players_gw')) {
                const gameweek = key.replace('players_gw', '');
                const players = gwData[key] || [];
                
                console.log(`⚽ Found ${players.length} players for ${key}`);
                
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
        
        const result = Object.values(allPlayers);
        console.log(`⚽ processPlayerData returning ${result.length} players`);
        return result;
    }

    mergeStandingsWithDraft(standings, draftTeams) {
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
            if (data.playerData && data.playerData.length > 0) {
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

    setCurrentGameweek(gameweek) {
        this.currentGameweek = gameweek;
    }

    getCurrentGameweekData() {
        const gameweek = `gw${this.currentGameweek}`;
        const rawData = this.gameweekData.get(gameweek);
        
        if (!rawData) {
            console.warn(`No raw data found for ${gameweek}`);
            return null;
        }
        
        // Create standings from results if no standings data exists
        const finalResults = this.processFinalResultsData(rawData.final_results_gw1 || rawData.final_results_gw2 || []);
        const partialResults = this.processPartialResultsData(rawData.partial_results_gw1 || rawData.partial_results_gw2 || []);
        const standings = this.createStandingsFromResults(finalResults, partialResults);
        
        // Return the processed data structure that the dashboard expects
        return {
            fixtures: this.parseFixturesData(rawData.fixture_list || []),
            standings: standings,
            draft: {
                teams: this.mergeStandingsWithDraft(
                    standings,
                    this.processDraftData(rawData.starting_draft || [], standings).teams
                ),
                originalDraftTeams: this.processDraftData(rawData.starting_draft || [], standings).teams
            },
            plFixtures: this.parsePLFixtures(rawData[`pl_gw${gameweek.replace('gw', '')}`] || []),
            transferHistory: rawData.transfer_history || { waivers: [], freeAgents: [], trades: [] },
            finalResults: this.processFinalResultsData(rawData.final_results_gw1 || rawData.final_results_gw2 || []),
            partialResults: this.processPartialResultsData(rawData.partial_results_gw1 || rawData.partial_results_gw2 || []),
            playerData: this.processPlayerData(rawData),
            timestamp: new Date().toISOString()
        };
    }

    getGameweekData(gameweek) {
        const gwKey = `gw${gameweek}`;
        return this.gameweekData.get(gwKey);
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
            const data = this.gameweekData.get(gameweek);
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
            const data = this.gameweekData.get(gameweek);
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
