#!/usr/bin/env python3
"""
Fetch Gameweek Data

Main orchestration script that automates the entire gameweek data fetching process:
1. Fetches data from FPL Draft API
2. Parses and transforms the data
3. Generates CSV files in exact dashboard format
4. Generates summaries and AI roasts (for finished gameweeks)
5. Generates monthly payment summaries (for end of month)
6. Ready for deployment

Usage:
    python fetch_gameweek.py --gameweek 18
    python fetch_gameweek.py --gameweek 18 --partial
    python fetch_gameweek.py --gameweek 18 --end-of-month "December,14"
"""

import argparse
import sys
from pathlib import Path

from config import Config
from fpl_api_client import FPLDraftAPIClient
from data_parser import DataParser
from csv_generator import CSVGenerator


def get_gameweeks_for_month(month):
    """Get list of gameweeks for a given month"""
    month_map = {
        'August': [1, 2, 3],
        'September': [4, 5, 6],
        'October': [7, 8, 9],
        'November': [10, 11, 12, 13],
        'December': [14, 15, 16, 17, 18],
        'January': [19, 20, 21, 22, 23],
        'February': [24, 25, 26],
        'March': [27, 28, 29, 30],
        'April': [31, 32, 33, 34],
        'May': [35, 36, 37, 38]
    }
    return month_map.get(month, [])


def get_month_for_gameweek(gameweek):
    """Get the month name for a given gameweek"""
    for month, gws in [
        ('August', [1, 2, 3]),
        ('September', [4, 5, 6]),
        ('October', [7, 8, 9]),
        ('November', [10, 11, 12, 13]),
        ('December', [14, 15, 16, 17, 18]),
        ('January', [19, 20, 21, 22, 23]),
        ('February', [24, 25, 26]),
        ('March', [27, 28, 29, 30]),
        ('April', [31, 32, 33, 34]),
        ('May', [35, 36, 37, 38])
    ]:
        if gameweek in gws:
            return month
    return None


