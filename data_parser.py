#!/usr/bin/env python3
"""
Data Parser Module

Transforms raw FPL API JSON responses into structured data ready for CSV generation.
Handles all the complex mappings and data transformations.
"""

from typing import Dict, List
from datetime import datetime
import pytz


class DataParser:
    """Parses and transforms API data into CSV-ready format"""

    def __init__(self, config):
        """
        Initialize parser

        Args:
            config: Config object with timezone settings
        """
        self.config = config
        self.pacific_tz = pytz.timezone(config.timezone)

        # Lookups (populated during parsing)
        self.player_lookup = {}  # Regular FPL player IDs (for stats)
        self.draft_player_lookup = {}  # Draft API player IDs (for transactions)
        self.team_lookup = {}
        self.entry_lookup_by_id = {}
        self.entry_lookup_by_entry_id = {}

    def _get_original_team_name(self, api_team_name: str, manager_name: str) -> str:
        """
        Get original team name from config mapping, or use API name if not found

        Args:
            api_team_name: Team name returned by API
            manager_name: Manager's full name

        Returns:
            Original team name from config, or API name if not mapped
        """
        # Check if we have a mapping for this manager
        if manager_name in self.config.team_name_mapping:
            return self.config.team_name_mapping[manager_name]
        return api_team_name

    def parse(self, api_data: Dict, gameweek: int, is_partial: bool) -> Dict:
        """
        Main parsing method - transforms all API data

        Args:
            api_data: Dict with keys: league, transactions, pl_fixtures, bootstrap
            gameweek: Gameweek number being processed
            is_partial: Whether this is partial results

        Returns:
            Dict with parsed data ready for CSV generation
        """
        print(f"🔄 Parsing data for GW{gameweek}...")

        # Build lookups first
        self._build_lookups(api_data)

        return {
            'results': self._parse_match_results(
                api_data['league'],
                gameweek,
                is_partial
            ),
            'transfers': self._parse_transfers(
                api_data['transactions'],
                gameweek
            ),
            'players': self._parse_players(
                api_data['bootstrap']
            ),
            'pl_fixtures': self._parse_pl_fixtures(
                api_data['pl_fixtures'],
                gameweek
            )
        }

    def _build_lookups(self, api_data: Dict):
        """Build lookup dictionaries for fast access"""
        # Player lookup (regular FPL API - for stats)
        for player in api_data['bootstrap']['elements']:
            self.player_lookup[player['id']] = player

        # Draft player lookup (Draft API - for transactions)
        # IMPORTANT: Draft API has DIFFERENT player IDs than regular FPL API!
        for player in api_data['draft_bootstrap']['elements']:
            self.draft_player_lookup[player['id']] = player

        # Team lookup
        for team in api_data['bootstrap']['teams']:
            self.team_lookup[team['id']] = team

        # Entry lookups (two different ID fields used in different places)
        for entry in api_data['league']['league_entries']:
            self.entry_lookup_by_id[entry['id']] = entry
            self.entry_lookup_by_entry_id[entry['entry_id']] = entry

    def _parse_match_results(self, league_data: Dict, gameweek: int, is_partial: bool) -> List[Dict]:
        """
        Parse H2H match results

        Returns:
            List of match dictionaries with team names, managers, scores
        """
        results = []

        for match in league_data['matches']:
            if match['event'] != gameweek:
                continue

            # For partial results: include all matches (even if not started)
            # For final results: only include finished matches
            if not is_partial and not match['finished']:
                continue

            # Get team info (matches use 'id' field)
            team1 = self.entry_lookup_by_id.get(match['league_entry_1'], {})
            team2 = self.entry_lookup_by_id.get(match['league_entry_2'], {})

            if not team1 or not team2:
                print(f"⚠️ Warning: Could not find team info for match")
                continue

            # Get manager names
            home_manager = f"{team1.get('player_first_name', '')} {team1.get('player_last_name', '')}"
            away_manager = f"{team2.get('player_first_name', '')} {team2.get('player_last_name', '')}"

            # Get team names (use original names from config mapping if available)
            api_home_team = team1.get('entry_name', 'Unknown')
            api_away_team = team2.get('entry_name', 'Unknown')

            home_team = self._get_original_team_name(api_home_team, home_manager)
            away_team = self._get_original_team_name(api_away_team, away_manager)

            # Use 0 for scores if match hasn't started, otherwise use actual scores
            home_score = match['league_entry_1_points'] if match['started'] else 0
            away_score = match['league_entry_2_points'] if match['started'] else 0

            results.append({
                'home_team': home_team,
                'home_manager': home_manager,
                'home_score': home_score,
                'away_team': away_team,
                'away_manager': away_manager,
                'away_score': away_score
            })

        print(f"  ✓ Parsed {len(results)} matches")
        return results

    def _parse_transfers(self, transactions_data: Dict, current_gameweek: int) -> Dict:
        """
        Parse transfer history

        Returns:
            Dict with 'waivers', 'free_agents', 'trades' lists
        """
        waivers = []
        free_agents = []
        trades = []

        for tx in transactions_data.get('transactions', []):
            # Get manager name (transactions use 'entry' which is entry_id)
            entry = self.entry_lookup_by_entry_id.get(tx['entry'], {})
            if not entry:
                print(f"⚠️ Warning: Could not find entry for transaction")
                continue

            manager = f"{entry.get('player_first_name', '')} {entry.get('player_last_name', '')}"

            # Get player names from DRAFT API player lookup
            # (transactions use Draft API player IDs, not regular FPL IDs)
            player_in_data = self.draft_player_lookup.get(tx['element_in'], {})
            player_out_data = self.draft_player_lookup.get(tx['element_out'], {})

            player_in = player_in_data.get('web_name', 'Unknown')
            player_out = player_out_data.get('web_name', 'Unknown')

            # Parse result
            if tx['result'] == 'a':
                result = 'Accepted'
            elif tx['result'] == 'di':
                result = 'Denied(player in not available)'
            elif tx['result'] == 'do':
                result = 'Denied(player out not available)'
            else:
                result = tx['result']  # Fallback to raw code

            # Format date
            try:
                date_obj = datetime.fromisoformat(tx['added'].replace('Z', '+00:00'))
                date_str = date_obj.strftime('%-d %b')
            except:
                date_str = 'Unknown'

            gw = tx['event']

            if tx['kind'] == 'w':  # Waiver
                waivers.append({
                    'gw': gw,
                    'manager': manager,
                    'player_in': player_in,
                    'player_out': player_out,
                    'result': result
                })
            elif tx['kind'] == 'f':  # Free agent
                free_agents.append({
                    'gw': gw,
                    'manager': manager,
                    'player_in': player_in,
                    'player_out': player_out,
                    'date': date_str
                })
            elif tx['kind'] == 't':  # Trade
                # Trades need special handling for offered_to
                # For now, we'll mark as TBD
                trades.append({
                    'gw': gw,
                    'offered_by': manager,
                    'offered_to': 'TBD',  # Would need additional API data
                    'offered': player_out,
                    'requested': player_in,
                    'result': 'Processed' if tx['result'] == 'a' else 'Rejected',
                    'date': date_str
                })

        print(f"  ✓ Parsed {len(waivers)} waivers, {len(free_agents)} free agents, {len(trades)} trades")

        return {
            'waivers': waivers,
            'free_agents': free_agents,
            'trades': trades
        }

    def _parse_players(self, bootstrap_data: Dict) -> List[Dict]:
        """
        Parse player performance data

        Returns:
            List of player dictionaries with stats
        """
        position_map = {1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD'}

        players = []

        for player in bootstrap_data['elements']:
            # Get team short name
            team = self.team_lookup.get(player['team'], {})
            team_short = team.get('short_name', 'UNK')

            # Get position
            position = position_map.get(player['element_type'], 'UNK')

            # Concatenate name (NO SPACES!)
            # Format: LastNameTeamPosition (e.g., "SalahLIVMID")
            player_name = f"{player['web_name']}{team_short}{position}"

            # Get points
            total_points = player.get('total_points', 0)
            event_points = player.get('event_points', 0)  # Current gameweek points

            players.append({
                'name': player_name,
                'cost': player.get('now_cost', 0) / 10,  # Cost is in tenths
                'ownership': player.get('selected_by_percent', '0'),
                'form': player.get('form', '0'),
                'pts': str(total_points),
                'round_pts': str(event_points)
            })

        # Sort by total points descending
        players.sort(key=lambda x: int(x['pts']), reverse=True)

        print(f"  ✓ Parsed {len(players)} players")
        return players

    def _parse_pl_fixtures(self, fixtures_data: List[Dict], gameweek: int) -> List[Dict]:
        """
        Parse Premier League fixtures with Pacific timezone conversion

        Returns:
            List of fixture dictionaries
        """
        parsed_fixtures = []

        for fixture in fixtures_data:
            # Parse kickoff time and convert to Pacific
            kickoff_str = fixture.get('kickoff_time')
            if not kickoff_str:
                continue

            try:
                kickoff_utc = datetime.fromisoformat(kickoff_str.replace('Z', '+00:00'))
                kickoff_pacific = kickoff_utc.astimezone(self.pacific_tz)

                # Format date: "Friday 15 August 2025"
                date_str = kickoff_pacific.strftime('%A %-d %B %Y')

                # Format time: "12:00" (no AM/PM, no leading zero)
                time_str = kickoff_pacific.strftime('%-I:%M')

            except Exception as e:
                print(f"⚠️ Warning: Could not parse kickoff time: {e}")
                continue

            # Get team names
            home_team = self.team_lookup.get(fixture['team_h'], {}).get('name', 'Unknown')
            away_team = self.team_lookup.get(fixture['team_a'], {}).get('name', 'Unknown')

            parsed_fixtures.append({
                'date': date_str,
                'time': time_str,
                'home_team': home_team,
                'away_team': away_team,
                'kickoff_time': kickoff_pacific  # For sorting
            })

        # Sort by kickoff time
        parsed_fixtures.sort(key=lambda x: x['kickoff_time'])

        print(f"  ✓ Parsed {len(parsed_fixtures)} PL fixtures")
        return parsed_fixtures


# Example usage
if __name__ == '__main__':
    from config import Config
    from fpl_api_client import FPLDraftAPIClient

    # Load config and create client
    config = Config.load()
    client = FPLDraftAPIClient(config)

    # Fetch API data
    print("📡 Fetching API data...")
    api_data = {
        'league': client.get_league_details(),
        'transactions': client.get_transactions(),
        'pl_fixtures': client.get_pl_fixtures(event_id=21),
        'bootstrap': client.get_bootstrap_static()
    }

    # Parse data
    parser = DataParser(config)
    parsed_data = parser.parse(api_data, gameweek=20, is_partial=False)

    # Display results
    print("\n📊 Parsed Results:")
    print(f"  Matches: {len(parsed_data['results'])}")
    print(f"  Waivers: {len(parsed_data['transfers']['waivers'])}")
    print(f"  Free Agents: {len(parsed_data['transfers']['free_agents'])}")
    print(f"  Trades: {len(parsed_data['transfers']['trades'])}")
    print(f"  Players: {len(parsed_data['players'])}")
    print(f"  PL Fixtures: {len(parsed_data['pl_fixtures'])}")

    print("\n✅ Sample parsed match:")
    if parsed_data['results']:
        match = parsed_data['results'][0]
        print(f"  {match['home_team']} ({match['home_manager']}) {match['home_score']} - {match['away_score']} {match['away_team']} ({match['away_manager']})")

    print("\n✅ Sample parsed player:")
    if parsed_data['players']:
        player = parsed_data['players'][0]
        print(f"  {player['name']}: {player['pts']} pts (Form: {player['form']})")

    print("\n✅ Sample parsed fixture:")
    if parsed_data['pl_fixtures']:
        fixture = parsed_data['pl_fixtures'][0]
        print(f"  {fixture['date']} - {fixture['home_team']} vs {fixture['away_team']} at {fixture['time']}")
