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
        self.standings_data = []
        
    def load_data(self):
        """Load all relevant data files"""
        print(f"🔄 Loading data for GW{self.gameweek}...")
        
        # Load final results for current gameweek
        final_results_file = self.base_path / self.gw_folder / f"final_results_gw{self.gameweek}.csv"
        if final_results_file.exists():
            self.final_results = self.parse_final_results(final_results_file)
            print(f"✅ Loaded {len(self.final_results)} final results for GW{self.gameweek}")
        else:
            print(f"❌ No final results found: {final_results_file}")
            return False
            
        # Load final results for ALL previous gameweeks to calculate cumulative standings
        self.all_final_results = []
        for gw in range(1, int(self.gameweek) + 1):
            gw_results_file = self.base_path / f"gw{gw}" / f"final_results_gw{gw}.csv"
            if gw_results_file.exists():
                gw_results = self.parse_final_results(gw_results_file)
                for result in gw_results:
                    result['gameweek'] = gw
                self.all_final_results.extend(gw_results)
        print(f"✅ Loaded {len(self.all_final_results)} total final results across all gameweeks")
            
        # Load draft data
        draft_file = self.base_path / self.gw_folder / "starting_draft.csv"
        if draft_file.exists():
            self.draft_data = self.parse_draft_data(draft_file)
            print(f"✅ Loaded draft data with {len(self.draft_data.get('teams', []))} teams")
            
        # Load ALL transfer history from previous gameweeks
        self.transfer_history = []
        for gw in range(1, int(self.gameweek) + 1):
            transfer_file = self.base_path / f"gw{gw}" / "transfer_history.csv"
            if transfer_file.exists():
                gw_transfers = self.parse_transfer_history(transfer_file)
                # Add gameweek info to each transfer
                for transfer in gw_transfers:
                    transfer['gameweek'] = gw
                self.transfer_history.extend(gw_transfers)
        print(f"✅ Loaded {len(self.transfer_history)} total transfer records across all gameweeks")
            
        # Load player data for current gameweek
        player_file = self.base_path / self.gw_folder / f"players_gw{self.gameweek}.csv"
        if player_file.exists():
            self.player_data = self.parse_player_data(player_file)
            print(f"✅ Loaded {len(self.player_data)} player records for GW{self.gameweek}")
            
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
                        
                        results.append({
                            'homeTeam': home_team,
                            'awayTeam': away_team,
                            'homeManager': home_manager,
                            'awayManager': away_manager,
                            'homeScore': home_score,
                            'awayScore': away_score,
                            'date': current_gameweek_date
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
        """Parse transfer_history.csv with proper structure"""
        transfers = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            
            current_section = None
            
            for row in reader:
                if not row or len(row) == 0:
                    continue
                    
                # Check for section headers
                if 'Waivers History' in row[0]:
                    current_section = 'waiver'
                    continue
                elif 'Free Agents History' in row[0]:
                    current_section = 'free_agent'
                    continue
                elif 'Trades History' in row[0]:
                    current_section = 'trade'
                    continue
                    
                # Skip header rows
                if row[0] == 'GW' or row[0] == 'Manager':
                    continue
                    
                if current_section == 'waiver' and len(row) >= 6:
                    transfers.append({
                        'type': 'waiver',
                        'GW': row[0],
                        'Manager': row[1],
                        'In': row[2],
                        'Out': row[3],
                        'Result': row[4]
                    })
                elif current_section == 'free_agent' and len(row) >= 5:
                    transfers.append({
                        'type': 'free_agent',
                        'GW': row[0],
                        'Manager': row[1],
                        'In': row[2],
                        'Out': row[3],
                        'Date': row[4]
                    })
                elif current_section == 'trade' and len(row) >= 7:
                    transfers.append({
                        'type': 'trade',
                        'GW': row[0],
                        'Offered By': row[1],
                        'Offered To': row[2],
                        'Offered': row[3],
                        'Requested': row[4],
                        'Result': row[5],
                        'Date': row[6]
                    })
                
        return transfers
        
    def parse_player_data(self, file_path):
        """Parse players_gw#.csv with correct format"""
        players = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            
            # Skip header row
            next(reader, None)
            
            for row in reader:
                if len(row) >= 6:
                    player_string = row[0]
                    cost = float(row[1]) if row[1] and row[1] != 'Cost' else 0
                    selection_percent = row[2] if row[2] and row[2] != 'Sel.%' else "0%"
                    form = float(row[3]) if row[3] and row[3] != 'Form' else 0
                    total_points = int(row[4]) if row[4] and row[4] != 'Pts.' else 0
                    round_points = int(row[5]) if row[5] and row[5] != 'RP' else 0
                    
                    # Extract player info
                    player_name, team, position = self.extract_player_info(player_string)
                    
                    players.append({
                        'name': player_name,
                        'team': team,
                        'position': position,
                        'cost': cost,
                        'selectionPercent': selection_percent,
                        'form': form,
                        'totalPoints': total_points,
                        'roundPoints': round_points
                    })
                
        return players
        
    def extract_player_info(self, player_string):
        """Extract player name, team, and position from concatenated string"""
        # Common team abbreviations and mappings
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
            'Brighton': 'Brighton & Hove Albion',
            'Leeds': 'Leeds United'
        }
        
        premier_league_teams = [
            'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion',
            'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Leeds United',
            'Leeds', 'Liverpool', 'Manchester City', 'Man City', 'Manchester United', 'Man United', 'Man Utd',
            'Newcastle United', 'Newcastle', 'Nottingham Forest', 'Nott\'m Forest',
            'Sunderland', 'Tottenham Hotspur', 'Tottenham', 'Spurs', 'West Ham United', 
            'West Ham', 'Wolverhampton Wanderers', 'Wolves'
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
        
    def get_current_squads(self):
        """Get current squad for each manager after ALL transfers from previous gameweeks"""
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
            
        # Apply ALL transfers from previous gameweeks (up to current gameweek)
        # Apply in correct order: Trades → Waivers → Free Agents
        
        # 1. Apply accepted trades FIRST
        for transfer in self.transfer_history:
            if transfer['type'] == 'trade' and transfer['Result'] in ['Accepted', 'Processed']:
                transfer_gw = int(transfer.get('GW', 0))
                if transfer_gw <= int(self.gameweek):
                    offered_by = transfer['Offered By']
                    offered_to = transfer['Offered To']
                    offered = transfer['Offered']
                    requested = transfer['Requested']
                    
                    # Find managers in squads
                    for manager in squads.keys():
                        if manager == offered_by:
                            # Remove offered player, add requested player
                            if offered in squads[manager]['players']:
                                squads[manager]['players'].remove(offered)
                            if requested:
                                squads[manager]['players'].append(requested)
                        elif manager == offered_to:
                            # Remove requested player, add offered player
                            if requested in squads[manager]['players']:
                                squads[manager]['players'].remove(requested)
                            if offered:
                                squads[manager]['players'].append(offered)
        
        # 2. Apply successful waiver transactions SECOND
        for transfer in self.transfer_history:
            if transfer['type'] == 'waiver' and transfer['Result'] == 'Accepted':
                transfer_gw = int(transfer.get('GW', 0))
                if transfer_gw <= int(self.gameweek):
                    manager = transfer['Manager']
                    player_in = transfer['In']
                    player_out = transfer['Out']
                    
                    if manager in squads:
                        # Remove player out
                        if player_out in squads[manager]['players']:
                            squads[manager]['players'].remove(player_out)
                        # Add player in
                        if player_in:
                            squads[manager]['players'].append(player_in)
        
        # 3. Apply free agent transactions LAST
        for transfer in self.transfer_history:
            if transfer['type'] == 'free_agent':
                transfer_gw = int(transfer.get('GW', 0))
                if transfer_gw <= int(self.gameweek):
                    manager = transfer['Manager']
                    player_in = transfer['In']
                    player_out = transfer['Out']
                    
                    if manager in squads:
                        # Remove player out
                        if player_out in squads[manager]['players']:
                            squads[manager]['players'].remove(player_out)
                        # Add player in
                        if player_in:
                            squads[manager]['players'].append(player_in)
                    
        return squads
        
    def get_player_points_for_gw(self, player_name, manager):
        """Get points earned by a specific player for their manager in this gameweek"""
        for player in self.player_data:
            if player['name'].lower() == player_name.lower():
                return player['roundPoints']
        return 0
        
    def calculate_weekly_winner(self):
        """Calculate weekly winner and prize money for current gameweek"""
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
        
    def calculate_cumulative_standings(self):
        """Calculate cumulative standings from ALL gameweeks up to current"""
        standings = {}
        
        # Initialize standings for each team
        for result in self.all_final_results:
            for team_key, manager_key, score_key in [
                ('homeTeam', 'homeManager', 'homeScore'),
                ('awayTeam', 'awayManager', 'awayScore')
            ]:
                team = result[team_key]
                manager = result[manager_key]
                
                if team not in standings:
                    standings[team] = {
                        'position': 0,
                        'teamName': team,
                        'manager': manager,
                        'points': 0,
                        'gwPoints': 0,
                        'totalGWPoints': 0,
                        'played': 0,
                        'wins': 0,
                        'draws': 0,
                        'losses': 0,
                        'goalsFor': 0,
                        'goalsAgainst': 0,
                        'goalDifference': 0,
                        'winnings': 0
                    }
                    
        # Calculate stats from all results
        for result in self.all_final_results:
            home_team = result['homeTeam']
            away_team = result['awayTeam']
            home_score = result['homeScore']
            away_score = result['awayScore']
            gameweek = result.get('gameweek', 1)
            
            # Update stats
            standings[home_team]['played'] += 1
            standings[away_team]['played'] += 1
            standings[home_team]['goalsFor'] += home_score
            standings[home_team]['goalsAgainst'] += away_score
            standings[away_team]['goalsFor'] += away_score
            standings[away_team]['goalsAgainst'] += home_score
            
            # Add to total GW points (cumulative)
            standings[home_team]['totalGWPoints'] += home_score
            standings[away_team]['totalGWPoints'] += away_score
            
            # Set current GW points to the latest gameweek
            if gameweek == int(self.gameweek):
                standings[home_team]['gwPoints'] = home_score
                standings[away_team]['gwPoints'] = away_score
            
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
            
        # Sort standings and add positions
        sorted_standings = sorted(standings.values(), key=lambda x: (
            -x['points'],          # Points (descending)
            -x['totalGWPoints'],   # Total GW Points as tiebreaker (descending)
            -x['goalDifference'],  # Goal difference (descending)
            -x['goalsFor']         # Goals for (descending)
        ))
        
        # Add positions
        for i, team in enumerate(sorted_standings, 1):
            team['position'] = i
            
        return sorted_standings
        
    def calculate_cumulative_outstanding_payments(self):
        """Calculate cumulative outstanding payments from ALL previous gameweeks"""
        payments = {}
        all_managers_by_month = {}  # Track all managers per month for monthly prize

        # Calculate weekly winners for all previous gameweeks
        for gw in range(1, int(self.gameweek) + 1):
            # Load final results for this gameweek
            final_results_file = self.base_path / f"gw{gw}" / f"final_results_gw{gw}.csv"
            if final_results_file.exists():
                gw_results = self.parse_final_results(final_results_file)

                if gw_results:
                    # Calculate weekly winner for this gameweek
                    manager_points = {}
                    for result in gw_results:
                        home_manager = result['homeManager']
                        away_manager = result['awayManager']
                        home_score = result['homeScore']
                        away_score = result['awayScore']

                        if home_manager:
                            manager_points[home_manager] = home_score
                        if away_manager:
                            manager_points[away_manager] = away_score

                    if manager_points:
                        winner = max(manager_points.items(), key=lambda x: x[1])
                        month = self.get_month_from_gameweek(gw)

                        # Track all managers for this month
                        if month not in all_managers_by_month:
                            all_managers_by_month[month] = set()
                        all_managers_by_month[month].update(manager_points.keys())

                        if month not in payments:
                            payments[month] = {}

                        # Each manager owes $1 to the weekly winner
                        for manager in manager_points.keys():
                            if manager != winner[0]:
                                if manager not in payments[month]:
                                    payments[month][manager] = {}
                                if winner[0] not in payments[month][manager]:
                                    payments[month][manager][winner[0]] = 0
                                payments[month][manager][winner[0]] += 1

        # Add monthly winners' $2 prize for complete months
        for month in payments.keys():
            if self.is_month_complete(month, int(self.gameweek)):
                monthly_winner_data = self.calculate_monthly_winner(month, int(self.gameweek))
                if monthly_winner_data:
                    monthly_winner = monthly_winner_data['manager']
                    # Each manager owes $2 to the monthly winner
                    for manager in all_managers_by_month.get(month, []):
                        if manager != monthly_winner:
                            if manager not in payments[month]:
                                payments[month][manager] = {}
                            if monthly_winner not in payments[month][manager]:
                                payments[month][manager][monthly_winner] = 0
                            payments[month][manager][monthly_winner] += 2

        return payments
        
    def get_month_from_gameweek(self, gameweek):
        """Map gameweek to month based on PL schedule"""
        gw = int(gameweek)
        if gw <= 3: return 'August'
        elif gw <= 6: return 'September'
        elif gw <= 9: return 'October'
        elif gw <= 13: return 'November'
        elif gw <= 18: return 'December'
        elif gw <= 22: return 'January'
        elif gw <= 26: return 'February'
        elif gw <= 30: return 'March'
        elif gw <= 34: return 'April'
        elif gw <= 38: return 'May'
        else: return 'Unknown'
    
    def get_gameweeks_for_month(self, month):
        """Get list of gameweeks for a given month"""
        month_map = {
            'August': [1, 2, 3],
            'September': [4, 5, 6],
            'October': [7, 8, 9],
            'November': [10, 11, 12, 13],
            'December': [14, 15, 16, 17, 18],
            'January': [19, 20, 21, 22, 23],
            'February': [24, 25, 26, 27],
            'March': [28, 29, 30],
            'April': [31, 32, 33, 34],
            'May': [35, 36, 37, 38]
        }
        return month_map.get(month, [])
    
    def is_month_complete(self, month, current_gameweek):
        """Check if a month is complete based on current gameweek"""
        month_gameweeks = self.get_gameweeks_for_month(month)
        if not month_gameweeks:
            return False
        # Month is complete if current gameweek is >= the last gameweek of the month
        return current_gameweek >= max(month_gameweeks)
    
    def calculate_monthly_winner(self, month, current_gameweek):
        """Calculate monthly winner for a given month"""
        month_gameweeks = self.get_gameweeks_for_month(month)
        if not month_gameweeks:
            return None
        
        # Calculate total FPL points for each team in this month
        monthly_points = {}
        monthly_managers = {}
        
        for gw in month_gameweeks:
            if gw > current_gameweek:
                break  # Don't count future gameweeks
            
            # Load final results for this gameweek
            gw_results_file = self.base_path / f"gw{gw}" / f"final_results_gw{gw}.csv"
            if gw_results_file.exists():
                gw_results = self.parse_final_results(gw_results_file)
                
                for result in gw_results:
                    home_team = result['homeTeam']
                    away_team = result['awayTeam']
                    home_score = result['homeScore']
                    away_score = result['awayScore']
                    home_manager = result['homeManager']
                    away_manager = result['awayManager']
                    
                    # Add points to monthly totals
                    if home_team not in monthly_points:
                        monthly_points[home_team] = 0
                        monthly_managers[home_team] = home_manager
                    if away_team not in monthly_points:
                        monthly_points[away_team] = 0
                        monthly_managers[away_team] = away_manager
                    
                    monthly_points[home_team] += home_score
                    monthly_points[away_team] += away_score
        
        if not monthly_points:
            return None
        
        # Find the team with the highest monthly points
        winner_team = max(monthly_points.items(), key=lambda x: x[1])
        
        return {
            'teamName': winner_team[0],
            'manager': monthly_managers.get(winner_team[0], 'Unknown'),
            'points': winner_team[1]
        }
        
    def generate_markdown(self):
        """Generate the comprehensive markdown report"""
        print(f"📝 Generating markdown summary for GW{self.gameweek}...")
        
        # Calculate cumulative standings from all gameweeks
        standings = self.calculate_cumulative_standings()
        
        # Calculate other data
        weekly_winner = self.calculate_weekly_winner()
        current_squads = self.get_current_squads()
        outstanding_payments = self.calculate_cumulative_outstanding_payments()
        next_fixtures = [f for f in self.fixtures if f['gameweek'] == int(self.gameweek) + 1]
        
        # Generate markdown
        md_content = f"""# FPL Draft League - Gameweek {self.gameweek} Summary

*Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}*

---

## 📊 Current Standings (Cumulative)

| Pos | Manager | Team | Total League Pts | Current GW Pts | Total GW Pts | P | W | D | L | GF | GA | GD |
|-----|---------|------|------------------|----------------|--------------|---|---|---|---|----|----|----| 
"""

        for team in standings:
            manager_display = team['manager'] if team['manager'] else 'Unknown'
            md_content += f"| {team['position']} | {manager_display} | {team['teamName']} | {team['points']} | {team['gwPoints']} | {team['totalGWPoints']} | {team['played']} | {team['wins']} | {team['draws']} | {team['losses']} | {team['goalsFor']} | {team['goalsAgainst']} | {team['goalDifference']:+} |\n"
            
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
            
        md_content += "\n---\n\n## 🔄 Transfer Activity (This Gameweek)\n\n"
        
        # Transfer activity (only for current gameweek)
        current_gw_transfers = [t for t in self.transfer_history if int(t.get('gameweek', 0)) == int(self.gameweek)]
        
        waivers = [t for t in current_gw_transfers if t['type'] == 'waiver' and t['Result'] == 'Accepted']
        free_agents = [t for t in current_gw_transfers if t['type'] == 'free_agent']
        trades = [t for t in current_gw_transfers if t['type'] == 'trade' and t['Result'] in ['Accepted', 'Processed']]
        
        if waivers:
            md_content += "### Waiver Claims\n"
            for waiver in waivers:
                md_content += f"- **{waiver['Manager']}**: {waiver['In']} ← {waiver['Out']}\n"
            md_content += "\n"
            
        if free_agents:
            md_content += "### Free Agent Pickups\n"
            for fa in free_agents:
                md_content += f"- **{fa['Manager']}**: {fa['In']} ← {fa['Out']}\n"
            md_content += "\n"
            
        if trades:
            md_content += "### Trades\n"
            for trade in trades:
                md_content += f"- **{trade['Offered By']}** ↔ **{trade['Offered To']}**: {trade['Offered']} ↔ {trade['Requested']}\n"
            md_content += "\n"
            
        if not any([waivers, free_agents, trades]):
            md_content += "*No transfers this gameweek*\n\n"
            
        md_content += "---\n\n## 💰 Prize Money\n\n"
        
        # Prize money
        if weekly_winner:
            md_content += f"### Weekly Winner\n"
            md_content += f"🏆 **{weekly_winner['winner']}** - {weekly_winner['points']} points\n"
            md_content += f"💵 Prize: ${weekly_winner['prize']} ($1 from each other manager)\n\n"
        else:
            md_content += "*Weekly winner will be calculated once final results are available*\n\n"
        
        # Monthly winner - show current month leader even if month not complete
        current_month = self.get_month_from_gameweek(self.gameweek)
        monthly_winner = self.calculate_monthly_winner(current_month, int(self.gameweek))
        if monthly_winner:
            monthly_prize = 11 * 2  # $2 from each of the other 11 managers
            month_gameweeks = self.get_gameweeks_for_month(current_month)
            completed_gws = [gw for gw in month_gameweeks if gw <= int(self.gameweek)]
            if self.is_month_complete(current_month, int(self.gameweek)):
                gw_range = f"GW{min(month_gameweeks)}-{max(month_gameweeks)}"
                md_content += f"### Monthly Winner ({current_month})\n"
            else:
                gw_range = f"GW{min(completed_gws)}-{max(completed_gws)} (through GW{self.gameweek})"
                md_content += f"### Monthly Leader ({current_month})\n"
            md_content += f"🏆 **{monthly_winner['manager']}** ({monthly_winner['teamName']}) - {monthly_winner['points']} points\n"
            if self.is_month_complete(current_month, int(self.gameweek)):
                md_content += f"💵 Prize: ${monthly_prize} ($2 from each other manager)\n"
            md_content += f"📅 Period: {gw_range}\n\n"
        
        # Check for previous months that might have just completed
        previous_months = ['August', 'September', 'October']
        for month in previous_months:
            if self.is_month_complete(month, int(self.gameweek)):
                monthly_winner = self.calculate_monthly_winner(month, int(self.gameweek))
                if monthly_winner:
                    # Only show if this month just completed (i.e., current gameweek is the last GW of the month)
                    month_gameweeks = self.get_gameweeks_for_month(month)
                    if int(self.gameweek) == max(month_gameweeks):
                        monthly_prize = 11 * 2
                        gw_range = f"GW{min(month_gameweeks)}-{max(month_gameweeks)}"
                        md_content += f"### Monthly Winner ({month})\n"
                        md_content += f"🏆 **{monthly_winner['manager']}** ({monthly_winner['teamName']}) - {monthly_winner['points']} points\n"
                        md_content += f"💵 Prize: ${monthly_prize} ($2 from each other manager)\n"
                        md_content += f"📅 Period: {gw_range}\n\n"
            
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
        
        # Current squads with player points
        for manager, squad_data in current_squads.items():
            md_content += f"### {manager} ({squad_data['team_name']})\n\n"
            
            # Group players by position
            positions = {'GKP': [], 'DEF': [], 'MID': [], 'FWD': []}
            
            for player_name in squad_data['players']:
                player_info = self.get_player_team_info(player_name)
                position = player_info['position']
                team = player_info['team']
                player_points = self.get_player_points_for_gw(player_name, manager)
                
                if position in positions:
                    positions[position].append(f"{player_name} ({team}) - {player_points} pts")
                else:
                    positions['MID'].append(f"{player_name} ({team}) - {player_points} pts")  # Default to MID
                    
            for pos, players in positions.items():
                if players:
                    md_content += f"**{pos}**: {', '.join(players)}\n"
                    
            md_content += "\n"
            
        md_content += "---\n\n## 💳 Outstanding Payments\n\n"
        
        # Outstanding payments (cumulative)
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
        
    def get_player_team_info(self, player_name):
        """Get team info for a player"""
        # First try to get from player performance data
        for player in self.player_data:
            if player['name'].lower() == player_name.lower():
                return {'team': player['team'], 'position': player['position']}
        
        # If not found in performance data, player didn't play in this gameweek
        # Return Unknown team and position
        return {'team': 'Unknown', 'position': 'Unknown'}
        
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
