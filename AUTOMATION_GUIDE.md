# FPL Dashboard Automation Guide

## Overview

Your FPL Draft Dashboard now has **fully automated data fetching**! No more manual copy-pasting from the website to Google Sheets.

## What Was Built

### Core Modules

1. **`config.py`** - Configuration management
   - Loads settings from `fpl_config.json` and `.env`
   - Validates league ID, entry ID, bearer token, timezone

2. **`fpl_api_client.py`** - API client
   - Fetches data from FPL Draft API with Bearer token authentication
   - Handles rate limiting and retries
   - Caches bootstrap data for efficiency

3. **`data_parser.py`** - Data transformation
   - Converts JSON API responses to CSV-ready format
   - Handles player name concatenation (e.g., "SalahLIVMID")
   - Parses transfer history with proper denial reasons
   - Converts PL fixtures to Pacific timezone

4. **`csv_generator.py`** - CSV file generation
   - Writes CSV files in exact dashboard format
   - Handles multi-line quoted cells for match results
   - Generates 3-section transfer history
   - Copies static files from previous gameweek

5. **`fetch_gameweek.py`** - Main orchestration script
   - Entry point for fetching gameweek data
   - Command-line interface for flexibility
   - Error handling and detailed logging

## Quick Start

### 1. Fetch Final Results for Current Gameweek

```bash
python3 fetch_gameweek.py --gameweek 18
```

This will:
- Fetch all data from FPL APIs
- Generate all CSV files in `gw18/`
- Copy static files from `gw17/`
- Ready for deployment!

### 2. Fetch Partial Results (In-Progress Gameweek)

```bash
python3 fetch_gameweek.py --gameweek 18 --partial
```

This generates `partial_results_gw18.csv` instead of `final_results_gw18.csv`.

### 3. Custom Options

```bash
# Specify previous gameweek to copy from
python3 fetch_gameweek.py --gameweek 18 --previous-gw 16

# Custom output directory
python3 fetch_gameweek.py --gameweek 18 --output-dir custom_gw18

# Skip copying static files
python3 fetch_gameweek.py --gameweek 18 --no-static
```

## Generated Files

### Always Generated
- `final_results_gwX.csv` or `partial_results_gwX.csv` - H2H match results
- `transfer_history.csv` - Cumulative waivers, free agents, trades
- `players_gwX.csv` - Player performance stats
- `pl_gwX.csv` - Premier League fixtures in Pacific time

### Copied from Previous Gameweek
- `fixture_list.csv` - League fixture schedule (static)
- `starting_draft.csv` - Draft order (static)

## Typical Workflow

### Before Automation (20+ minutes)
1. Go to draft.premierleague.com
2. Copy data to Google Sheets
3. Download CSVs from Sheets
4. Create `gwX/` directory
5. Paste CSV files
6. Run local tests
7. Deploy to GitHub Pages
8. Commit and push

### After Automation (2 minutes)
1. Run: `python3 fetch_gameweek.py --gameweek 18`
2. Review generated files (optional)
3. Deploy: `python3 deploy-github-clean.py`
4. Commit and push

**Time saved: 18+ minutes per gameweek!**

## Configuration Files

### `fpl_config.json`
```json
{
  "league_id": 18617,
  "entry_id": 82324,
  "auth_method": "bearer_token",
  "timezone": "America/Los_Angeles",
  "team_name_mapping": {
    "Harry Liu": "cunha believe it",
    "Andrew Smith": "Cunha Get Me Points",
    "Kyle Herrera": "Extended Foreplay",
    "Josiah Loh": "thenotsospecialone",
    "Ronangel Rojas": "Atlético SeaSlug",
    "Sean Dunn": "Gweepy",
    "Roy Boateng": "This Year FC",
    "Don Kim": "son4lyfe",
    "Peter Henze": "Peattle Pounders",
    "Noah Wilson": "Trophies Matter FC",
    "Zryan Bhao": "FootAndBallFetish",
    "chris duncam": "Schrödongers"
  }
}
```

