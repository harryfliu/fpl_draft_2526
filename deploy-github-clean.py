#!/usr/bin/env python3
"""
Deploy FPL Dashboard to GitHub Pages
Creates a public web version of your dashboard
"""

import os
import json
import shutil
import csv
from io import StringIO

def create_github_pages():
    """Convert dashboard for GitHub Pages deployment"""
    
    # Create docs folder (GitHub Pages source)
    docs_path = "./docs"
    if os.path.exists(docs_path):
        shutil.rmtree(docs_path)
    os.makedirs(docs_path)
    
    # Copy main files (EXCEPT data_manager.js - we'll create a web version)
    files_to_copy = ['index.html', 'script.js']
    for file in files_to_copy:
        if os.path.exists(file):
            shutil.copy2(file, docs_path)
    
    # Convert CSV data to JSON for web compatibility
    convert_data_to_json(docs_path)
    
    # Create web-optimized data_manager.js for GitHub Pages
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
                    elif file_key.startswith('partial_results_gw'):
                        gw_data[file_key] = parse_partial_results_csv(csv_path, file_key)
                    elif file_key == 'players_partial_gw1':
                        gw_data[file_key] = parse_players_partial_csv(csv_path)
                    elif file_key.startswith('players_gw'):
                        gw_data[file_key] = parse_players_gw_csv(csv_path)
                    elif file_key.startswith('final_results_gw'):
                        gw_data[file_key] = parse_final_results_csv(csv_path)
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
            
            # Copy ai_summary markdown files to docs folder for web access
            ai_summary_file = os.path.join(folder, f"ai_summary_{folder}.md")
            if os.path.exists(ai_summary_file):
                # Create gameweek folder in docs
                gw_docs_path = os.path.join(docs_path, folder)
                os.makedirs(gw_docs_path, exist_ok=True)
                
                # Copy the ai_summary file
                docs_ai_summary_path = os.path.join(gw_docs_path, f"ai_summary_{folder}.md")
                shutil.copy2(ai_summary_file, docs_ai_summary_path)
                print(f"✓ Copied {ai_summary_file} to docs")

def parse_draft_csv(csv_path):
    """Parse starting_draft.csv with proper handling"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            return list(reader)
    except Exception as e:
        print(f"⚠️ Error parsing draft CSV: {e}")
        return []

def parse_standings_csv(csv_path):
    """Parse standings.csv with semicolon delimiter handling"""
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

def parse_partial_results_csv(csv_path, file_key):
    """Parse partial_results_gw#.csv with the specific format"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            content = csvfile.read()
            
        results = []
        
        # Skip the first line (Gameweek header)
        lines = content.strip().split('\n')
        if lines and 'Gameweek' in lines[0]:
            lines = lines[1:]
        
        # Parse the CSV content properly handling multi-line quoted fields
        csv_reader = csv.reader(StringIO('\n'.join(lines)), quotechar='"', delimiter=',')
        
        for row in csv_reader:
            if len(row) >= 3:
                # Extract team names and scores
                home_info = row[0].strip('"')
                score_info = row[1].strip()
                away_info = row[2].strip('"')
                
                # Skip empty or invalid lines
                if not home_info or not score_info or not away_info:
                    continue
                
                # Parse score (format: "X - Y")
                if ' - ' in score_info:
                    score_parts = score_info.split(' - ')
                    if len(score_parts) == 2:
                        try:
                            home_score = int(score_parts[0].strip())
                            away_score = int(score_parts[1].strip())
                        except ValueError:
                            continue  # Skip if scores aren't valid numbers
                        
                        # Extract team names (first line before newline)
                        home_team = home_info.split('\n')[0].strip()
                        away_team = away_info.split('\n')[0].strip()
                        
                        # Extract manager names (second line after newline)
                        home_manager = home_info.split('\n')[1].strip() if '\n' in home_info else home_team
                        away_manager = away_info.split('\n')[1].strip() if '\n' in away_info else away_team
                        
                        # Extract gameweek number from file key (e.g., "partial_results_gw2" -> 2)
                        gameweek_num = int(file_key.replace('partial_results_gw', ''))
                        
                        results.append({
                            'gameweek': gameweek_num,
                            'day': 1,  # Default to day 1
                            'homeTeam': home_team,
                            'homeManager': home_manager,
                            'homeScore': home_score,
                            'awayTeam': away_team,
                            'awayManager': away_manager,
                            'awayScore': away_score
                        })
        
        print(f"🏆 Parsed {len(results)} partial results from {csv_path}")
        return results
    except Exception as e:
        print(f"⚠️ Error parsing partial results CSV: {e}")
        return []

