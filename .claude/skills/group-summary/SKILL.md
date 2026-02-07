---
name: group-summary
description: Generates a plain-text iMessage-friendly summary for the group chat. Use when the user asks for a group chat summary, text summary, Venmo payments, or monthly recap.
allowed-tools: Bash(python3:*), Bash(pbcopy), Read
---

# Group Chat Summary Generator

Generates a plain-text summary suitable for iMessage/text group chats, including GW results, monthly recap, and Venmo payment instructions.

## What This Skill Does

1. Runs `generate_group_summary.py` with the specified gameweek number
2. Produces a plain-text (no markdown) summary with:
   - Head-to-head match results for the gameweek
   - Weekly winner and prize amount
   - Closest match and biggest blowout
   - Monthly recap with all weekly winners
   - Monthly leaderboard (if month is complete)
   - Venmo payment breakdown per person (gross, current month only)
   - Venmo handles for easy payment
3. Saves output to `gw{N}/group_summary_gw{N}.txt`

## Usage Examples

### Generate summary for latest gameweek
User: "Send the group summary" / "Text group recap" / "Group chat summary"

I will:
- Auto-detect the latest gameweek (highest `gw{N}` folder with `final_results_gw{N}.csv`)
- Run the script and present the output
- Offer to copy to clipboard

### Generate summary for a specific gameweek
User: "Group summary for GW21"

I will:
- Run the script for the specified gameweek
- Present the output

## Commands I Execute

```bash
# Generate the summary
python3 generate_group_summary.py <gameweek_number>

# Copy to clipboard (macOS)
python3 generate_group_summary.py <gameweek_number> | pbcopy
```

## Auto-Detecting Latest Gameweek

To find the latest gameweek, look for the highest-numbered `gw{N}` folder that contains `final_results_gw{N}.csv`:

```bash
python3 -c "from pathlib import Path; gws = [int(p.name[2:]) for p in Path('.').glob('gw*/final_results_gw*.csv')]; print(max(gws))"
```

## After Running

1. Present the plain-text output to the user
2. Ask if they want it copied to clipboard
3. If yes, pipe to `pbcopy`

## Important Notes

- Output is plain text with emoji — no markdown formatting
- Venmo payments show **gross** amounts (not netted), matching the dashboard's payment calculations
- Monthly payments only appear when the month is complete (all GWs played)
- Uses first names only for text-group friendliness
- Venmo handles are appended at the end for easy lookup