**Team Name Mapping**: The `team_name_mapping` preserves original team names even when managers change their team names on the FPL website. The script always uses the original names from this mapping in the generated CSV files.

### `.env`
```
FPL_BEARER_TOKEN=Bearer eyJhbGci...
```

**Note:** Bearer tokens expire every ~8 hours. If you get authentication errors:
1. Open Chrome DevTools (F12) → Network tab
2. Visit draft.premierleague.com
3. Find any API request
4. Copy `x-api-authorization` header value
5. Update `.env` file

## Validation

### Test Run Comparison

We tested the automation with GW17 data and compared it to your manual CSV files:

#### ✅ Perfect Matches
- **CSV Format**: Multi-line quoted cells, exact headers
- **Player Names**: Concatenated correctly (e.g., "HaalandMCIFWD")
- **Transfer History**: Proper 3-section format with denial reasons
- **PL Fixtures**: Pacific timezone, 4-line format per match
- **Match Results**: Team names, manager names, scores

#### ℹ️ Team Name Preservation
- **Original Names Preserved**: The automation uses the `team_name_mapping` in `fpl_config.json` to always use original team names, even when managers change their team names on the FPL website
- **Example**: If Zryan Bhao changes their team name to "MattyCashMeOutside", the CSV will still show "FootAndBallFetish"
- **Transaction Count**: API has more recent data than older manual files
- **All differences are expected and correct!**

## Troubleshooting

### Authentication Error
```
❌ Authentication failed (HTTP 401)
```
**Solution:** Update your bearer token in `.env` file (see Configuration Files section)

### Missing Static Files Warning
```
⚠️ Warning: gw17/ doesn't exist, cannot copy static files
```
**Solution:** Manually specify previous gameweek: `--previous-gw 16`

### API Rate Limiting
```
❌ HTTP error 429: Too Many Requests
```
**Solution:** Script automatically retries with backoff. If it persists, wait a few minutes.

### Adding New Team Name Mappings
If someone joins the league or you want to update a team name mapping:

1. Edit `fpl_config.json`
2. Add/update entry in `team_name_mapping`:
   ```json
   "Manager Name": "Team Name To Use In CSVs"
   ```
3. Next fetch will use the updated mapping

## Next Steps

### Phase 2: GitHub Actions (Optional)

To fully automate with GitHub Actions (zero manual steps):

1. Create `.github/workflows/update-gameweek.yml`
2. Set GitHub Secrets: `FPL_BEARER_TOKEN`, `FPL_LEAGUE_ID`, `FPL_ENTRY_ID`
3. Schedule workflow to run every Monday 8 AM Pacific
4. Automatic deployment to GitHub Pages

See the plan file for detailed implementation steps.

## Testing

### Test with Historical Data
```bash
# Test with GW17 (already exists)
python3 fetch_gameweek.py --gameweek 17 --output-dir test_gw17

# Compare with manual file
diff gw17/final_results_gw17.csv test_gw17/final_results_gw17.csv
```

### Validate Generated Files
```bash
# Check file structure
ls -lh gwX/

# Preview files
head gwX/final_results_gwX.csv
head gwX/transfer_history.csv
head gwX/players_gwX.csv
head gwX/pl_gwX.csv
```

## Support

If you encounter issues:
1. Check `.env` file has valid bearer token
2. Verify `fpl_config.json` has correct league/entry IDs
3. Run with `--help` to see all options
4. Check error messages for specific guidance

## Summary

✅ **Working Features:**
- Full API integration with FPL Draft
- Automatic data parsing and transformation
- Exact CSV format matching
- Pacific timezone conversion
- Transfer history with denial reasons
- Player performance stats
- Premier League fixtures
- Error handling and validation

🎉 **Your dashboard workflow is now 90% automated!**

---

Built with Claude Code on 2026-01-05