def print_gameweek_summary(parsed_data, gameweek):
    """Print a quick summary of what happened this gameweek"""
    results = parsed_data.get('results', [])
    if not results:
        return

    print("\n" + "=" * 80)
    print(f"  📢 GAMEWEEK {gameweek} SUMMARY")
    print("=" * 80)

    # Collect all scores
    all_scores = []
    for match in results:
        all_scores.append({
            'team': match['home_team'],
            'manager': match['home_manager'],
            'score': match['home_score']
        })
        all_scores.append({
            'team': match['away_team'],
            'manager': match['away_manager'],
            'score': match['away_score']
        })

    # Sort by score descending
    all_scores.sort(key=lambda x: x['score'], reverse=True)

    # Weekly winner
    weekly_winner = all_scores[0]
    print(f"\n🏆 WEEKLY WINNER: {weekly_winner['manager']} ({weekly_winner['team']})")
    print(f"   {weekly_winner['score']} points - wins $11!")

    # Check for monthly winner
    current_month = get_month_for_gameweek(gameweek)
    month_gws = get_gameweeks_for_month(current_month)

    if current_month and month_gws and gameweek == max(month_gws):
        # This is the last gameweek of the month - calculate monthly winner
        print(f"\n🎉 END OF {current_month.upper()}!")

        # We need to calculate monthly totals from all GWs in this month
        # For now, read from the summary file if it exists
        summary_file = Path(f"gw{gameweek}/summary_gw{gameweek}.md")
        if summary_file.exists():
            content = summary_file.read_text()
            # Look for Monthly Winner section
            import re
            monthly_match = re.search(r'### Monthly Winner \(' + current_month + r'\)\s*\n🏆 \*\*(.+?)\*\* \((.+?)\) - (\d+) points', content)
            if monthly_match:
                manager = monthly_match.group(1)
                team = monthly_match.group(2)
                points = monthly_match.group(3)
                print(f"   💰 MONTHLY WINNER: {manager} ({team})")
                print(f"   {points} points across GW{min(month_gws)}-{max(month_gws)} - wins $22!")
    else:
        # Show current monthly leader
        if current_month:
            summary_file = Path(f"gw{gameweek}/summary_gw{gameweek}.md")
            if summary_file.exists():
                content = summary_file.read_text()
                import re
                leader_match = re.search(r'### Monthly Leader \(' + current_month + r'\)\s*\n🏆 \*\*(.+?)\*\* \((.+?)\) - (\d+) points', content)
                if leader_match:
                    manager = leader_match.group(1)
                    team = leader_match.group(2)
                    points = leader_match.group(3)
                    remaining_gws = [gw for gw in month_gws if gw > gameweek]
                    print(f"\n📊 {current_month.upper()} LEADER: {manager} ({team})")
                    print(f"   {points} points - {len(remaining_gws)} GW(s) remaining in month")

    # Quick stats
    print(f"\n📈 QUICK STATS:")

    # Highest and lowest scores
    highest = all_scores[0]
    lowest = all_scores[-1]
    print(f"   🔥 Highest: {highest['manager']} with {highest['score']} pts")
    print(f"   💀 Lowest: {lowest['manager']} with {lowest['score']} pts")

    # Average score
    avg_score = sum(s['score'] for s in all_scores) / len(all_scores)
    print(f"   📊 Average: {avg_score:.1f} pts")

    # Closest match
    closest_margin = float('inf')
    closest_match = None
    biggest_margin = 0
    biggest_match = None

    for match in results:
        margin = abs(match['home_score'] - match['away_score'])
        if margin < closest_margin:
            closest_margin = margin
            closest_match = match
        if margin > biggest_margin:
            biggest_margin = margin
            biggest_match = match

    if closest_match:
        print(f"   🎯 Closest: {closest_match['home_team']} {closest_match['home_score']}-{closest_match['away_score']} {closest_match['away_team']} (margin: {closest_margin})")
    if biggest_match:
        print(f"   💥 Biggest: {biggest_match['home_team']} {biggest_match['home_score']}-{biggest_match['away_score']} {biggest_match['away_team']} (margin: {biggest_margin})")

    # Results summary
    print(f"\n⚽ RESULTS:")
    for match in results:
        home_result = "W" if match['home_score'] > match['away_score'] else ("L" if match['home_score'] < match['away_score'] else "D")
        away_result = "W" if match['away_score'] > match['home_score'] else ("L" if match['away_score'] < match['home_score'] else "D")
        print(f"   {match['home_team'][:20]:<20} {match['home_score']:>2} - {match['away_score']:<2} {match['away_team'][:20]:<20}")

    print("")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Fetch FPL Draft gameweek data and generate CSV files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch GW18 (auto-detects: not started/partial/final)
  python fetch_gameweek.py --gameweek 18

  # Force partial results mode (overrides auto-detection)
  python fetch_gameweek.py --gameweek 18 --partial

  # Fetch GW18 and generate monthly payment summary for December (GW14-18)
  python fetch_gameweek.py --gameweek 18 --end-of-month "December,14"

  # Specify previous gameweek for copying static files
  python fetch_gameweek.py --gameweek 18 --previous-gw 17

  # Skip static files
  python fetch_gameweek.py --gameweek 18 --no-static

