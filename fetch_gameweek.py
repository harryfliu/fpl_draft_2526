#!/usr/bin/env python3
"""
Fetch Gameweek Data

Main orchestration script that automates the entire gameweek data fetching process:
1. Fetches data from FPL Draft API
2. Parses and transforms the data
3. Generates CSV files in exact dashboard format
4. Ready for deployment

Usage:
    python fetch_gameweek.py --gameweek 18
    python fetch_gameweek.py --gameweek 18 --partial
    python fetch_gameweek.py --gameweek 18 --previous-gw 17
"""

import argparse
import sys
from pathlib import Path

from config import Config
from fpl_api_client import FPLDraftAPIClient
from data_parser import DataParser
from csv_generator import CSVGenerator


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Fetch FPL Draft gameweek data and generate CSV files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch final results for GW18
  python fetch_gameweek.py --gameweek 18

  # Fetch partial results for GW18 (in-progress)
  python fetch_gameweek.py --gameweek 18 --partial

  # Specify previous gameweek for copying static files
  python fetch_gameweek.py --gameweek 18 --previous-gw 17

  # Skip static files
  python fetch_gameweek.py --gameweek 18 --no-static
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
        help='Fetch partial results (for in-progress gameweek)'
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
    print(f"\n📊 Fetching {'PARTIAL' if is_partial else 'FINAL'} results for Gameweek {gameweek}")
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
            'bootstrap': client.get_bootstrap_static()
        }
        print("  ✓ All API data fetched successfully")
    except Exception as e:
        print(f"❌ Failed to fetch API data: {e}")
        print("\nIf you see authentication errors, your bearer token may have expired.")
        print("Get a new token from Chrome DevTools → Network tab → x-api-authorization header")
        sys.exit(1)

    # Step 4: Parse data
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
    has_results = len(parsed_data.get('matches', [])) > 0

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