def parse_players_partial_csv(csv_path):
    """Parse players_partial_gw1.csv with player performance data"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            players = list(reader)
        
        # Convert to expected format
        formatted_players = []
        for player in players:
            formatted_players.append({
                'name': player.get('Name', ''),
                'team': player.get('Team', ''),
                'position': player.get('Position', ''),
                'points': int(player.get('Points', 0)) if player.get('Points', '').isdigit() else 0
            })
        
        print(f"⚽ Parsed {len(formatted_players)} player performances from {csv_path}")
        return formatted_players
    except Exception as e:
        print(f"⚠️ Error parsing players partial CSV: {e}")
        return []

def parse_players_gw_csv(csv_path):
    """Parse players_gw#.csv with concatenated name/team/position in the first column"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            players = []
            headers = None
            
            for i, row in enumerate(reader):
                if i == 0:
                    # First row contains headers
                    headers = row
                    continue
                    
                if row and len(row) > 0:
                    # First column contains concatenated name|team|position
                    first_col = row[0].strip()
                    
                    # Split by common separators (try different approaches)
                    if '|' in first_col:
                        parts = first_col.split('|')
                    elif ' - ' in first_col:
                        parts = first_col.split(' - ')
                    else:
                        # Try to extract using team names as reference
                        parts = extract_player_info(first_col)
                    
                    if len(parts) >= 3:
                        player_name = parts[0].strip()
                        player_team = parts[1].strip()
                        player_position = parts[2].strip()
                        
                        # Parse the rest of the columns
                        player_data = {
                            'name': player_name,
                            'team': player_team,
                            'position': player_position
                        }
                        
                        # Add other columns based on headers
                        for j, header in enumerate(headers):
                            if j > 0 and j < len(row):  # Skip first column, add others
                                value = row[j].strip()
                                # Try to convert numeric values
                                if value.replace('.', '').replace('-', '').isdigit():
                                    player_data[header] = float(value) if '.' in value else int(value)
                                else:
                                    player_data[header] = value
                        
                        players.append(player_data)
            
            print(f"⚽ Parsed {len(players)} player performances from {csv_path}")
            return players
    except Exception as e:
        print(f"⚠️ Error parsing players GW CSV: {e}")
        return []

