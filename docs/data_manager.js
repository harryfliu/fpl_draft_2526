// FPL Data Manager - Auto-detects and loads data from gameweek folders

class FPLDataManager {
    constructor() {
        this.availableGameweeks = [];
        this.gameweekData = new Map(); // gw1, gw2, gw3, etc.
        this.currentGameweek = 1; // Default
        this.dataLoaded = false;
        this.csvCache = new Map(); // Cache CSV content
    }

    // Initialize the data manager
    async initialize() {
        console.log('🔍 Initializing FPL Data Manager...');
        
        try {
            // Detect available gameweek folders
            await this.detectGameweekFolders();
            
            // Load data from all available gameweeks
            await this.loadAllGameweekData();
            
            // Set current gameweek based on folder structure
            const detectedGameweek = this.getCurrentGameweek();
            this.setCurrentGameweek(detectedGameweek);
            
            this.dataLoaded = true;
            console.log('✅ Data Manager initialized successfully');
            console.log(`🎯 Current gameweek detected: ${detectedGameweek}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error initializing Data Manager:', error);
            return false;
        }
    }

    // Detect available gameweek folders
    async detectGameweekFolders() {
        console.log('📁 Detecting gameweek folders...');
        
        // Since we're in a local environment, we know gw1 exists
        // In a real web environment, this would scan the filesystem
        // For now, we'll check if we can access the files we know exist
        
        try {
            // Check if gw1 exists by trying to read a file
            const response = await fetch('./gw1/starting_draft.csv');
            if (response.ok) {
                this.availableGameweeks.push('gw1');
                console.log('✅ Found data in gw1');
            } else {
                console.log('❌ Could not access gw1/starting_draft.csv');
            }
        } catch (error) {
            console.log('❌ Error accessing gw1:', error);
        }
        
        // Also check for other potential gameweeks
        const possibleGameweeks = ['gw2', 'gw3', 'gw4', 'gw5'];
        
        for (const gw of possibleGameweeks) {
            try {
                const response = await fetch(`./${gw}/starting_draft.csv`);
                if (response.ok) {
                    this.availableGameweeks.push(gw);
                    console.log(`✅ Found data in ${gw}`);
                } else {
                    console.log(`ℹ️ No data in ${gw}`);
                }
            } catch (error) {
                console.log(`ℹ️ No data in ${gw}`);
            }
        }
        
        console.log(`📊 Available gameweeks: ${this.availableGameweeks.join(', ')}`);
        
        // If no gameweeks were found, but we know gw1 should exist, add it manually
        if (this.availableGameweeks.length === 0) {
            console.log('⚠️ No gameweeks detected via fetch, but gw1 should exist. Adding manually.');
            this.availableGameweeks.push('gw1');
        }
    }

    // Check if a gameweek folder has data
    async checkGameweekFolder(gameweek) {
        // For now, we'll assume the folders exist
        // In a real implementation, this would check the filesystem
        return true;
    }

    // Load data from all available gameweeks
    async loadAllGameweekData() {
        console.log('📥 Loading data from all gameweeks...');
        
        for (const gameweek of this.availableGameweeks) {
            try {
                await this.loadGameweekData(gameweek);
            } catch (error) {
                console.error(`❌ Error loading ${gameweek}:`, error);
            }
        }
    }

    // Load data from a specific gameweek
    async loadGameweekData(gameweek) {
        console.log(`📥 Loading data from ${gameweek}...`);
        
        try {
            // Load the main data files plus Premier League fixtures and transfer history with correct relative paths
            const [fixtures, standings, draft, plFixtures, transferHistory, partialResults, players] = await Promise.all([
                this.loadCSVFile(`./${gameweek}/fixture_list.csv`),
                this.loadCSVFile(`./${gameweek}/standings.csv`),
                this.loadCSVFile(`./${gameweek}/starting_draft.csv`),
                this.loadPLFixtures(gameweek.replace('gw', '')),
                this.loadTransferHistory(gameweek),
                this.loadCSVFile(`./${gameweek}/partial_results_gw1.csv`),
                this.loadCSVFile(`./${gameweek}/players_partial_gw1.csv`)
            ]);
            
            // Parse standings data first
            const parsedStandings = this.parseStandingsData(standings);
            console.log(`📊 Parsed standings for ${gameweek}:`, parsedStandings);
            
            // Parse and store the data
            const parsedFixtures = this.parseFixturesData(fixtures);
            console.log(`🎯 STORING ${parsedFixtures.length} fixtures for ${gameweek}`);
            
            // Parse partial results
            const parsedPartialResults = this.parsePartialResultsData(partialResults);
            console.log(`🏆 Parsed partial results for ${gameweek}:`, parsedPartialResults);
            
            // Parse players data
            const parsedPlayers = this.parsePlayersData(players);
            console.log(`⚽ Parsed players data for ${gameweek}:`, parsedPlayers);
            
            this.gameweekData.set(gameweek, {
                fixtures: parsedFixtures,
                standings: parsedStandings,
                draft: this.parseDraftData(draft, parsedStandings),
                plFixtures: plFixtures,
                transferHistory: transferHistory,
                partialResults: parsedPartialResults,
                players: parsedPlayers,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Loaded ${gameweek} data successfully`);
            
        } catch (error) {
            console.error(`❌ Error loading ${gameweek} data:`, error);
            // Create empty data structure for missing gameweeks
            this.gameweekData.set(gameweek, {
                fixtures: [],
                standings: [],
                draft: null,
                plFixtures: [],
                transferHistory: { waivers: [], freeAgents: [], trades: [] },
                partialResults: [],
                timestamp: null
            });
        }
    }

