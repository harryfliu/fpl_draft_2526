#!/usr/bin/env python3
"""
FPL Dashboard Summary Generator

Automatically generates a comprehensive markdown summary when final_results_gw#.csv is provided.
This script pulls together all the data from the dashboard into a nicely formatted report.

Usage: python generate_summary.py gw1
"""

import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path
import re

class FPLSummaryGenerator:
    def __init__(self, gameweek):
        self.gameweek = gameweek
        self.gw_folder = f"gw{gameweek}"
        self.base_path = Path(".")
        
        # Data storage
        self.final_results = []
        self.partial_results = []
        self.draft_data = None
        self.transfer_history = []
        self.player_data = []
        self.fixtures = []
        
    def load_data(self):
        """Load all relevant data files"""
        print(f"🔄 Loading data for GW{self.gameweek}...")
        
        # Load final results
        final_results_file = self.base_path / self.gw_folder / f"final_results_gw{self.gameweek}.csv"
        if final_results_file.exists():
            self.final_results = self.parse_final_results(final_results_file)
            print(f"✅ Loaded {len(self.final_results)} final results")
        else:
            print(f"❌ No final results found: {final_results_file}")
            return False
            
        # Load draft data (after final results for manager names)
        draft_file = self.base_path / self.gw_folder / "starting_draft.csv"
        if draft_file.exists():
            self.draft_data = self.parse_draft_data(draft_file)
            print(f"✅ Loaded draft data with {len(self.draft_data.get('teams', []))} teams")
            
        # Load transfer history
        transfer_file = self.base_path / self.gw_folder / "transfer_history.csv"
        if transfer_file.exists():
            self.transfer_history = self.parse_transfer_history(transfer_file)
            print(f"✅ Loaded {len(self.transfer_history)} transfer records")
            
        # Load player data
        player_file = self.base_path / self.gw_folder / f"players_gw{self.gameweek}.csv"
        if player_file.exists():
            self.player_data = self.parse_player_data(player_file)
            print(f"✅ Loaded {len(self.player_data)} player records")
            
        # Load fixtures
        fixture_file = self.base_path / self.gw_folder / "fixture_list.csv"
        if fixture_file.exists():
            self.fixtures = self.parse_fixtures(fixture_file)
            print(f"✅ Loaded {len(self.fixtures)} fixtures")
            
        return True
        
    def parse_final_results(self, file_path):
        """Parse final_results_gw#.csv"""
        results = []
        current_gameweek_date = ''
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            
            for row in reader:
                if not row or len(row) == 0:
                    continue
                    
                # Check for gameweek header
                if row[0].startswith('Gameweek '):
                    current_gameweek_date = row[0]
                    continue
                    
                if len(row) >= 3:
                    home_team_manager = row[0].strip()
                    score = row[1].strip()
                    away_team_manager = row[2].strip()
                    
                    # Parse score
                    score_parts = score.split(' - ')
                    if len(score_parts) == 2:
                        home_score = int(score_parts[0])
                        away_score = int(score_parts[1])
                        
                        # Split team and manager (they're on separate lines in quotes)
                        home_parts = home_team_manager.split('\n')
                        away_parts = away_team_manager.split('\n')
                        
                        home_team = home_parts[0] if len(home_parts) > 0 else home_team_manager
                        home_manager = home_parts[1] if len(home_parts) > 1 else ""
                        
                        away_team = away_parts[0] if len(away_parts) > 0 else away_team_manager
                        away_manager = away_parts[1] if len(away_parts) > 1 else ""
                        
                        # Clean up team and manager names
                        home_team = home_team.strip()
                        home_manager = home_manager.strip()
                        away_team = away_team.strip()
                        away_manager = away_manager.strip()
                        
                        # Debug: parsing successful
                        
                        results.append({
                            'homeTeam': home_team,
                            'homeManager': home_manager,
                            'awayTeam': away_team,
                            'awayManager': away_manager,
                            'homeScore': home_score,
                            'awayScore': away_score,
                            'gameweekDate': current_gameweek_date
                        })
                        
        return results
        
    def parse_draft_data(self, file_path):
        """Parse starting_draft.csv - format is columns by team with rounds as rows"""
        teams = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)  # First row has team names
            
            # Skip the "Round" column, get team names
            team_names = [header.strip() for header in headers[1:] if header.strip()]
            
            # Initialize teams
            for team_name in team_names:
                teams.append({
                    'teamName': team_name,
                    'manager': '',
                    'draftPicks': []
                })
            
            # Read player picks by round
            for row in reader:
                if len(row) > 1:  # Skip empty rows
                    # Skip round number, get picks for each team
                    picks = row[1:len(team_names) + 1]
                    for i, pick in enumerate(picks):
                        if i < len(teams) and pick.strip():
                            teams[i]['draftPicks'].append(pick.strip())
                
        # Add manager names from final results
        for team in teams:
            for result in self.final_results:
                if result['homeTeam'] == team['teamName']:
                    team['manager'] = result['homeManager']
                    break
                elif result['awayTeam'] == team['teamName']:
                    team['manager'] = result['awayManager']
                    break
                
        return {'teams': teams}
        
    def parse_transfer_history(self, file_path):
        """Parse transfer_history.csv"""
        transfers = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                transfers.append(row)
                
        return transfers
        
    def parse_player_data(self, file_path):
        """Parse players_gw#.csv"""
        players = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Extract player info from first column
                player_info = row.get('Player', '').strip()
                player_name, team, position = self.extract_player_info(player_info)
                
                players.append({
                    'name': player_name,
                    'team': team,
                    'position': position,
                    'totalPoints': int(row.get('Pts', 0) or 0),
                    'roundPoints': int(row.get('Round Pts', 0) or 0),
                    'cost': float(row.get('Cost', 0) or 0)
                })
                
        return players
        
    def extract_player_info(self, player_string):
        """Extract player name, team, and position from concatenated string"""
        # Common team abbreviations and mappings
        team_mapping = {
            'Man City': 'Manchester City',
            'Man Utd': 'Manchester United',
            'Brighton': 'Brighton & Hove Albion',
            'Newcastle': 'Newcastle United',
            'West Ham': 'West Ham United',
            'Nottm Forest': 'Nottingham Forest'
        }
        
        premier_league_teams = [
            'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion',
            'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town',
            'Leicester City', 'Liverpool', 'Manchester City', 'Manchester United',
            'Newcastle United', 'Nottingham Forest', 'Southampton', 'Tottenham Hotspur',
            'West Ham United', 'Wolverhampton Wanderers',
            # Abbreviations
            'Man City', 'Man Utd', 'Brighton', 'Newcastle', 'West Ham', 'Nottm Forest'
        ]
        
        positions = ['GKP', 'DEF', 'MID', 'FWD', 'GK']
        
        # Find position (always at the end)
        position = 'Unknown'
        for pos in positions:
            if player_string.endswith(pos):
                position = 'GKP' if pos == 'GK' else pos
                player_string = player_string[:-len(pos)]
                break
                
        # Find team
        team = 'Unknown'
        remaining_string = player_string
        
        for team_name in premier_league_teams:
            if team_name in player_string:
                team = team_mapping.get(team_name, team_name)
                remaining_string = player_string.replace(team_name, '')
                break
                
        # Remaining string is the player name
        player_name = remaining_string.strip()
        
        return player_name, team, position
        
    def parse_fixtures(self, file_path):
        """Parse fixture_list.csv - format is similar to final_results with team/manager on separate lines"""
        fixtures = []
        current_gameweek = 1
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            
            for row in reader:
                if not row or len(row) == 0:
                    continue
                    
                # Check for gameweek header
                if row[0].startswith('Gameweek '):
                    match = re.search(r'Gameweek (\d+)', row[0])
                    if match:
                        current_gameweek = int(match.group(1))
                    continue
                    
                # Check if this is a fixture line (3 columns with "v" in middle)
                if len(row) == 3 and row[1] == 'v':
                    home_team_manager = row[0].strip()
                    away_team_manager = row[2].strip()
                    
                    # Split team and manager (they're on separate lines in quotes)
                    home_parts = home_team_manager.split('\n')
                    away_parts = away_team_manager.split('\n')
                    
                    home_team = home_parts[0] if len(home_parts) > 0 else home_team_manager
                    home_manager = home_parts[1] if len(home_parts) > 1 else ""
                    
                    away_team = away_parts[0] if len(away_parts) > 0 else away_team_manager
                    away_manager = away_parts[1] if len(away_parts) > 1 else ""
                    
                    # Clean up team and manager names
                    home_team = home_team.strip()
                    home_manager = home_manager.strip()
                    away_team = away_team.strip()
                    away_manager = away_manager.strip()
                    
                    fixtures.append({
                        'gameweek': current_gameweek,
                        'homeTeam': home_team,
                        'awayTeam': away_team,
                        'homeManager': home_manager,
                        'awayManager': away_manager,
                        'date': 'TBD',
                        'time': 'TBD'
                    })
                    
        return fixtures
        
    def calculate_standings(self):
        """Calculate current standings from final results"""
        standings = {}
        
        # Initialize standings for each team
        for result in self.final_results:
            for team_key, manager_key, score_key in [
                ('homeTeam', 'homeManager', 'homeScore'),
                ('awayTeam', 'awayManager', 'awayScore')
            ]:
                team = result[team_key]
                manager = result[manager_key]
                
                if team not in standings:
                    standings[team] = {
                        'teamName': team,
                        'manager': manager,
                        'points': 0,
                        'gwPoints': 0,
                        'played': 0,
                        'wins': 0,
                        'draws': 0,
                        'losses': 0,
                        'goalsFor': 0,
                        'goalsAgainst': 0,
                        'goalDifference': 0
                    }
                    
        # Calculate stats from results
        for result in self.final_results:
            home_team = result['homeTeam']
            away_team = result['awayTeam']
            home_score = result['homeScore']
            away_score = result['awayScore']
            
            # Update stats
            standings[home_team]['played'] += 1
            standings[away_team]['played'] += 1
            standings[home_team]['goalsFor'] += home_score
            standings[home_team]['goalsAgainst'] += away_score
            standings[away_team]['goalsFor'] += away_score
            standings[away_team]['goalsAgainst'] += home_score
            standings[home_team]['gwPoints'] += home_score
            standings[away_team]['gwPoints'] += away_score
            
            # Determine result
            if home_score > away_score:
                standings[home_team]['wins'] += 1
                standings[home_team]['points'] += 3
                standings[away_team]['losses'] += 1
            elif away_score > home_score:
                standings[away_team]['wins'] += 1
                standings[away_team]['points'] += 3
                standings[home_team]['losses'] += 1
            else:
                standings[home_team]['draws'] += 1
                standings[home_team]['points'] += 1
                standings[away_team]['draws'] += 1
                standings[away_team]['points'] += 1
                
        # Calculate goal difference
        for team in standings.values():
            team['goalDifference'] = team['goalsFor'] - team['goalsAgainst']
            
        # Sort standings
        sorted_standings = sorted(standings.values(), key=lambda x: (
            -x['points'],          # Points (descending)
            -x['gwPoints'],        # GW Points as tiebreaker (descending)
            -x['goalDifference'],  # Goal difference (descending)
            -x['goalsFor']         # Goals for (descending)
        ))
        
        return sorted_standings
        
    def calculate_transfer_activity(self):
        """Calculate transfer activity with player names and teams"""
        activity = {
            'waivers': [],
            'free_agents': [],
            'trades': []
        }
        
        for transfer in self.transfer_history:
            transfer_type = transfer.get('Type', '').lower()
            manager = transfer.get('Manager', '')
            player_in = transfer.get('Player In', '')
            player_out = transfer.get('Player Out', '')
            
            # Get player team info
            player_in_info = self.get_player_team_info(player_in)
            player_out_info = self.get_player_team_info(player_out)
            
            if 'waiver' in transfer_type:
                activity['waivers'].append({
                    'manager': manager,
                    'player_in': player_in,
                    'player_in_team': player_in_info['team'],
                    'player_out': player_out,
                    'player_out_team': player_out_info['team']
                })
            elif 'free' in transfer_type:
                activity['free_agents'].append({
                    'manager': manager,
                    'player_in': player_in,
                    'player_in_team': player_in_info['team'],
                    'player_out': player_out,
                    'player_out_team': player_out_info['team']
                })
            elif 'trade' in transfer_type:
                activity['trades'].append({
                    'manager': manager,
                    'player_in': player_in,
                    'player_in_team': player_in_info['team'],
                    'player_out': player_out,
                    'player_out_team': player_out_info['team']
                })
                
        return activity
        
    def get_player_team_info(self, player_name):
        """Get team info for a player"""
        for player in self.player_data:
            if player['name'].lower() == player_name.lower():
                return {'team': player['team'], 'position': player['position']}
        return {'team': 'Unknown', 'position': 'Unknown'}
        
    def calculate_weekly_winner(self):
        """Calculate weekly winner and prize money"""
        if not self.final_results:
            return None
            
        # Get all managers and their GW points
        manager_points = {}
        for result in self.final_results:
            home_manager = result['homeManager']
            away_manager = result['awayManager']
            home_score = result['homeScore']
            away_score = result['awayScore']
            
            if home_manager:
                manager_points[home_manager] = home_score
            if away_manager:
                manager_points[away_manager] = away_score
                
        if not manager_points:
            return None
            
        # Find winner (highest GW points)
        winner = max(manager_points.items(), key=lambda x: x[1])
        total_managers = len(manager_points)
        weekly_prize = total_managers - 1  # $1 from each other manager
        
        return {
            'winner': winner[0],
            'points': winner[1],
            'prize': weekly_prize
        }
        
    def get_current_squads(self):
        """Get current squad for each manager after transfers"""
        squads = {}
        
        if not self.draft_data:
            return squads
            
        # Start with draft picks
        for team in self.draft_data['teams']:
            team_name = team['teamName']
            manager = team.get('manager', '')
            
            # Get manager from results if not in draft
            if not manager:
                for result in self.final_results:
                    if result['homeTeam'] == team_name:
                        manager = result['homeManager']
                        break
                    elif result['awayTeam'] == team_name:
                        manager = result['awayManager']
                        break
                        
            squads[manager or team_name] = {
                'team_name': team_name,
                'players': team['draftPicks'].copy()
            }
            
        # Apply transfers
        for transfer in self.transfer_history:
            manager = transfer.get('Manager', '')
            player_in = transfer.get('Player In', '')
            player_out = transfer.get('Player Out', '')
            
            if manager in squads:
                # Remove player out
                if player_out in squads[manager]['players']:
                    squads[manager]['players'].remove(player_out)
                # Add player in
                if player_in:
                    squads[manager]['players'].append(player_in)
                    
        return squads
        
    def calculate_outstanding_payments(self):
        """Calculate outstanding payments by month"""
        payments = {}
        
        # For now, just calculate weekly winner payments
        weekly_winner_data = self.calculate_weekly_winner()
        if weekly_winner_data:
            winner = weekly_winner_data['winner']
            
            # Get current month based on gameweek
            month = self.get_month_from_gameweek(self.gameweek)
            
            if month not in payments:
                payments[month] = {}
                
            # Each manager owes $1 to the weekly winner
            for result in self.final_results:
                for manager in [result['homeManager'], result['awayManager']]:
                    if manager and manager != winner:
                        if manager not in payments[month]:
                            payments[month][manager] = {}
                        payments[month][manager][winner] = 1
                        
        return payments
        
    def get_month_from_gameweek(self, gameweek):
        """Map gameweek to month based on PL schedule"""
        gw = int(gameweek)
        if gw <= 3: return 'August'
        elif gw <= 6: return 'September'
        elif gw <= 10: return 'October'
        elif gw <= 14: return 'November'
        elif gw <= 18: return 'December'
        elif gw <= 22: return 'January'
        elif gw <= 26: return 'February'
        elif gw <= 30: return 'March'
        elif gw <= 34: return 'April'
        elif gw <= 38: return 'May'
        else: return 'Unknown'
        
    def generate_markdown(self):
        """Generate the comprehensive markdown report"""
        print(f"📝 Generating markdown summary for GW{self.gameweek}...")
        
        # Calculate all data
        standings = self.calculate_standings()
        transfer_activity = self.calculate_transfer_activity()
        weekly_winner = self.calculate_weekly_winner()
        current_squads = self.get_current_squads()
        outstanding_payments = self.calculate_outstanding_payments()
        next_fixtures = [f for f in self.fixtures if f['gameweek'] == int(self.gameweek) + 1]
        
        # Generate markdown
        md_content = f"""# FPL Draft League - Gameweek {self.gameweek} Summary

*Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}*

---

## 📊 Current Standings

| Pos | Manager | Team | Pts | GW Pts | P | W | D | L | GF | GA | GD |
|-----|---------|------|-----|--------|---|---|---|---|----|----|----| 
"""

        for i, team in enumerate(standings, 1):
            manager_display = team['manager'] if team['manager'] else 'Unknown'
            md_content += f"| {i} | {manager_display} | {team['teamName']} | {team['points']} | {team['gwPoints']} | {team['played']} | {team['wins']} | {team['draws']} | {team['losses']} | {team['goalsFor']} | {team['goalsAgainst']} | {team['goalDifference']:+} |\n"
            
        md_content += "\n---\n\n## ⚽ Gameweek Points\n\n"
        
        # Individual GW scores
        manager_scores = {}
        for result in self.final_results:
            if result['homeManager']:
                manager_scores[result['homeManager']] = result['homeScore']
            if result['awayManager']:
                manager_scores[result['awayManager']] = result['awayScore']
                
        sorted_scores = sorted(manager_scores.items(), key=lambda x: x[1], reverse=True)
        
        for i, (manager, score) in enumerate(sorted_scores, 1):
            emoji = "🏆" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "⚽"
            manager_display = manager if manager else "Unknown"
            md_content += f"{emoji} **{manager_display}**: {score} points\n"
            
        md_content += "\n---\n\n## 🔄 Transfer Activity\n\n"
        
        # Transfer activity
        if transfer_activity['waivers']:
            md_content += "### Waiver Claims\n"
            for waiver in transfer_activity['waivers']:
                md_content += f"- **{waiver['manager']}**: {waiver['player_in']} ({waiver['player_in_team']}) ← {waiver['player_out']} ({waiver['player_out_team']})\n"
            md_content += "\n"
            
        if transfer_activity['free_agents']:
            md_content += "### Free Agent Pickups\n"
            for fa in transfer_activity['free_agents']:
                md_content += f"- **{fa['manager']}**: {fa['player_in']} ({fa['player_in_team']}) ← {fa['player_out']} ({fa['player_out_team']})\n"
            md_content += "\n"
            
        if transfer_activity['trades']:
            md_content += "### Trades\n"
            for trade in transfer_activity['trades']:
                md_content += f"- **{trade['manager']}**: {trade['player_in']} ({trade['player_in_team']}) ← {trade['player_out']} ({trade['player_out_team']})\n"
            md_content += "\n"
            
        if not any([transfer_activity['waivers'], transfer_activity['free_agents'], transfer_activity['trades']]):
            md_content += "*No transfers this gameweek*\n\n"
            
        md_content += "---\n\n## 💰 Prize Money\n\n"
        
        # Prize money
        if weekly_winner:
            md_content += f"### Weekly Winner\n"
            md_content += f"🏆 **{weekly_winner['winner']}** - {weekly_winner['points']} points\n"
            md_content += f"💵 Prize: ${weekly_winner['prize']} ($1 from each other manager)\n\n"
        else:
            md_content += "*Weekly winner will be calculated once final results are available*\n\n"
            
        md_content += "---\n\n## ⚽ Head-to-Head Results\n\n"
        
        # H2H results
        for result in self.final_results:
            home_manager = result['homeManager'] if result['homeManager'] else 'Unknown'
            away_manager = result['awayManager'] if result['awayManager'] else 'Unknown'
            md_content += f"**{result['homeTeam']}** ({home_manager}) {result['homeScore']} - {result['awayScore']} **{result['awayTeam']}** ({away_manager})\n"
            
        md_content += "\n---\n\n## 📅 Next Week's Fixtures\n\n"
        
        # Next fixtures
        if next_fixtures:
            md_content += f"### Gameweek {int(self.gameweek) + 1} Fixtures\n\n"
            for fixture in next_fixtures:
                md_content += f"- **{fixture['homeTeam']}** vs **{fixture['awayTeam']}**"
                if fixture['date']:
                    md_content += f" - {fixture['date']}"
                if fixture['time']:
                    md_content += f" at {fixture['time']}"
                md_content += "\n"
        else:
            md_content += "*No fixtures available for next gameweek*\n"
            
        md_content += "\n---\n\n## 👥 Current Squads\n\n"
        
        # Current squads
        for manager, squad_data in current_squads.items():
            md_content += f"### {manager} ({squad_data['team_name']})\n\n"
            
            # Group players by position
            positions = {'GKP': [], 'DEF': [], 'MID': [], 'FWD': []}
            
            for player_name in squad_data['players']:
                player_info = self.get_player_team_info(player_name)
                position = player_info['position']
                team = player_info['team']
                
                if position in positions:
                    positions[position].append(f"{player_name} ({team})")
                else:
                    positions['MID'].append(f"{player_name} ({team})")  # Default to MID
                    
            for pos, players in positions.items():
                if players:
                    md_content += f"**{pos}**: {', '.join(players)}\n"
                    
            md_content += "\n"
            
        md_content += "---\n\n## 💳 Outstanding Payments\n\n"
        
        # Outstanding payments
        if outstanding_payments:
            for month, debts in outstanding_payments.items():
                md_content += f"### {month}\n\n"
                for debtor, creditors in debts.items():
                    for creditor, amount in creditors.items():
                        md_content += f"- **{debtor}** owes **{creditor}**: ${amount}\n"
                md_content += "\n"
        else:
            md_content += "*No outstanding payments*\n\n"
            
        md_content += "---\n\n*Report generated automatically from final results data*"
        
        return md_content
        
    def save_summary(self, md_content):
        """Save the markdown summary to the gw folder"""
        output_file = self.base_path / self.gw_folder / f"summary_gw{self.gameweek}.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(md_content)
            
        print(f"✅ Summary saved to: {output_file}")
        return output_file

def main():
    if len(sys.argv) != 2:
        print("Usage: python generate_summary.py <gameweek>")
        print("Example: python generate_summary.py 1")
        sys.exit(1)
        
    gameweek = sys.argv[1]
    
    generator = FPLSummaryGenerator(gameweek)
    
    if not generator.load_data():
        print("❌ Failed to load required data")
        sys.exit(1)
        
    md_content = generator.generate_markdown()
    output_file = generator.save_summary(md_content)
    
    print(f"🎉 Summary generation complete!")
    print(f"📄 File: {output_file}")

if __name__ == "__main__":
    main()
