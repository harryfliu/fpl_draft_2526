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
    
    data_path = os.path.join(docs_path, "data")
    os.makedirs(data_path, exist_ok=True)
    
    # Process each gameweek folder
    for folder in os.listdir('.'):
        if os.path.isdir(folder) and folder.startswith('gw'):
            gw_data = {}
            
            # Convert each CSV to JSON
            for file in os.listdir(folder):
                if file.endswith('.csv'):
                    csv_path = os.path.join(folder, file)
                    file_key = file.replace('.csv', '')
                    
                    with open(csv_path, 'r') as csvfile:
                        reader = csv.DictReader(csvfile)
                        gw_data[file_key] = list(reader)
            
            # Save as JSON
            json_path = os.path.join(data_path, f"{folder}.json")
            with open(json_path, 'w') as jsonfile:
                json.dump(gw_data, jsonfile, indent=2)
            
            print(f"✓ Converted {folder}/ to JSON")

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
'''
    
    # Save updated version
    with open(os.path.join(docs_path, 'data_manager.js'), 'w') as f:
        f.write(web_content)

if __name__ == "__main__":
    print("🌐 GitHub Pages Deployment Creator")
    print("=" * 40)
    create_github_pages()