    // Load a CSV file
    async loadCSVFile(filePath) {
        try {
            console.log(`🔍 Attempting to load: ${filePath}`);
            
            // Try to fetch the CSV file
            const response = await fetch(filePath);
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            console.log(`📄 Loaded ${csvText.length} characters from ${filePath}`);
            
            const parsedData = this.parseCSV(csvText);
            console.log(`✅ Parsed ${parsedData.data.length} rows from ${filePath}`);
            
            return {
                path: filePath,
                data: parsedData.data,
                originalText: csvText  // Preserve raw text for special parsing
            };
        } catch (error) {
            console.error(`❌ Error loading ${filePath}:`, error);
            return {
                path: filePath,
                data: []
            };
        }
    }

    // Parse CSV text into array of objects
    parseCSV(csvText) {
        if (!csvText || typeof csvText !== 'string') return { data: [] };
        
        console.log('🔍 Raw CSV text:', csvText);
        
        // Parse CSV properly handling quoted fields with newlines
        const lines = this.parseCSVLines(csvText);
        console.log('📋 Parsed lines:', lines);
        console.log('📋 First few lines in detail:');
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            console.log(`   Line ${i}: [${lines[i].length} columns]`, lines[i]);
        }
        
        if (lines.length < 2) return { data: [] };
        
