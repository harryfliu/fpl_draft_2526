#!/usr/bin/env python3
"""
Deploy FPL Dashboard to GitHub Pages
Creates a public web version of your dashboard
"""

import os
import json
import shutil

def create_github_pages():
    """Convert dashboard for GitHub Pages deployment"""
    
    # Create docs folder (GitHub Pages source)
    docs_path = "./docs"
    if os.path.exists(docs_path):
        shutil.rmtree(docs_path)
    os.makedirs(docs_path)
    
    # Copy main files
    files_to_copy = ['index.html', 'script.js', 'data_manager.js']
    for file in files_to_copy:
        if os.path.exists(file):
            shutil.copy2(file, docs_path)
    
    # Convert CSV data to JSON for web compatibility
    convert_data_to_json(docs_path)
    
    # Update data_manager.js for GitHub Pages
    update_data_manager_for_web(docs_path)
    
    print("🌐 GitHub Pages version created in /docs")
    print("\n📋 Next steps:")
    print("1. Create GitHub repository")
    print("2. Push this code to GitHub")
    print("3. Enable GitHub Pages in repo settings")
    print("4. Set source to '/docs' folder")
    print("5. Your dashboard will be live at:")
    print("   https://[username].github.io/[repo-name]")

def convert_data_to_json(docs_path):
    """Convert CSV files to JSON for web access"""
    import csv
    import sys
    import os
    
    # Import the original data manager for proper CSV parsing
    sys.path.append('.')
    
    data_path = os.path.join(docs_path, "data")
    os.makedirs(data_path, exist_ok=True)
    
    # Process each gameweek folder
    for folder in os.listdir('.'):
        if os.path.isdir(folder) and folder.startswith('gw'):
            gw_data = {}
            
            # Process each CSV file with proper parsing
            for file in os.listdir(folder):
                if file.endswith('.csv'):
                    csv_path = os.path.join(folder, file)
                    file_key = file.replace('.csv', '')
                    
                    # Handle different CSV types with specific parsing
                    if file_key == 'starting_draft':
                        gw_data[file_key] = parse_draft_csv(csv_path)
                    elif file_key == 'standings':
                        gw_data[file_key] = parse_standings_csv(csv_path)
                    elif file_key == 'fixture_list':
                        gw_data[file_key] = parse_fixtures_csv(csv_path)
                    elif file_key == 'transfer_history':
                        gw_data[file_key] = parse_transfer_history_csv(csv_path)
                    elif file_key.startswith('pl_gw'):
                        gw_data[file_key] = parse_pl_fixtures_csv(csv_path)
                    else:
                        # Default CSV parsing
                        try:
                            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                                reader = csv.DictReader(csvfile)
                                gw_data[file_key] = list(reader)
                        except Exception as e:
                            print(f"⚠️ Error parsing {csv_path}: {e}")
                            gw_data[file_key] = []
            
            # Save as JSON
            json_path = os.path.join(data_path, f"{folder}.json")
            with open(json_path, 'w') as jsonfile:
                json.dump(gw_data, jsonfile, indent=2)
            
            print(f"✓ Converted {folder}/ to JSON")

def parse_draft_csv(csv_path):
    """Parse starting_draft.csv with proper handling"""
    import csv
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            return list(reader)
    except Exception as e:
        print(f"⚠️ Error parsing draft CSV: {e}")
        return []

def parse_standings_csv(csv_path):
    """Parse standings.csv with semicolon delimiter handling"""
    import csv
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            content = csvfile.read()
            lines = content.strip().split('\n')
            
            if not lines:
                return []
            
            # Get headers
            headers = [h.strip() for h in lines[0].split(',')]
            data = []
            
            for line in lines[1:]:
                if not line.strip():
                    continue
                    
                # Split by comma and handle quoted fields
                fields = []
                current_field = ""
                in_quotes = False
                
                for char in line:
                    if char == '"':
                        in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        fields.append(current_field.strip())
                        current_field = ""
                    else:
                        current_field += char
                
                fields.append(current_field.strip())
                
                # Create row object
                if len(fields) >= len(headers):
                    row = {}
                    for i, header in enumerate(headers):
                        value = fields[i] if i < len(fields) else ""
                        
                        # Handle "Team & Manager" column with semicolon
                        if header == "Team & Manager" and ';' in value:
                            team_name, manager_name = value.split(';', 1)
                            row['Team Name'] = team_name.strip()
                            row['Manager'] = manager_name.strip()
                        else:
                            row[header] = value.strip()
                    
                    data.append(row)
            
            return data
    except Exception as e:
        print(f"⚠️ Error parsing standings CSV: {e}")
        return []

