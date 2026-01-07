#!/usr/bin/env python3
"""
CSV Generator Module

Generates CSV files in the exact format required by the FPL Dashboard.
Handles multi-line quoted cells, proper escaping, and exact header formats.
"""

import csv
import os
from typing import Dict, List
from pathlib import Path


class CSVGenerator:
    """Generates CSV files matching the exact dashboard format"""

    def __init__(self, output_dir: str):
        """
        Initialize generator

        Args:
            output_dir: Directory to write CSV files (e.g., "gw18/")
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_all(self, parsed_data: Dict, gameweek: int, is_partial: bool):
        """
        Generate all CSV files from parsed data

        Args:
            parsed_data: Dict with 'results', 'transfers', 'players', 'pl_fixtures'
            gameweek: Gameweek number
            is_partial: Whether this is partial results
        """
        print(f"📝 Generating CSV files for GW{gameweek}...")

        # Generate match results
        # Only generate if: partial mode OR (final mode AND matches exist)
        has_matches = len(parsed_data['results']) > 0

        if is_partial:
            # Always generate partial results (even if 0-0, it shows in-progress)
            results_filename = f"partial_results_gw{gameweek}.csv"
            self._generate_match_results(parsed_data['results'], gameweek, results_filename)
        elif has_matches:
            # Only generate final results if matches actually exist
            results_filename = f"final_results_gw{gameweek}.csv"
            self._generate_match_results(parsed_data['results'], gameweek, results_filename)
        else:
            print(f"  ⏸️  Skipping results file - GW{gameweek} hasn't started yet")

        # Generate transfer history (cumulative)
        self._generate_transfer_history(parsed_data['transfers'])

        # Generate player performance
        if parsed_data['players']:
            self._generate_players(parsed_data['players'], gameweek)

        # Generate PL fixtures
        if parsed_data['pl_fixtures']:
            self._generate_pl_fixtures(parsed_data['pl_fixtures'], gameweek)

        print(f"  ✓ All CSV files generated in {self.output_dir}/")

    def _generate_match_results(self, results: List[Dict], gameweek: int, filename: str):
        """
        Generate match results CSV

        Format:
            Gameweek 17,,
            "Team Name\nManager Name",50 - 50,"Team Name\nManager Name"
        """
        filepath = self.output_dir / filename

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header row
            writer.writerow([f'Gameweek {gameweek}', '', ''])

            # Match rows
            for match in results:
                # Create multi-line cells for team and manager
                home_cell = f"{match['home_team']}\n{match['home_manager']}"
                away_cell = f"{match['away_team']}\n{match['away_manager']}"
                score_cell = f"{match['home_score']} - {match['away_score']}"

                writer.writerow([home_cell, score_cell, away_cell])

        print(f"  ✓ Generated {filename} ({len(results)} matches)")

    def _generate_transfer_history(self, transfers: Dict):
        """
        Generate transfer history CSV (cumulative)

        Format:
            Waivers History,,,,,,
            GW,Manager,In,Out,Result,,
            [data rows]

            Free Agents History,,,,,,
            GW,Manager,In,Out,Date,,
            [data rows]

            Trades History,,,,,,
            GW,Offered By,Offered To,Offered,Requested,Result,Date
            [data rows]
        """
        filepath = self.output_dir / 'transfer_history.csv'

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)

            # SECTION 1: Waivers History
            writer.writerow(['Waivers History', '', '', '', '', '', ''])
            writer.writerow(['GW', 'Manager', 'In', 'Out', 'Result', '', ''])

            for waiver in transfers['waivers']:
                writer.writerow([
                    waiver['gw'],
                    waiver['manager'],
                    waiver['player_in'],
                    waiver['player_out'],
                    waiver['result'],
                    '',
                    ''
                ])

            # SECTION 2: Free Agents History
            writer.writerow(['Free Agents History', '', '', '', '', '', ''])
            writer.writerow(['GW', 'Manager', 'In', 'Out', 'Date', '', ''])

            for fa in transfers['free_agents']:
                writer.writerow([
                    fa['gw'],
                    fa['manager'],
                    fa['player_in'],
                    fa['player_out'],
                    fa['date'],
                    '',
                    ''
                ])

            # SECTION 3: Trades History
            writer.writerow(['Trades History', '', '', '', '', '', ''])
            writer.writerow(['GW', 'Offered By', 'Offered To', 'Offered', 'Requested', 'Result', 'Date'])

            for trade in transfers['trades']:
                writer.writerow([
                    trade['gw'],
                    trade['offered_by'],
                    trade['offered_to'],
                    trade['offered'],
                    trade['requested'],
                    trade['result'],
                    trade['date']
                ])

        waiver_count = len(transfers['waivers'])
        fa_count = len(transfers['free_agents'])
        trade_count = len(transfers['trades'])
        print(f"  ✓ Generated transfer_history.csv ({waiver_count} waivers, {fa_count} free agents, {trade_count} trades)")

    def _generate_players(self, players: List[Dict], gameweek: int):
        """
        Generate player performance CSV

        Format:
            Player,Cost,Sel.%,Form,Pts.,RP
            SalahLIVMID,8.5,45.60%,7.8,120,15
        """
        filepath = self.output_dir / f'players_gw{gameweek}.csv'

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow(['Player', 'Cost', 'Sel.%', 'Form', 'Pts.', 'RP'])

            # Player rows
            for player in players:
                writer.writerow([
                    player['name'],  # Already concatenated (e.g., "SalahLIVMID")
                    player['cost'],
                    player['ownership'],  # Already has % sign
                    player['form'],
                    player['pts'],
                    player['round_pts']
                ])

        print(f"  ✓ Generated players_gw{gameweek}.csv ({len(players)} players)")

    def _generate_pl_fixtures(self, fixtures: List[Dict], gameweek: int):
        """
        Generate Premier League fixtures CSV

        Format (4 lines per fixture):
            Saturday 29 November 2025
            Brentford
            7:00
            Burnley
        """
        filepath = self.output_dir / f'pl_gw{gameweek}.csv'

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)

            current_date = None

            for fixture in fixtures:
                date_str = fixture['date']

                # Write date header only when it changes
                if date_str != current_date:
                    writer.writerow([date_str])
                    current_date = date_str

                # Write fixture (3 lines: home team, time, away team)
                writer.writerow([fixture['home_team']])
                writer.writerow([fixture['time']])
                writer.writerow([fixture['away_team']])

        print(f"  ✓ Generated pl_gw{gameweek}.csv ({len(fixtures)} fixtures)")

    def copy_static_files(self, previous_gameweek: int):
        """
        Copy static files from previous gameweek

        Copies:
        - fixture_list.csv (league fixtures - static)
        - starting_draft.csv (draft order - static)

        Args:
            previous_gameweek: Previous gameweek number to copy from
        """
        previous_dir = Path(f"gw{previous_gameweek}")

        if not previous_dir.exists():
            print(f"  ⚠️ Warning: gw{previous_gameweek}/ doesn't exist, cannot copy static files")
            return

        static_files = ['fixture_list.csv', 'starting_draft.csv', 'draftdata25_26.xlsx']
        copied = 0

        for filename in static_files:
            source = previous_dir / filename
            dest = self.output_dir / filename

            if source.exists():
                import shutil
                shutil.copy2(source, dest)
                copied += 1
            else:
                print(f"  ⚠️ Warning: {source} not found")

        if copied > 0:
            print(f"  ✓ Copied {copied} static files from gw{previous_gameweek}/")


# Example usage
if __name__ == '__main__':
    from config import Config
    from fpl_api_client import FPLDraftAPIClient
    from data_parser import DataParser

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
    parsed_data = parser.parse(api_data, gameweek=21, is_partial=False)

    # Generate CSV files
    generator = CSVGenerator(output_dir='test_gw21')
    generator.generate_all(parsed_data, gameweek=21, is_partial=False)

    # Copy static files
    generator.copy_static_files(previous_gameweek=20)

    print("\n✅ CSV generation test complete!")
    print(f"   Check test_gw21/ directory for generated files")
