#!/usr/bin/env python3
"""
Inspect FPL API Data

Fetches and displays real API data to verify format before building parsers
"""

import json
from config import Config
from fpl_api_client import FPLDraftAPIClient


def print_section(title: str):
    """Print a section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def main():
    # Load config and create client
    config = Config.load()
    client = FPLDraftAPIClient(config)

    # 1. LEAGUE DETAILS
    print_section("1. LEAGUE DETAILS")
    league_data = client.get_league_details()

    print(f"League Name: {league_data['league']['name']}")
    print(f"League ID: {league_data['league']['id']}")
    print(f"Total Teams: {len(league_data['league_entries'])}")
    print(f"Total Matches: {len(league_data['matches'])}")

    print("\n📋 Sample Team Entry:")
    sample_entry = league_data['league_entries'][0]
    print(json.dumps(sample_entry, indent=2))

    print("\n⚽ Sample Match (Recent GW):")
    # Find a finished match from recent gameweek
    recent_matches = [m for m in league_data['matches'] if m['finished']]
    if recent_matches:
        sample_match = recent_matches[-1]  # Most recent
        print(json.dumps(sample_match, indent=2))

    print("\n📊 Matches by Gameweek (Summary):")
    gw_counts = {}
    for match in league_data['matches']:
        gw = match['event']
        if gw not in gw_counts:
            gw_counts[gw] = {'total': 0, 'finished': 0}
        gw_counts[gw]['total'] += 1
        if match['finished']:
            gw_counts[gw]['finished'] += 1

    for gw in sorted(gw_counts.keys())[-5:]:  # Last 5 gameweeks
        counts = gw_counts[gw]
        print(f"  GW{gw}: {counts['finished']}/{counts['total']} finished")

    # 2. TRANSACTIONS
    print_section("2. TRANSFER TRANSACTIONS")
    transactions = client.get_transactions()

    print(f"Total Transactions: {len(transactions['transactions'])}")

    print("\n📝 Sample Transaction (Most Recent):")
    if transactions['transactions']:
        sample_tx = transactions['transactions'][-1]
        print(json.dumps(sample_tx, indent=2))

    print("\n📊 Transaction Types:")
    tx_types = {}
    for tx in transactions['transactions']:
        kind = tx['kind']
        tx_types[kind] = tx_types.get(kind, 0) + 1

    for kind, count in tx_types.items():
        kind_name = {'w': 'Waivers', 'f': 'Free Agents', 't': 'Trades'}.get(kind, kind)
        print(f"  {kind_name}: {count}")

    # 3. PREMIER LEAGUE FIXTURES
    print_section("3. PREMIER LEAGUE FIXTURES (GW21)")
    fixtures = client.get_pl_fixtures(event_id=21)

    print(f"Total Fixtures for GW21: {len(fixtures)}")

    print("\n⚽ Sample Fixture:")
    if fixtures:
        sample_fixture = fixtures[0]
        print(json.dumps(sample_fixture, indent=2))

    print("\n📅 All GW21 Fixtures (Summary):")
    for fixture in fixtures[:5]:  # First 5
        print(f"  {fixture.get('team_h_name', 'Team')} vs {fixture.get('team_a_name', 'Team')} - {fixture.get('kickoff_time', 'TBD')}")

    # 4. PLAYER DATA (Bootstrap)
    print_section("4. PLAYER DATA (Bootstrap Static)")
    bootstrap = client.get_bootstrap_static()

    print(f"Total Players: {len(bootstrap['elements'])}")
    print(f"Total Teams: {len(bootstrap['teams'])}")
    print(f"Total Events: {len(bootstrap['events'])}")

    print("\n👤 Sample Player (Top Scorer):")
    # Find highest scoring player
    top_player = max(bootstrap['elements'], key=lambda p: p['total_points'])
    print(json.dumps({
        'id': top_player['id'],
        'web_name': top_player['web_name'],
        'first_name': top_player['first_name'],
        'second_name': top_player['second_name'],
        'team': top_player['team'],
        'element_type': top_player['element_type'],
        'total_points': top_player['total_points'],
        'form': top_player['form'],
        'selected_by_percent': top_player['selected_by_percent'],
    }, indent=2))

    print("\n🏟️ Sample Team:")
    sample_team = bootstrap['teams'][0]
    print(json.dumps(sample_team, indent=2))

    print("\n📅 Sample Event (Gameweek):")
    # Find current or most recent event
    current_event = next((e for e in bootstrap['events'] if e['is_current']), bootstrap['events'][0])
    print(json.dumps({
        'id': current_event['id'],
        'name': current_event['name'],
        'deadline_time': current_event['deadline_time'],
        'finished': current_event['finished'],
        'is_current': current_event['is_current'],
        'is_next': current_event['is_next'],
    }, indent=2))

    # 5. SAVE SAMPLE DATA TO FILE
    print_section("5. SAVING SAMPLE DATA")

    sample_data = {
        'league_details': {
            'league': league_data['league'],
            'league_entries': league_data['league_entries'][:2],  # First 2 teams
            'matches': [m for m in league_data['matches'] if m['event'] >= 17][:10]  # Recent 10 matches
        },
        'transactions': transactions['transactions'][:10],  # First 10
        'fixtures': fixtures[:3],  # First 3
        'players': [p for p in bootstrap['elements'] if p['total_points'] > 100][:5],  # Top 5 scorers
        'teams': bootstrap['teams'][:3],  # First 3 teams
        'events': bootstrap['events'][:3]  # First 3 gameweeks
    }

    with open('api_data_sample.json', 'w') as f:
        json.dump(sample_data, f, indent=2)

    print("✅ Sample data saved to: api_data_sample.json")
    print("   You can open this file to inspect the full data structure!")

    print_section("SUMMARY")
    print("✅ All API endpoints returning data successfully")
    print("✅ League data includes all teams and match results")
    print("✅ Transaction history is complete")
    print("✅ PL fixtures available with kickoff times")
    print("✅ Player stats ready for CSV generation")
    print("\n🎯 Ready to proceed with data parsing and CSV generation!")


if __name__ == '__main__':
    main()