def parse_fixtures_csv(csv_path):
    """Parse fixture_list.csv with multi-line quoted team names"""
    import csv
    try:
        fixtures = []
        current_gameweek = 1
        
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            
            for row in reader:
                if not row or not any(cell.strip() for cell in row):
                    continue
                
                # Check for gameweek header
                if len(row) >= 1 and row[0].startswith('Gameweek'):
                    import re
                    gw_match = re.search(r'Gameweek (\d+)', row[0])
                    if gw_match:
                        current_gameweek = int(gw_match.group(1))
                    continue
                
                # Parse fixture row (expecting: "Home Team\nManager", "v", "Away Team\nManager")
                if len(row) >= 3 and row[1].strip().lower() == 'v':
                    home_info = row[0].strip()
                    away_info = row[2].strip()
                    
                    # Extract team name (first line) from multi-line team info
                    home_team = home_info.split('\n')[0].strip() if '\n' in home_info else home_info
                    away_team = away_info.split('\n')[0].strip() if '\n' in away_info else away_info
                    
                    # Clean up quotes if present
                    home_team = home_team.strip('"').strip()
                    away_team = away_team.strip('"').strip()
                    
                    if home_team and away_team:
                        fixtures.append({
                            'gameweek': current_gameweek,
                            'homeTeam': home_team,
                            'awayTeam': away_team
                        })
        
        print(f"🏟️ Parsed {len(fixtures)} fixtures from {csv_path}")
        return fixtures
    except Exception as e:
        print(f"⚠️ Error parsing fixtures CSV: {e}")
        return []

def parse_transfer_history_csv(csv_path):
    """Parse transfer_history.csv with multiple sections"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            content = csvfile.read()
            
        result = {'waivers': [], 'freeAgents': [], 'trades': []}
        lines = content.strip().split('\n')
        current_section = None
        headers = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Section headers
            if 'Waivers History' in line:
                current_section = 'waivers'
                continue
            elif 'Free Agents History' in line:
                current_section = 'freeAgents'
                continue
            elif 'Trades History' in line:
                current_section = 'trades'
                continue
            
            # Skip "no transactions" lines
            if 'No waiver transactions' in line or 'No trades have been made' in line:
                continue
            
            # Parse data
            if current_section:
                fields = [f.strip() for f in line.split(',')]
                
                # Check if it's a header row
                if fields[0] in ['GW', 'Offered By']:
                    headers = fields
                    continue
                
                # Parse data row
                if headers and len(fields) >= len(headers):
                    row = {}
                    for i, header in enumerate(headers):
                        row[header] = fields[i] if i < len(fields) else ''
                    
                    if row.get('GW') or row.get('Offered By'):
                        result[current_section].append(row)
        
        return result
    except Exception as e:
        print(f"⚠️ Error parsing transfer history CSV: {e}")
        return {'waivers': [], 'freeAgents': [], 'trades': []}

def parse_pl_fixtures_csv(csv_path):
    """Parse Premier League fixtures CSV with 4-line format per fixture"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            content = csvfile.read()
            
        fixtures = []
        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        
        i = 0
        current_date = ""
        
        while i < len(lines):
            line = lines[i]
            
            # Check if line is a date
            if any(day in line for day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']):
                current_date = line
                i += 1
                continue
            
            # Parse 3-line fixture format: [Home Team], [Time], [Away Team]
            if i + 2 < len(lines):
                home_team = lines[i]
                time = lines[i + 1]
                away_team = lines[i + 2]
                
                # Validate that this looks like a fixture (time has colon)
                if ':' in time and home_team and away_team:
                    fixtures.append({
                        'date': current_date,
                        'time': time,
                        'homeTeam': home_team,
                        'awayTeam': away_team
                    })
                    i += 3  # Skip the 3 lines we just processed
                else:
                    i += 1  # Move to next line if not a valid fixture
            else:
                i += 1
        
        print(f"⚽ Parsed {len(fixtures)} PL fixtures from {csv_path}")
        return fixtures
    except Exception as e:
        print(f"⚠️ Error parsing PL fixtures CSV: {e}")
        return []

def update_data_manager_for_web(docs_path):
    """Update data manager to load from JSON instead of CSV"""
    
    # Read original data manager
    with open('data_manager.js', 'r') as f:
        content = f.read()
    
    # Create a simplified web version that loads JSON data
    web_content = '''
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
        
        // Merge standings data with draft teams for complete leaderboard info
        const leaderboardTeams = this.mergeStandingsWithDraft(standings, draft.teams);
        
        const processedData = {
            fixtures: this.parseFixturesData(gwData.fixture_list || []),
            standings: standings,
            draft: {
                teams: leaderboardTeams,
                originalDraftTeams: draft.teams  // Keep original draft teams for draft picks display
            },
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

    async loadGameweekDataIfNeeded(gameweek) {
        const gwKey = `gw${gameweek}`;
        if (!this.gameweekData.has(gwKey)) {
            await this.loadGameweekData(gwKey);
        }
        return this.gameweekData.get(gwKey);
    }
}
'''
    
    # Save updated version
    with open(os.path.join(docs_path, 'data_manager.js'), 'w') as f:
        f.write(web_content)

if __name__ == "__main__":
    print("🌐 GitHub Pages Deployment Creator")
    print("=" * 40)
    create_github_pages()