def parse_final_results_csv(csv_path):
    """Parse final_results_gw#.csv with clean final scores"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.reader(csvfile)
            results = []
            
            for i, row in enumerate(reader):
                if i == 0:
                    # Skip header row (Gameweek X - Day Y)
                    continue
                    
                if row and len(row) >= 3:
                    # Extract team names and scores
                    home_team = row[0].strip().strip('"')
                    score = row[1].strip()
                    away_team = row[2].strip().strip('"')
                    
                    # Parse score (format: "31 - 39")
                    if ' - ' in score:
                        home_score, away_score = score.split(' - ')
                        home_score = int(home_score.strip())
                        away_score = int(away_score.strip())
                        
                        # Parse team names (multi-line format: "Team Name\nManager Name")
                        home_team_name, home_manager = home_team.split('\n') if '\n' in home_team else (home_team, '')
                        away_team_name, away_manager = away_team.split('\n') if '\n' in away_team else (away_team, '')
                        
                        result = {
                            'homeTeam': home_team_name.strip(),
                            'homeManager': home_manager.strip(),
                            'awayTeam': away_team_name.strip(),
                            'awayManager': away_manager.strip(),
                            'homeScore': home_score,
                            'awayScore': away_score,
                            'gameweek': int(csv_path.split('gw')[1].split('/')[0]),
                            'isFinal': True
                        }
                        
                        results.append(result)
            
            print(f"🏆 Parsed {len(results)} final results from {csv_path}")
            return results
    except Exception as e:
        print(f"⚠️ Error parsing final results CSV: {e}")
        return []

def extract_player_info(concatenated_string):
    """Extract player name, team, and position from concatenated string"""
    # List of Premier League teams for reference (including common abbreviations)
    premier_league_teams = [
        'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion',
        'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Leeds United',
        'Liverpool', 'Manchester City', 'Man City', 'Manchester United', 'Man United', 'Man Utd',
        'Newcastle United', 'Newcastle', 'Nottingham Forest', 'Nott\'m Forest',
        'Sunderland', 'Tottenham Hotspur', 'Tottenham', 'Spurs', 'West Ham United', 
        'West Ham', 'Wolverhampton Wanderers', 'Wolves'
    ]
    
    # Team name normalization mapping
    team_mapping = {
        'Man City': 'Manchester City',
        'Man United': 'Manchester United',
        'Man Utd': 'Manchester United',
        'Newcastle': 'Newcastle United',
        'Nott\'m Forest': 'Nottingham Forest',
        'Tottenham': 'Tottenham Hotspur',
        'Spurs': 'Tottenham Hotspur',
        'West Ham': 'West Ham United',
        'Wolves': 'Wolverhampton Wanderers',
        'Brighton': 'Brighton & Hove Albion'
    }
    
    # List of positions - handle both GK and GKP
    positions = ['FWD', 'MID', 'DEF', 'GKP', 'GK']
    
    # Try to find team name in the string
    found_team = None
    for team in premier_league_teams:
        if team in concatenated_string:
            found_team = team
            break
    
    # Try to find position in the string
    found_position = None
    for pos in positions:
        if pos in concatenated_string:
            found_position = pos
            break
    
    # Normalize GK to GKP for consistency
    if found_position == 'GK':
        found_position = 'GKP'
    
    if found_team and found_position:
        # Extract player name (everything before the team name)
        team_start = concatenated_string.find(found_team)
        player_name = concatenated_string[:team_start].strip()
        
        # Normalize team name using mapping
        normalized_team = team_mapping.get(found_team, found_team)
        
        # Extract position
        position = found_position
        
        return [player_name, normalized_team, position]
    
    # Fallback: return as-is
    return [concatenated_string, 'Unknown Team', 'Unknown Position']

def update_data_manager_for_web(docs_path):
    """Update data manager to load from JSON instead of CSV"""
    
    # Detect available gameweeks from local folders
    available_gameweeks = []
    for folder in os.listdir('.'):
        if os.path.isdir(folder) and folder.startswith('gw'):
            available_gameweeks.append(folder)
    
    # Sort gameweeks numerically
    available_gameweeks.sort(key=lambda x: int(x[2:]) if x[2:].isdigit() else 0)
    
    # Create JavaScript array for available gameweeks
    gameweek_list = '[' + ', '.join([f"'{gw}'" for gw in available_gameweeks]) + ']'
    
    print(f"📁 Detected gameweeks for web: {available_gameweeks}")
    
    # Create a simplified web version that loads JSON data
    web_content = f'''// GitHub Pages Data Manager - Loads from JSON instead of CSV
class FPLDataManager {{
    constructor() {{
        this.gameweekData = new Map();
        this.currentGameweek = 1;
        this.currentMonth = 'August';
    }}

    async initialize() {{
        console.log('🔄 Initializing GitHub Pages data manager...');
        try {{
            const availableGameweeks = await this.detectGameweekFolders();
            console.log('📁 Available gameweeks:', availableGameweeks);
            
            if (availableGameweeks.length > 0) {{
                // Load data from all available gameweeks (like local version)
                await this.loadAllGameweekData();
                console.log('✅ Data manager initialized successfully');
                return true; // Return success
            }} else {{
                console.warn('⚠️ No gameweek data found');
                return false; // Return failure
            }}
        }} catch (error) {{
            console.error('❌ Failed to initialize data manager:', error);
            return false; // Return failure
        }}
    }}

    async loadJSONFile(path) {{
        try {{
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${{response.status}}`);
            return await response.json();
        }} catch (error) {{
            console.warn(`Failed to load ${{path}}:`, error);
            return null;
        }}
    }}

    async detectGameweekFolders() {{
        // For GitHub Pages, only check for gameweeks that actually exist
        const availableGameweeks = [];
        
        // Check for available gameweeks (only check what exists)
        // Since we're generating this from local data, we know what exists
        const gameweekList = {gameweek_list}; // Only check for gameweeks that actually exist
        
        for (const gw of gameweekList) {{
            const gwData = await this.loadJSONFile(`./data/${{gw}}.json`);
            if (gwData) {{
                availableGameweeks.push(gw);
                // Store the raw JSON data in gameweekData for processing
                this.gameweekData.set(gw, gwData);
                console.log(`✓ Found gameweek ${{gw}}`);
            }}
        }}
        
        // Set current gameweek to the highest available
        if (availableGameweeks.length > 0) {{
            const highestGW = Math.max(...availableGameweeks.map(gw => parseInt(gw.replace('gw', ''))));
            this.currentGameweek = highestGW;
            console.log(`🏆 Set current gameweek to ${{highestGW}}`);
        }}
        
        return availableGameweeks;
    }}

    async loadAllGameweekData() {{
        console.log('📥 Loading data from all gameweeks...');
        const availableGameweeks = Array.from(this.gameweekData.keys());
        
        for (const gameweek of availableGameweeks) {{
            await this.loadGameweekData(gameweek);
        }}
        console.log('✅ Loaded data from all gameweeks');
    }}

    async loadGameweekData(gameweek) {{
        console.log(`📊 Loading ${{gameweek}} data...`);
        const gwData = await this.loadJSONFile(`./data/${{gameweek}}.json`);
        if (!gwData) {{
            console.warn(`No data found for ${{gameweek}}`);
            return;
        }}

        // Process final results (prioritize over partial results) - dynamically for the specific gameweek
        const gameweekNum = gameweek.replace('gw', '');
        const finalResults = this.processFinalResultsData(gwData[`final_results_gw${{gameweekNum}}`] || []);
        
        // Process partial results for live data (fallback if no final results) - dynamically for the specific gameweek
        const partialResults = this.processPartialResultsData(gwData[`partial_results_gw${{gameweekNum}}`] || []);
        
        // Create standings from results if no standings data exists
        let standings = this.createStandingsFromResults(finalResults, partialResults);
        
        // If no standings created (no results yet), try to get standings from previous gameweek
        if (standings.length === 0) {{
            const gameweekNum = parseInt(gameweek.replace('gw', ''));
            if (gameweekNum > 1) {{
                const previousGameweek = `gw${{gameweekNum - 1}}`;
                const previousData = this.gameweekData.get(previousGameweek);
                if (previousData && previousData.standings && previousData.standings.length > 0) {{
                    console.log(`📊 Using standings from ${{previousGameweek}} for ${{gameweek}} (no results yet)`);
                    standings = previousData.standings;
                }}
            }}
        }}
        
        // Process draft data with the standings (either from results or previous gameweek)
        const draft = this.processDraftData(gwData.starting_draft || [], standings);
        
        // Process player performance data
        let playerData = this.processPlayerData(gwData);
        
        // If no player data for current gameweek, try to get it from previous gameweek
        if (playerData.length === 0) {{
            const gameweekNum = parseInt(gameweek.replace('gw', ''));
            if (gameweekNum > 1) {{
                const previousGameweek = `gw${{gameweekNum - 1}}`;
                const previousData = this.gameweekData.get(previousGameweek);
                if (previousData && previousData.playerData && previousData.playerData.length > 0) {{
                    console.log(`⚽ Using player data from ${{previousGameweek}} for ${{gameweek}} (no player data yet)`);
                    playerData = previousData.playerData;
                }}
            }}
        }}
        
        // Merge standings data with draft teams for complete leaderboard info
        const leaderboardTeams = this.mergeStandingsWithDraft(standings, draft.teams);
        
        const processedData = {{
            fixtures: this.parseFixturesData(gwData.fixture_list || []),
            standings: standings,
            draft: {{
                teams: leaderboardTeams,
                originalDraftTeams: draft.teams  // Keep original draft teams for draft picks display
            }},
            plFixtures: this.parsePLFixtures(gwData[`pl_gw${{gameweekNum}}`] || []),
            transferHistory: gwData.transfer_history || {{ waivers: [], freeAgents: [], trades: [] }},
            finalResults: finalResults,
            partialResults: partialResults,
            playerData: playerData,
            timestamp: new Date().toISOString()
        }};

        this.gameweekData.set(gameweek, processedData);
        console.log(`✅ Loaded ${{gameweek}} data:`, processedData);
    }}

    parseFixturesData(fixtureData) {{
        // Convert the fixture data to expected format
        if (!Array.isArray(fixtureData)) return [];
        
        return fixtureData.map(fixture => ({{
            gameweek: fixture.gameweek || 1,
            homeTeam: fixture.homeTeam || '',
            awayTeam: fixture.awayTeam || ''
        }}));
    }}

    parsePLFixtures(plData) {{
        // Convert PL fixtures to expected format
        if (!Array.isArray(plData)) return [];
        
        return plData.map(fixture => ({{
            date: fixture.date || '',
            time: fixture.time || '',
            homeTeam: fixture.homeTeam || '',
            awayTeam: fixture.awayTeam || ''
        }}));
    }}

    processStandingsData(standingsData) {{
        // Convert standings data to leaderboard format expected by script.js
        if (!Array.isArray(standingsData)) return [];
        
        return standingsData.map((standing, index) => ({{
            position: standing.Rank !== '-' ? parseInt(standing.Rank) : index + 1,
            teamName: standing['Team Name'] || '',
            manager: standing.Manager || '',
            firstName: (standing.Manager || '').split(' ')[0],
            points: parseInt(standing.Pts) || 0,
            wins: parseInt(standing.W) || 0,
            draws: parseInt(standing.D) || 0,
            losses: parseInt(standing.L) || 0,
            gwPoints: 0, // Will be updated when we have gameweek data
            form: 'N/A' // Will be updated when we have form data
        }}));
    }}

    createStandingsFromResults(finalResults, partialResults) {{
        // Create standings data from final results (prioritize) or partial results
        const results = finalResults.length > 0 ? finalResults : partialResults;
        
        if (results.length === 0) {{
            console.log('📊 No results data available for standings');
            return [];
        }}
        
        // Get unique teams from results
        const teams = new Set();
        results.forEach(result => {{
            teams.add(result.homeTeam);
            teams.add(result.awayTeam);
        }});
        
        // Create standings for each team
        const standings = Array.from(teams).map(teamName => {{
            // Find manager name from results
            const result = results.find(r => r.homeTeam === teamName || r.awayTeam === teamName);
            const managerName = result ? (result.homeTeam === teamName ? result.homeManager : result.awayManager) : '';
            
            let points = 0;
            let wins = 0;
            let draws = 0;
            let losses = 0;
            let gwPoints = 0;
            
            results.forEach(result => {{
                if (result.homeTeam === teamName || result.awayTeam === teamName) {{
                    const isHome = result.homeTeam === teamName;
                    const teamScore = isHome ? result.homeScore : result.awayScore;
                    const opponentScore = isHome ? result.awayScore : result.homeScore;
                    
                    // Add to gameweek points
                    gwPoints += teamScore;
                    
                    // Calculate league points (3 for win, 1 for draw, 0 for loss)
                    if (teamScore > opponentScore) {{
                        points += 3;
                        wins += 1;
                    }} else if (teamScore === opponentScore) {{
                        points += 1;
                        draws += 1;
                    }} else {{
                        losses += 1;
                    }}
                }}
            }});
            
            return {{
                position: 0, // Will be set by sorting
                teamName: teamName,
                manager: managerName,
                firstName: managerName.split(' ')[0],
                points: points,
                wins: wins,
                draws: draws,
                losses: losses,
                gwPoints: gwPoints,
                form: 'N/A' // Will be updated when we have form data
            }};
        }});
        
        // Sort by points (highest first), then by goal difference
        standings.sort((a, b) => {{
            if (b.points !== a.points) return b.points - a.points;
            return b.gwPoints - a.gwPoints;
        }});
        
        // Set positions
        standings.forEach((standing, index) => {{
            standing.position = index + 1;
        }});
        
        console.log('📊 Created standings from results:', standings.length, 'teams');
        return standings;
    }}

    processDraftData(draftData, standingsData) {{
        // Convert draft data to the expected format
        if (!Array.isArray(draftData) || draftData.length === 0) {{
            console.warn('No draft data available');
            return {{ teams: [] }};
        }}
        
        console.log('📝 processDraftData called with:');
        console.log('  - draftData:', draftData);
        console.log('  - standingsData:', standingsData);
        
        // Create a map of team names to their data
        const teamMap = {{}};
        
        // First, get manager names from standings if available
        const managerLookup = {{}};
        if (Array.isArray(standingsData)) {{
            standingsData.forEach(standing => {{
                console.log('📝 Processing standing:', standing);
                if (standing.Manager && standing['Team Name']) {{
                    managerLookup[standing.Manager] = standing['Team Name'];
                    console.log(`📝 Added manager lookup: ${{standing.Manager}} -> ${{standing['Team Name']}}`);
                }} else if (standing.manager && standing.teamName) {{
                    // Handle lowercase property names
                    managerLookup[standing.manager] = standing.teamName;
                    console.log(`📝 Added manager lookup (lowercase): ${{standing.manager}} -> ${{standing.teamName}}`);
                }}
            }});
        }}
        
        console.log('📝 Final managerLookup:', managerLookup);
        
        // Process draft data - handle different formats
        draftData.forEach(pick => {{
            console.log('📝 Processing draft pick:', pick);
            // Extract manager and player info from various possible formats
            const possibleManagers = Object.keys(pick).filter(key => 
                key !== 'Round' && 
                key !== 'Round Pts' && 
                key !== 'gameweek' && 
                key !== 'day' && 
                key !== 'homeTeam' && 
                key !== 'awayTeam' && 
                key !== 'homeScore' && 
                key !== 'awayScore' && 
                key !== 'homeManager' && 
                key !== 'awayManager'
            );
            
            possibleManagers.forEach(teamName => {{
                const player = pick[teamName];
                if (player && player.trim()) {{
                    // Find the manager for this team name
                    const managerName = Object.keys(managerLookup).find(manager => 
                        managerLookup[manager] === teamName
                    ) || teamName; // Fallback to team name if no manager found
                    
                    const firstName = managerName.split(' ')[0];
                    
                    if (!teamMap[teamName]) {{
                        teamMap[teamName] = {{
                            manager: managerName,
                            teamName: teamName,
                            firstName: firstName,
                            draftPicks: []
                        }};
                    }}
                    teamMap[teamName].draftPicks.push(player.trim());
                    console.log(`📝 Added player ${{player.trim()}} to team ${{teamName}} (manager: ${{managerName}})`);
                }}
            }});
        }});
        
        const teams = Object.values(teamMap);
        console.log('📝 Processed draft teams:', teams.length);
        console.log('📝 Final teams:', teams);
        return {{ teams }};
    }}

    processPartialResultsData(partialResultsData) {{
        // Process partial results data for live standings
        if (!Array.isArray(partialResultsData)) return [];
        
        return partialResultsData.map(result => ({{
            gameweek: result.gameweek || 1,
            day: result.day || 1,
            homeTeam: result.homeTeam || '',
            homeScore: parseInt(result.homeScore) || 0,
            awayTeam: result.awayTeam || '',
            awayScore: parseInt(result.awayScore) || 0,
            homeManager: result.homeManager || '',
            awayManager: result.awayManager || ''
        }}));
    }}

    processFinalResultsData(finalResultsData) {{
        // Process final results data for locked-in standings
        if (!Array.isArray(finalResultsData)) return [];
        
        return finalResultsData.map(result => ({{
            gameweek: result.gameweek || 1,
            homeTeam: result.homeTeam || '',
            homeScore: parseInt(result.homeScore) || 0,
            awayTeam: result.awayTeam || '',
            awayScore: parseInt(result.awayScore) || 0,
            homeManager: result.homeManager || '',
            awayManager: result.awayManager || '',
            isFinal: true
        }}));
    }}

    processPlayerData(gwData) {{
        // Process all player performance data from different gameweeks
        const allPlayers = {{}};
        
        console.log('⚽ processPlayerData called with:', Object.keys(gwData));
        
        // Look for player data files (players_gw1, players_gw2, etc.)
        Object.keys(gwData).forEach(key => {{
            if (key.startsWith('players_gw')) {{
                const gameweek = key.replace('players_gw', '');
                const players = gwData[key] || [];
                
                console.log(`⚽ Found ${{players.length}} players for ${{key}}`);
                
                players.forEach(player => {{
                    const playerKey = `${{player.name}}_${{player.team}}`;
                    if (!allPlayers[playerKey]) {{
                        allPlayers[playerKey] = {{
                            name: player.name,
                            team: player.team,
                            position: player.position,
                            cost: player.Cost || 0,  // Add cost property for analytics
                            gameweeks: {{}},
                            totalPoints: 0,
                            bestGameweek: null,
                            worstGameweek: null
                        }};
                    }}
                    
                    // Add gameweek data - handle JSON property names
                    const playerPoints = player.Pts || player.points || 0;
                    const roundPts = player['Round Pts'] || player.roundPts || playerPoints;
                    
                    allPlayers[playerKey].gameweeks[gameweek] = {{
                        points: playerPoints,
                        roundPts: roundPts,
                        otherStats: player
                    }};
                    
                    // Update totals
                    allPlayers[playerKey].totalPoints += playerPoints;
                    
                    // Track best/worst gameweeks
                    if (!allPlayers[playerKey].bestGameweek || 
                        playerPoints > allPlayers[playerKey].gameweeks[allPlayers[playerKey].bestGameweek].points) {{
                        allPlayers[playerKey].bestGameweek = gameweek;
                    }}
                    
                    if (!allPlayers[playerKey].worstGameweek || 
                        playerPoints < allPlayers[playerKey].gameweeks[allPlayers[playerKey].worstGameweek].points) {{
                        allPlayers[playerKey].worstGameweek = gameweek;
                    }}
                }});
            }}
        }});
        
        const result = Object.values(allPlayers);
        console.log(`⚽ processPlayerData returning ${{result.length}} players`);
        return result;
    }}

    mergeStandingsWithDraft(standings, draftTeams) {{
        // Merge standings data (which has leaderboard info) with draft teams (which has draft picks)
        const mergedTeams = standings.map(standing => {{
            // Find corresponding draft team by team name
            const draftTeam = draftTeams.find(team => team.teamName === standing.teamName);
            
            return {{
                position: standing.position,
                teamName: standing.teamName,
                manager: standing.manager,
                firstName: standing.firstName,
                points: standing.points,
                wins: standing.wins,
                draws: standing.draws,
                losses: standing.losses,
                gwPoints: standing.gwPoints,
                form: standing.form,
                draftPicks: draftTeam ? draftTeam.draftPicks : []
            }};
        }});
        
        console.log('🔗 Merged standings with draft data:', mergedTeams.length, 'teams');
        return mergedTeams;
    }}

    // Methods for player data access
    getAllPlayers() {{
        const allPlayers = [];
        for (const [gameweek, data] of this.gameweekData) {{
            if (data.playerData && data.playerData.length > 0) {{
                allPlayers.push(...data.playerData);
            }}
        }}
        return allPlayers;
    }}

    getPlayersByTeam(teamName) {{
        const allPlayers = this.getAllPlayers();
        return allPlayers.filter(player => player.team === teamName);
    }}

    getTopPerformers(limit = 10) {{
        const allPlayers = this.getAllPlayers();
        return allPlayers
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, limit);
    }}

    getPlayersByPosition(position) {{
        const allPlayers = this.getAllPlayers();
        return allPlayers.filter(player => player.position === position);
    }}

    getCurrentGameweek() {{
        return this.currentGameweek;
    }}

    setCurrentGameweek(gameweek) {{
        this.currentGameweek = gameweek;
    }}

    getCurrentGameweekData() {{
        const gameweek = `gw${{this.currentGameweek}}`;
        const rawData = this.gameweekData.get(gameweek);
        
        if (!rawData) {{
            console.warn(`No raw data found for ${{gameweek}}`);
            return null;
        }}
        
        // Create standings from results if no standings data exists
        const gameweekNum = this.currentGameweek;
        const finalResults = this.processFinalResultsData(rawData[`final_results_gw${{gameweekNum}}`] || []);
        const partialResults = this.processPartialResultsData(rawData[`partial_results_gw${{gameweekNum}}`] || []);
        const standings = this.createStandingsFromResults(finalResults, partialResults);
        
        // Return the processed data structure that the dashboard expects
        return {{
            fixtures: this.parseFixturesData(rawData.fixture_list || []),
            standings: standings,
            draft: {{
                teams: this.mergeStandingsWithDraft(
                    standings,
                    this.processDraftData(rawData.starting_draft || [], standings).teams
                ),
                originalDraftTeams: this.processDraftData(rawData.starting_draft || [], standings).teams
            }},
            plFixtures: this.parsePLFixtures(rawData[`pl_gw${{gameweekNum}}`] || []),
            transferHistory: rawData.transfer_history || {{ waivers: [], freeAgents: [], trades: [] }},
            finalResults: finalResults,
            partialResults: partialResults,
            playerData: this.processPlayerData(rawData),
            timestamp: new Date().toISOString()
        }};
    }}

    getGameweekData(gameweek) {{
        const gwKey = `gw${{gameweek}}`;
        return this.gameweekData.get(gwKey);
    }}

    getDataSummary() {{
        const availableGameweeks = Array.from(this.gameweekData.keys())
            .map(gw => parseInt(gw.replace('gw', '')))
            .sort((a, b) => a - b);

        return {{
            availableGameweeks: availableGameweeks,
            currentGameweek: this.currentGameweek,
            totalGameweeks: availableGameweeks.length
        }};
    }}

    isDataLoaded() {{
        return this.gameweekData.size > 0;
    }}

    getAvailableGameweekNumbers() {{
        return Array.from(this.gameweekData.keys())
            .map(gw => parseInt(gw.replace('gw', '')))
            .sort((a, b) => a - b);
    }}

    async loadGameweekDataIfNeeded(gameweek) {{
        const gwKey = `gw${{gameweek}}`;
        if (!this.gameweekData.has(gwKey)) {{
            await this.loadGameweekData(gwKey);
        }}
        return this.gameweekData.get(gwKey);
    }}

    // Methods needed for partial results functionality
    getAllPartialResults() {{
        const allResults = [];
        for (const [gameweek, data] of this.gameweekData) {{
            if (data.partialResults) {{
                allResults.push(...data.partialResults);
            }}
        }}
        return allResults;
    }}

    getPartialResults(gameweek = null) {{
        if (gameweek) {{
            const gwKey = `gw${{gameweek}}`;
            const data = this.gameweekData.get(gwKey);
            return data ? data.partialResults : [];
        }}
        return this.getAllPartialResults();
    }}

    // Methods for final results functionality
    getAllFinalResults() {{
        const allResults = [];
        for (const [gameweek, data] of this.gameweekData) {{
            if (data.finalResults) {{
                allResults.push(...data.finalResults);
            }}
        }}
        return allResults;
    }}

    getFinalResults(gameweek = null) {{
        if (gameweek) {{
            const gwKey = `gw${{gameweek}}`;
            const data = this.gameweekData.get(gwKey);
            return data ? data.finalResults : [];
        }}
        return this.getAllFinalResults();
    }}

    // Get results with final results taking priority over partial results
    getResults(gameweek = null) {{
        const finalResults = this.getFinalResults(gameweek);
        if (finalResults.length > 0) {{
            return finalResults; // Use final results if available
        }}
        return this.getPartialResults(gameweek); // Fallback to partial results
    }}
}}
'''
    
    # Save updated version
    with open(os.path.join(docs_path, 'data_manager.js'), 'w') as f:
        f.write(web_content)

if __name__ == "__main__":
    print("🌐 GitHub Pages Deployment Creator")
    print("=" * 40)
    create_github_pages()
