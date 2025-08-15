
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
            } else {
                console.warn('⚠️ No gameweek data found');
            }
        } catch (error) {
            console.error('❌ Failed to initialize data manager:', error);
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
        for (let gw = 1; gw <= 5; gw++) { // Only check first 5 to avoid too many requests
            const gwData = await this.loadJSONFile(`./data/gw${gw}.json`);
            if (gwData) {
                availableGameweeks.push(`gw${gw}`);
                console.log(`✓ Found gameweek ${gw}`);
            }
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
        const processedData = {
            fixtures: this.parseFixturesData(gwData.fixture_list || []),
            standings: gwData.standings || [],
            draft: this.processDraftData(gwData.starting_draft || [], gwData.standings || []),
            plFixtures: this.parsePLFixtures(gwData.pl_gw1 || gwData.pl_gw2 || []),
            transferHistory: gwData.transfer_history || { waivers: [], freeAgents: [], trades: [] },
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
            
            possibleManagers.forEach(managerKey => {
                const player = pick[managerKey];
                if (player && player.trim()) {
                    if (!teamMap[managerKey]) {
                        teamMap[managerKey] = {
                            manager: managerKey,
                            teamName: managerLookup[managerKey] || `${managerKey}'s Team`,
                            draftPicks: []
                        };
                    }
                    teamMap[managerKey].draftPicks.push(player.trim());
                }
            });
        });

        const teams = Object.values(teamMap);
        console.log('📝 Processed draft teams:', teams.length);
        return { teams };
    }

    getCurrentGameweek() {
        return this.currentGameweek;
    }

    async getCurrentGameweekData() {
        const gameweek = `gw${this.currentGameweek}`;
        if (!this.gameweekData.has(gameweek)) {
            await this.loadGameweekData(gameweek);
        }
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
}