        // Parse headers (first line)
        const headers = lines[0];
        console.log('📋 Headers:', headers);
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            if (row.length > 0) {
                const rowObj = {};
                headers.forEach((header, index) => {
                    rowObj[header] = row[index] || '';
                });
                data.push(rowObj);
            }
        }
        
        console.log('📊 Parsed CSV data:', data);
        return { data };
    }
    
    // Parse CSV text into lines, properly handling quoted fields with newlines
    parseCSVLines(csvText) {
        const lines = [];
        let currentLine = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < csvText.length) {
            const char = csvText[i];
            
            if (char === '"') {
                if (inQuotes && csvText[i + 1] === '"') {
                    // Escaped quote
                    currentField += '"';
                    i += 2; // Skip both quotes
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                currentLine.push(currentField.trim());
                currentField = '';
                i++;
            } else if (char === '\n' && !inQuotes) {
                // Line separator (only when not in quotes)
                currentLine.push(currentField.trim());
                if (currentLine.length > 0) {
                    lines.push(currentLine);
                }
                currentLine = [];
                currentField = '';
                i++;
            } else {
                currentField += char;
                i++;
            }
        }
        
        // Add the last field and line
        currentLine.push(currentField.trim());
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    // Parse fixtures data - special handling for this CSV format
    parseFixturesData(csvData) {
        console.log('🔍 parseFixturesData called with:', csvData);
        
        if (!csvData || !csvData.data || csvData.data.length === 0) {
            console.log('❌ No CSV data to parse');
            return [];
        }
        
        console.log('🚨 BYPASSING NORMAL CSV PARSING - USING RAW TEXT');
        
        // Get the raw CSV text instead of using the parsed data (which is wrong)
        const rawCsvText = csvData.csvText || csvData.originalText;
        if (!rawCsvText) {
            console.log('❌ No raw CSV text available');
            return [];
        }
        
        // Parse the raw CSV text using proper CSV parsing (handles quoted fields with newlines)
        const fixtures = [];
        const csvLines = this.parseCSVLines(rawCsvText);
        let currentGameweek = 1;
        
        console.log(`📊 Properly parsed CSV lines count: ${csvLines.length}`);
        
        for (let i = 0; i < csvLines.length; i++) {
            const lineData = csvLines[i];
            console.log(`📋 Processing CSV line ${i + 1}:`, lineData);
            
            // Check if this is a gameweek header line (3 columns: "Gameweek X", "", "")
            if (lineData.length >= 1 && lineData[0] && lineData[0].startsWith('Gameweek ')) {
                const match = lineData[0].match(/Gameweek (\d+)/);
                if (match) {
                    currentGameweek = parseInt(match[1]);
                    console.log(`🎯 Found gameweek header: GW${currentGameweek}`);
                }
                continue;
            }
            
            // Check if this is a fixture line (3 columns with "v" in middle)
            if (lineData.length === 3 && lineData[1] === 'v' && currentGameweek > 0) {
                console.log(`⚽ Found fixture line for GW${currentGameweek}`);
                
                const team1Text = lineData[0];
                const team2Text = lineData[2];
                
                console.log(`🏠 Team 1 text: "${team1Text}"`);
                console.log(`✈️ Team 2 text: "${team2Text}"`);
                
                if (team1Text && team2Text && team1Text.includes('\n') && team2Text.includes('\n')) {
                    const team1Lines = team1Text.split('\n');
                    const team2Lines = team2Text.split('\n');
                    
                    const team1 = team1Lines[0]?.trim();
                    const manager1 = team1Lines[1]?.trim();
                    const team2 = team2Lines[0]?.trim();
                    const manager2 = team2Lines[1]?.trim();
                    
                    if (team1 && manager1 && team2 && manager2) {
                        console.log(`✅ Parsed fixture: ${team1} vs ${team2} (GW${currentGameweek})`);
                        
                        fixtures.push({
                            homeTeam: team1,
                            awayTeam: team2,
                            homeManager: manager1,
                            awayManager: manager2,
                            date: 'TBD',
                            time: 'TBD',
                            venue: 'Home',
                            gameweek: currentGameweek
                        });
                    } else {
                        console.log(`❌ Missing team/manager data: ${team1}/${manager1} vs ${team2}/${manager2}`);
                    }
                } else {
                    console.log(`❌ Teams don't have manager info (no newlines)`);
                }
            } else {
                console.log(`❌ Not a fixture line: ${lineData.length} columns, middle="${lineData[1]}", GW=${currentGameweek}`);
            }
        }
        
        console.log(`📊 Final fixtures array (${fixtures.length} fixtures):`, fixtures);
        return fixtures;
    }

    // Parse standings data
    parseStandingsData(csvData) {
        if (!csvData || !csvData.data || csvData.data.length === 0) return [];
        
        console.log('🔍 Parsing standings data...');
        console.log('📊 Raw CSV data:', csvData.data);
        
        const standings = [];
        
        csvData.data.forEach((row, index) => {
            console.log(`📋 Processing row ${index + 1}:`, row);
            
            if (row['Team & Manager'] && row['Pts'] !== undefined) {
                const teamManagerText = row['Team & Manager'];
                console.log(`🏷️ Raw "Team & Manager" text: "${teamManagerText}"`);
                
                const points = parseInt(row['Pts']) || 0;
                const wins = parseInt(row['W']) || 0;
                const draws = parseInt(row['D']) || 0;
                const losses = parseInt(row['L']) || 0;
                
                // Parse team name and manager from semicolon-delimited string
                // Remove quotes and trim whitespace
                const cleanText = teamManagerText.replace(/^"|"$/g, '').trim();
                console.log(`🧹 Cleaned text: "${cleanText}"`);
                
                // Split by semicolon to separate team name and manager
                const parts = cleanText.split(';');
                console.log(`✂️ Split parts:`, parts);
                
                if (parts.length >= 2) {
                    const [teamName, manager] = parts.map(s => s.trim());
                    console.log(`✅ Extracted - Team: "${teamName}", Manager: "${manager}"`);
                    
                    if (teamName && manager) {
                        standings.push({
                            teamName,
                            manager,
                            points,
                            wins,
                            draws,
                            losses,
                            gameweek: this.extractGameweekFromFolder(csvData.path)
                        });
                        console.log(`✅ Added to standings: ${teamName} (${manager})`);
                    } else {
                        console.log(`❌ Missing team name or manager: teamName="${teamName}", manager="${manager}"`);
                    }
                } else {
                    console.log(`❌ Expected 2 parts after semicolon split, got ${parts.length}:`, parts);
                }
            } else {
                console.log(`❌ Row ${index + 1} missing required data:`, row);
            }
        });
        
        console.log('📊 Final standings array:', standings);
        return standings;
    }

    // Parse draft data
    parseDraftData(csvData, standingsData) {
        if (!csvData || !csvData.data || csvData.data.length === 0) return null;
        
        console.log('🔍 Parsing draft data...');
        console.log('📊 Raw draft CSV data:', csvData.data);
        
        const draftData = {
            teams: [],
            rounds: []
        };
        
        // Get team columns (skip 'Round' column)
        const columns = Object.keys(csvData.data[0] || {});
        console.log('📋 All columns:', columns);
        
        const teamColumns = columns.filter(col => col !== 'Round');
        console.log('🏈 Team columns (excluding Round):', teamColumns);
        
        // Initialize teams using column headers as team names
        teamColumns.forEach((teamName, index) => {
            console.log(`🏷️ Processing team column ${index + 1}: "${teamName}"`);
            
            const team = {
                position: index + 1,
                manager: '', // Will be filled from standings data
                teamName: teamName.trim(), // Use column header as team name
                draftPicks: [],
                points: 0,
                gwPoints: 0,
                form: 'L-L-L-L-L',
                totalWinnings: 0,
                wins: 0,
                draws: 0,
                losses: 0
            };
            
            console.log(`✅ Created team object:`, team);
            draftData.teams.push(team);
        });
        
        console.log('📊 All teams created:', draftData.teams);
        
        // Parse draft picks from each round
        csvData.data.forEach(row => {
            const round = row['Round'];
            if (round && !isNaN(round)) {
                const roundData = { round: parseInt(round), picks: {} };
                
                teamColumns.forEach(teamName => {
                    const pick = row[teamName];
                    if (pick && pick.trim()) {
                        roundData.picks[teamName] = pick.trim();
                        
                        // Add to team's draft picks
                        const team = draftData.teams.find(t => t.teamName === teamName.trim());
                        if (team) {
                            team.draftPicks.push(pick.trim());
                        }
                    }
                });
                
                draftData.rounds.push(roundData);
            }
        });
        
        // Merge draft data with standings data to get complete team information
        if (standingsData && standingsData.length > 0) {
            console.log('🔍 Merging draft data with standings data...');
            console.log('📊 Standings teams:', standingsData.map(s => `"${s.teamName}"`));
            console.log('🏈 Draft teams:', draftData.teams.map(t => `"${t.teamName}"`));
            
            draftData.teams.forEach(team => {
                console.log(`🔍 Looking for match for draft team: "${team.teamName}"`);
                
                // Try exact match first
                let standing = standingsData.find(s => s.teamName === team.teamName);
                
                // If no exact match, try case-insensitive match
                if (!standing) {
                    console.log(`⚠️ No exact match, trying case-insensitive...`);
                    standing = standingsData.find(s => s.teamName.toLowerCase() === team.teamName.toLowerCase());
                }
                
                // If still no match, try partial match
                if (!standing) {
                    console.log(`⚠️ No case-insensitive match, trying partial match...`);
                    standing = standingsData.find(s => 
                        s.teamName.toLowerCase().includes(team.teamName.toLowerCase()) ||
                        team.teamName.toLowerCase().includes(s.teamName.toLowerCase())
                    );
                }
                
                if (standing) {
                    console.log(`✅ Matched: "${team.teamName}" -> "${standing.manager}"`);
                    team.manager = standing.manager;
                    team.points = standing.points;
                    team.wins = standing.wins;
                    team.draws = standing.draws;
                    team.losses = standing.losses;
                } else {
                    console.log(`❌ No match found for: "${team.teamName}"`);
                    console.log(`🔍 Available standings teams:`, standingsData.map(s => `"${s.teamName}"`));
                    
                    // Show potential matches
                    const potentialMatches = standingsData.filter(s => 
                        s.teamName.toLowerCase().includes(team.teamName.toLowerCase().substring(0, 3)) ||
                        team.teamName.toLowerCase().includes(s.teamName.toLowerCase().substring(0, 3))
                    );
                    if (potentialMatches.length > 0) {
                        console.log(`💡 Potential partial matches:`, potentialMatches.map(s => `"${s.teamName}"`));
                    }
                }
            });
        } else {
            console.log('❌ No standings data available for merging');
        }
        
        console.log('📊 Final draft data:', draftData);
        return draftData;
    }

    // Extract gameweek number from folder path
    extractGameweekFromFolder(filePath) {
        const match = filePath.match(/gw(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // Get latest available gameweek
    getLatestGameweek() {
        if (this.availableGameweeks.length === 0) return 0;
        
        const gameweekNumbers = this.availableGameweeks
            .map(gw => parseInt(gw.replace('gw', '')))
            .filter(num => !isNaN(num));
        
        if (gameweekNumbers.length === 0) return 0;
        
        return Math.max(...gameweekNumbers);
    }

    // Get current gameweek based on folder structure
    getCurrentGameweek() {
        const availableNumbers = this.getAvailableGameweekNumbers();
        
        if (availableNumbers.length === 0) return 1;
        
        // If only gw1 exists, we're at GW1
        if (availableNumbers.length === 1 && availableNumbers[0] === 1) {
            return 1;
        }
        
        // If we have gw1 and gw2, we're at GW2
        // If we have gw1, gw2, gw3, we're at GW3
        // etc.
        return Math.max(...availableNumbers);
    }

    // Set current gameweek
    setCurrentGameweek(gameweek) {
        this.currentGameweek = gameweek;
        console.log(`🎯 Current gameweek set to: ${gameweek}`);
    }

    // Get data for current gameweek
    getCurrentGameweekData() {
        const gwKey = `gw${this.currentGameweek}`;
        const data = this.gameweekData.get(gwKey) || null;
        console.log(`🔍 getCurrentGameweekData() for ${gwKey}:`, data);
        if (data) {
            console.log(`🔍 Fixtures in returned data: ${data.fixtures?.length || 0}`);
        }
        return data;
    }

    // Get partial results for a specific gameweek
    getPartialResults(gameweek = null) {
        const targetGameweek = gameweek || this.currentGameweek;
        const gameweekData = this.gameweekData.get(`gw${targetGameweek}`);
        return gameweekData?.partialResults || [];
    }

    // Get all partial results across all gameweeks
    getAllPartialResults() {
        const allResults = [];
        for (const [gameweek, data] of this.gameweekData) {
            if (data.partialResults && data.partialResults.length > 0) {
                allResults.push(...data.partialResults);
            }
        }
        return allResults;
    }

    // Get players data for a specific gameweek
    getPlayers(gameweek = null) {
        if (gameweek) {
            const gwKey = `gw${gameweek}`;
            const gameweekData = this.gameweekData.get(gwKey);
            return gameweekData?.players || [];
        }
        // Return players from current gameweek
        const currentGWKey = `gw${this.currentGameweek}`;
        const currentGameweekData = this.gameweekData.get(currentGWKey);
        return currentGameweekData?.players || [];
    }

    // Get all players data across all loaded gameweeks
    getAllPlayers() {
        const allPlayers = [];
        for (const [gameweek, data] of this.gameweekData) {
            if (data.players && data.players.length > 0) {
                allPlayers.push(...data.players);
            }
        }
        return allPlayers;
    }

    // Get data for a specific gameweek
    getGameweekData(gameweek) {
        const gwKey = `gw${gameweek}`;
        return this.gameweekData.get(gwKey) || null;
    }

    // Get all available gameweek numbers
    getAvailableGameweekNumbers() {
        return this.availableGameweeks
            .map(gw => parseInt(gw.replace('gw', '')))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);
    }

    // Check if data is loaded
    isDataLoaded() {
        return this.dataLoaded;
    }

    // Get summary of loaded data
    getDataSummary() {
        const summary = {
            totalGameweeks: this.availableGameweeks.length,
            availableGameweeks: this.getAvailableGameweekNumbers(),
            currentGameweek: this.currentGameweek,
            dataLoaded: this.dataLoaded,
            lastUpdated: new Date().toISOString()
        };
        
        return summary;
    }

    // Refresh data from all gameweek folders
    async refreshData() {
        console.log('🔄 Refreshing data from gameweek folders...');
        this.gameweekData.clear();
        await this.loadAllGameweekData();
        console.log('✅ Data refresh complete');
    }

    // Parse Premier League fixtures data
    parsePLFixturesData(csvText) {
        console.log('🏆 Parsing Premier League fixtures data...');
        if (!csvText || typeof csvText !== 'string') {
            console.log('❌ No PL fixtures data provided');
            return [];
        }

        const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
        const fixtures = [];
        let currentDate = '';
        let lastDate = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this line is a date (contains day name and full date)
            if (line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/)) {
                currentDate = line;
                lastDate = line; // Keep track of the last date
                console.log(`📅 Found date: ${currentDate}`);
                continue;
            }

            // Check if this line is a time (format like "12:00" or "4:30")
            if (line.match(/^\d{1,2}:\d{2}$/)) {
                const time = line;
                const homeTeam = lines[i - 1]; // Previous line should be home team
                const awayTeam = lines[i + 1]; // Next line should be away team
                
                if (homeTeam && awayTeam && currentDate) {
                    fixtures.push({
                        date: currentDate,
                        time: time,
                        homeTeam: homeTeam.trim(),
                        awayTeam: awayTeam.trim()
                    });
                    console.log(`⚽ Added fixture: ${homeTeam} vs ${awayTeam} at ${time} on ${currentDate}`);
                }
                i++; // Skip the away team line since we've already processed it
            }
        }

        // Extract month from the last date for current month detection
        if (lastDate) {
            const monthMatch = lastDate.match(/(\w+) \d{4}/);
            if (monthMatch) {
                this.currentMonth = monthMatch[1];
                console.log(`📅 Detected current month: ${this.currentMonth}`);
            }
        }

        console.log(`✅ Parsed ${fixtures.length} Premier League fixtures`);
        return fixtures;
    }

    // Load Premier League fixtures for a specific gameweek
    async loadPLFixtures(gameweek) {
        try {
            console.log(`🏆 Loading Premier League fixtures for gameweek ${gameweek}...`);
            const response = await fetch(`./gw${gameweek}/pl_gw${gameweek}.csv`);
            if (!response.ok) {
                console.log(`❌ PL fixtures file not found for GW${gameweek}`);
                return [];
            }
            
            const csvText = await response.text();
            return this.parsePLFixturesData(csvText);
        } catch (error) {
            console.error(`❌ Error loading PL fixtures for GW${gameweek}:`, error);
            return [];
        }
    }

    // Load and parse transfer history
    async loadTransferHistory(gameweek) {
        try {
            console.log(`🔄 Loading transfer history for ${gameweek}...`);
            const response = await fetch(`./${gameweek}/transfer_history.csv`);
            if (!response.ok) {
                console.log(`❌ Transfer history file not found for ${gameweek}`);
                return { waivers: [], freeAgents: [], trades: [] };
            }
            
            const csvText = await response.text();
            return this.parseTransferHistoryData(csvText);
        } catch (error) {
            console.error(`❌ Error loading transfer history for ${gameweek}:`, error);
            return { waivers: [], freeAgents: [], trades: [] };
        }
    }

    // Parse transfer history CSV with three sections
    parseTransferHistoryData(csvText) {
        console.log('🔄 Parsing transfer history data...');
        
        const lines = csvText.trim().split('\n');
        const result = {
            waivers: [],
            freeAgents: [],
            trades: []
        };
        
        let currentSection = null;
        let headers = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Detect section headers
            if (line.includes('Waivers History')) {
                currentSection = 'waivers';
                continue;
            } else if (line.includes('Free Agents History')) {
                currentSection = 'freeAgents';
                continue;
            } else if (line.includes('Trades History')) {
                currentSection = 'trades';
                continue;
            }
            
            // Parse CSV line
            const fields = line.split(',').map(field => field.trim());
            
            // Check if this is a header row
            if (currentSection && (fields[0] === 'GW' || fields[0] === 'Offered By')) {
                headers = fields;
                continue;
            }
            
            // Skip "No transactions" messages
            if (line.includes('No waiver transactions') || line.includes('No trades have been made')) {
                continue;
            }
            
            // Parse data rows
            if (currentSection && headers.length > 0 && fields.length >= headers.length) {
                const rowObj = {};
                headers.forEach((header, index) => {
                    rowObj[header] = fields[index] || '';
                });
                
                // Only add rows with actual data (not empty or filler rows)
                if (rowObj.GW || rowObj['Offered By']) {
                    result[currentSection].push(rowObj);
                }
            }
        }
        
        console.log('📊 Parsed transfer history:', result);
        return result;
    }

    // Parse partial results data from the special CSV format
    parsePartialResultsData(csvData) {
        console.log('🏆 Parsing partial results data...');
        
        if (!csvData || !csvData.originalText) {
            console.log('❌ No partial results data to parse');
            return [];
        }
        
        const rawCsvText = csvData.originalText;
        const csvLines = this.parseCSVLines(rawCsvText);
        const results = [];
        
        console.log(`📊 Parsed ${csvLines.length} lines from partial results`);
        
        for (let i = 0; i < csvLines.length; i++) {
            const lineData = csvLines[i];
            console.log(`📋 Processing line ${i + 1}:`, lineData);
            
            // Skip empty lines
            if (lineData.length === 0 || (lineData.length === 1 && !lineData[0])) {
                continue;
            }
            
            // Check if this is a gameweek header line (e.g., "Gameweek 1 - Day 1")
            if (lineData.length >= 1 && lineData[0] && lineData[0].startsWith('Gameweek ')) {
                console.log(`🎯 Found gameweek header: ${lineData[0]}`);
                continue;
            }
            
            // Check if this is a result line (should have 3 columns: team1, score, team2)
            if (lineData.length >= 3 && lineData[1] && lineData[1].includes(' - ')) {
                console.log(`⚽ Found result line: ${lineData[1]}`);
                
                const team1Text = lineData[0];
                const scoreText = lineData[1];
                const team2Text = lineData[2];
                
                // Parse score (e.g., "4 - 0")
                const scoreMatch = scoreText.match(/(\d+)\s*-\s*(\d+)/);
                if (!scoreMatch) {
                    console.log(`❌ Could not parse score: ${scoreText}`);
                    continue;
                }
                
                const homeScore = parseInt(scoreMatch[1]);
                const awayScore = parseInt(scoreMatch[2]);
                
                // Parse team1 (home team)
                let homeTeam, homeManager;
                if (team1Text.includes('\n')) {
                    const team1Lines = team1Text.split('\n');
                    homeTeam = team1Lines[0]?.trim().replace(/^"|"$/g, '');
                    homeManager = team1Lines[1]?.trim().replace(/^"|"$/g, '');
                } else {
                    homeTeam = team1Text.trim().replace(/^"|"$/g, '');
                    homeManager = '';
                }
                
                // Parse team2 (away team)
                let awayTeam, awayManager;
                if (team2Text.includes('\n')) {
                    const team2Lines = team2Text.split('\n');
                    awayTeam = team2Lines[0]?.trim().replace(/^"|"$/g, '');
                    awayManager = team2Lines[1]?.trim().replace(/^"|"$/g, '');
                } else {
                    awayTeam = team2Text.trim().replace(/^"|"$/g, '');
                    awayManager = '';
                }
                
                if (homeTeam && awayTeam) {
                    const result = {
                        homeTeam,
                        homeManager,
                        awayTeam,
                        awayManager,
                        homeScore,
                        awayScore,
                        gameweek: 1, // Extract from filename or header
                        day: 1, // Extract from header if available
                        timestamp: new Date().toISOString()
                    };
                    
                    console.log(`✅ Parsed result: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);
                    results.push(result);
                } else {
                    console.log(`❌ Missing team names: home="${homeTeam}", away="${awayTeam}"`);
                }
            } else {
                console.log(`❌ Not a result line: ${lineData.length} columns, score="${lineData[1]}"`);
            }
        }
        
        console.log(`🏆 Final partial results array (${results.length} results):`, results);
        return results;
    }

    // Parse players data from the CSV format
    parsePlayersData(csvData) {
        console.log('⚽ Parsing players data...');
        
        if (!csvData || !csvData.data || csvData.data.length === 0) {
            console.log('❌ No players data to parse');
            return [];
        }
        
        const players = [];
        
        csvData.data.forEach((row, index) => {
            if (index === 0) return; // Skip header row
            
            const playerText = row.Player || row[0];
            const points = parseInt(row.PT || row[1]) || 0;
            
            if (!playerText) return;
            
            // Parse player name and team/position from the format:
            // "Player Name\nTEAMNAMEPOSITION"
            let playerName, teamName, position;
            
            if (playerText.includes('\n')) {
                const lines = playerText.split('\n');
                playerName = lines[0]?.trim().replace(/^"|"$/g, '');
                const teamPos = lines[1]?.trim().replace(/^"|"$/g, '');
                
                // Extract team name and position from TEAMNAMEPOSITION
                // Examples: BOUMID, LIVFWD, BOUDEF, BOUGKP
                if (teamPos) {
                    // Find the position suffix (last 3-4 characters)
                    const positionMatch = teamPos.match(/(MID|FWD|DEF|GKP)$/);
                    if (positionMatch) {
                        position = positionMatch[0];
                        teamName = teamPos.replace(position, '');
                    } else {
                        // Fallback if no position found
                        teamName = teamPos;
                        position = 'Unknown';
                    }
                }
            } else {
                playerName = playerText.trim().replace(/^"|"$/g, '');
                teamName = 'Unknown';
                position = 'Unknown';
            }
            
            if (playerName) {
                const player = {
                    name: playerName,
                    team: teamName,
                    position: position,
                    points: points,
                    originalText: playerText
                };
                
                players.push(player);
                console.log(`✅ Parsed player: ${playerName} (${teamName} ${position}) - ${points} pts`);
            }
        });
        
        console.log(`⚽ Final players array (${players.length} players):`, players);
        return players;
    }
}

// Export the data manager
window.FPLDataManager = FPLDataManager;

