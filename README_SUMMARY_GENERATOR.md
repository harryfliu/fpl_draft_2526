# FPL Dashboard Summary Generator

## Overview

The `generate_summary.py` script automatically creates comprehensive markdown summaries when you provide `final_results_gw#.csv` files. It pulls together all the data from your dashboard into a nicely formatted report.

## Usage

```bash
python3 generate_summary.py <gameweek_number>
```

### Example

```bash
python3 generate_summary.py 1
```

This will:
1. Look for `gw1/final_results_gw1.csv` (required)
2. Load additional data from `gw1/` folder:
   - `starting_draft.csv` (for current squads)
   - `transfer_history.csv` (for transfer activity)
   - `players_gw1.csv` (for player team information)
   - `fixture_list.csv` (for next week's fixtures)
3. Generate a comprehensive markdown report at `gw1/summary_gw1.md`

## Generated Sections

The markdown report includes:

### 📊 Current Standings
- Full leaderboard with position, manager, team, points, GW points, stats
- Sorted by league points, then GW points, then goal difference

### ⚽ Gameweek Points
- Individual GW scores for each manager
- Ranked from highest to lowest with medal emojis

### 🔄 Transfer Activity
- Waiver claims with player names and teams
- Free agent pickups with player names and teams
- Trades with player names and teams

### 💰 Prize Money
- Weekly winner and prize amount
- Monthly winners (when available)

### ⚽ Head-to-Head Results
- All fixture results for the gameweek
- Team names and manager names clearly displayed

### 📅 Next Week's Fixtures
- Upcoming fixtures for the next gameweek
- Includes dates and times when available

### 👥 Current Squads
- Each manager's current squad after transfers
- Players grouped by position with team information

### 💳 Outstanding Payments
- Monthly breakdown of who owes what to whom
- Based on weekly winner payments ($1 from each other manager)

## File Requirements

### Required
- `gw#/final_results_gw#.csv` - Must exist for the script to run

### Optional (enhances the report)
- `gw#/starting_draft.csv` - For current squad information
- `gw#/transfer_history.csv` - For transfer activity
- `gw#/players_gw#.csv` - For player team mapping
- `gw#/fixture_list.csv` - For next week's fixtures

## Output

The script generates a markdown file at `gw#/summary_gw#.md` that can be:
- Viewed directly in any markdown viewer
- Used to replace the existing weekly summary in your dashboard
- Shared with league members
- Archived for season history

## Integration with Dashboard

The generated markdown file will automatically be picked up by your dashboard's weekly summary section, replacing any manual summary text.
