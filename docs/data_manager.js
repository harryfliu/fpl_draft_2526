
// GitHub Pages Data Manager - Loads from JSON instead of CSV
class FPLDataManager {
    constructor() {
        this.gameweekData = new Map();
        this.currentGameweek = 1;
        this.currentMonth = 'August';
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
        for (let gw = 1; gw <= 38; gw++) {
            const gwData = await this.loadJSONFile(`./data/gw${gw}.json`);
            if (gwData) {
                availableGameweeks.push(`gw${gw}`);
            }
        }
        return availableGameweeks;
    }

    async loadGameweekData(gameweek) {
        const gwData = await this.loadJSONFile(`./data/${gameweek}.json`);
        if (!gwData) return;

        // Process the data similar to the original CSV version
        const processedData = {
            fixtures: gwData.fixture_list || [],
            standings: gwData.standings || [],
            draft: this.processDraftData(gwData.starting_draft || [], gwData.standings || []),
            plFixtures: gwData.pl_gw || [],
            transferHistory: gwData.transfer_history || { waivers: [], freeAgents: [], trades: [] },
            timestamp: new Date().toISOString()
        };

        this.gameweekData.set(gameweek, processedData);
        console.log(`📊 Loaded ${gameweek} data:`, processedData);
    }

    processDraftData(draftData, standingsData) {
        // Convert draft data to the expected format
        const teams = [];
        const teamMap = {};
        
        // Group draft picks by manager
        draftData.forEach(pick => {
            if (!teamMap[pick.Manager]) {
                teamMap[pick.Manager] = {
                    manager: pick.Manager,
                    teamName: pick['Team Name'] || `${pick.Manager}'s Team`,
                    draftPicks: []
                };
            }
            teamMap[pick.Manager].draftPicks.push(pick.Player || pick.Pick);
        });

        return { teams: Object.values(teamMap) };
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