Auto-detection logic:
  - Not started: No matches started → No results file created
  - In progress: Some matches started but not all finished → partial_results file
  - Complete: All matches finished → final_results file + summaries + AI roast
        """
    )

    parser.add_argument(
        '--gameweek', '-g',
        type=int,
        required=True,
        help='Gameweek number to fetch (e.g., 18)'
    )

    parser.add_argument(
        '--partial', '-p',
        action='store_true',
        help='Force partial results mode (auto-detected by default based on match status)'
    )

    parser.add_argument(
        '--previous-gw',
        type=int,
        help='Previous gameweek to copy static files from (default: gameweek - 1)'
    )

    parser.add_argument(
        '--no-static',
        action='store_true',
        help='Do not copy static files from previous gameweek'
    )

    parser.add_argument(
        '--output-dir', '-o',
        type=str,
        help='Custom output directory (default: gwX/)'
    )

    parser.add_argument(
        '--end-of-month',
        type=str,
        metavar='MONTH,START_GW',
        help='Generate monthly payment summary (format: "December,14" or "December,14,18")'
    )

    return parser.parse_args()


def main():
    """Main execution flow"""
    # Parse arguments
    args = parse_arguments()

    gameweek = args.gameweek
    is_partial = args.partial
    previous_gw = args.previous_gw or (gameweek - 1)
    output_dir = args.output_dir or f"gw{gameweek}"

    print("=" * 80)
    print(f"  FPL DRAFT GAMEWEEK DATA FETCHER")
    print("=" * 80)
    print(f"\n📊 Fetching data for Gameweek {gameweek}")
    print(f"📁 Output directory: {output_dir}/\n")

    # Step 1: Load configuration
    print("🔧 Loading configuration...")
    try:
        config = Config.load()
        is_valid, errors = config.validate()

        if not is_valid:
            print("❌ Configuration errors:")
            for error in errors:
                print(f"  - {error}")
            print("\nPlease fix configuration and try again.")
            sys.exit(1)

        print(f"  ✓ League ID: {config.league_id}")
        print(f"  ✓ Entry ID: {config.entry_id}")
        print(f"  ✓ Timezone: {config.timezone}")

    except Exception as e:
        print(f"❌ Failed to load configuration: {e}")
        sys.exit(1)

    # Step 2: Create API client
    print("\n📡 Initializing API client...")
    try:
        client = FPLDraftAPIClient(config)
        print("  ✓ API client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize API client: {e}")
        sys.exit(1)

    # Step 3: Fetch data from APIs
    print("\n📥 Fetching data from FPL APIs...")
    try:
        api_data = {
            'league': client.get_league_details(),
            'transactions': client.get_transactions(),
            'pl_fixtures': client.get_pl_fixtures(event_id=gameweek),
            'bootstrap': client.get_bootstrap_static(),
            'draft_bootstrap': client.get_draft_bootstrap()  # For transaction player name lookups
        }
        print("  ✓ All API data fetched successfully")
    except Exception as e:
        print(f"❌ Failed to fetch API data: {e}")
        print("\nIf you see authentication errors, your bearer token may have expired.")
        print("Get a new token from Chrome DevTools → Network tab → x-api-authorization header")
        sys.exit(1)

    # Step 4: Auto-detect gameweek status if not explicitly set
    if not args.partial:
        # Check if gameweek is complete or in progress
        matches = [m for m in api_data['league']['matches'] if m['event'] == gameweek]
        if matches:
            all_finished = all(m['finished'] for m in matches)
            any_started = any(m['started'] for m in matches)

            if not any_started:
                print(f"📊 Auto-detected: GW{gameweek} hasn't started yet")
                is_partial = False
            elif not all_finished:
                print(f"📊 Auto-detected: GW{gameweek} in progress (partial results)")
                is_partial = True
            else:
                print(f"📊 Auto-detected: GW{gameweek} is complete (final results)")
                is_partial = False
        else:
            print(f"📊 No matches found for GW{gameweek}")
            is_partial = False

    # Step 5: Parse data
    print(f"\n🔄 Parsing data...")
    try:
        parser = DataParser(config)
        parsed_data = parser.parse(api_data, gameweek=gameweek, is_partial=is_partial)
    except Exception as e:
        print(f"❌ Failed to parse data: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Step 5: Generate CSV files
    print(f"\n📝 Generating CSV files...")
    try:
        generator = CSVGenerator(output_dir=output_dir)
        generator.generate_all(parsed_data, gameweek=gameweek, is_partial=is_partial)
    except Exception as e:
        print(f"❌ Failed to generate CSV files: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Step 6: Copy static files
    if not args.no_static:
        print(f"\n📋 Copying static files from gw{previous_gw}...")
        try:
            generator.copy_static_files(previous_gameweek=previous_gw)
        except Exception as e:
            print(f"⚠️ Warning: Failed to copy static files: {e}")
            print("  You may need to copy them manually")

    # Step 7: Generate summaries (only for finished gameweeks with actual results)
    has_results = len(parsed_data.get('results', [])) > 0

    if not is_partial and has_results:
        import subprocess

        # Generate summary CSV
        print(f"\n📊 Generating summary CSV...")
        try:
            result = subprocess.run(
                ['python3', 'generate_summary.py', str(gameweek)],
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                print(f"  ✓ Summary CSV generated")
            else:
                print(f"  ⚠️ Warning: Summary generation had issues:")
                print(f"     {result.stderr}")
        except Exception as e:
            print(f"  ⚠️ Warning: Failed to generate summary CSV: {e}")

        # Generate AI summary
        print(f"\n🤖 Generating AI summary...")
        try:
            result = subprocess.run(
                ['python3', 'generate_ai_summary.py', str(gameweek)],
                capture_output=True,
                text=True,
                timeout=240  # Increased to 4 minutes for Claude API response time
            )
            if result.returncode == 0:
                print(f"  ✓ AI summary generated")
            else:
                print(f"  ⚠️ Warning: AI summary generation had issues:")
                print(f"     {result.stderr}")
        except Exception as e:
            print(f"  ⚠️ Warning: Failed to generate AI summary: {e}")
    elif not has_results:
        print(f"\n⏸️  Skipping summaries - GW{gameweek} hasn't started yet (0 matches played)")

    # Step 8: Print gameweek summary (for finished gameweeks)
    if not is_partial and has_results:
        print_gameweek_summary(parsed_data, gameweek)

    # Step 9: Generate monthly payment summary (if end of month)
    if args.end_of_month:
        import subprocess

        # Parse end_of_month parameter: "December,14" or "December,14,18"
        parts = args.end_of_month.split(',')
        if len(parts) < 2:
            print(f"\n⚠️ Warning: Invalid --end-of-month format. Use 'Month,StartGW' or 'Month,StartGW,EndGW'")
        else:
            month_name = parts[0].strip()
            start_gw = int(parts[1].strip())
            end_gw = int(parts[2].strip()) if len(parts) > 2 else gameweek

            print(f"\n💰 Generating monthly payment summary for {month_name}...")
            try:
                result = subprocess.run(
                    ['python3', 'generate_monthly_payments.py', month_name, str(start_gw), str(end_gw)],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode == 0:
                    print(f"  ✓ Monthly payment summary generated")
                    print(f"  📄 Saved to: gw{end_gw}/monthly_payments_{month_name.lower()}.md")
                else:
                    print(f"  ⚠️ Warning: Monthly payment generation had issues:")
                    print(f"     {result.stderr}")
            except Exception as e:
                print(f"  ⚠️ Warning: Failed to generate monthly payment summary: {e}")

    # Success!
    print("\n" + "=" * 80)
    print("  ✅ SUCCESS!")
    print("=" * 80)
    print(f"\n📁 Generated files in {output_dir}/:")

    # List generated files
    output_path = Path(output_dir)
    if output_path.exists():
        for file in sorted(output_path.glob('*.csv')):
            size = file.stat().st_size
            print(f"  - {file.name} ({size:,} bytes)")

    print("\n🚀 Next steps:")
    print(f"  1. Review generated CSV files in {output_dir}/")
    print(f"  2. Test locally: python serve_dashboard.py")
    print(f"  3. Deploy: python deploy-github-clean.py")
    print(f"  4. Commit and push to GitHub")
    print("\n✨ Done!\n")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
