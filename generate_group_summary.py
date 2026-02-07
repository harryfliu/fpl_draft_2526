#!/usr/bin/env python3
"""
Group Chat Summary Generator for FPL Dashboard

Generates a plain-text, iMessage-friendly summary including:
- Gameweek results and highlights
- Monthly recap with weekly winners
- Net Venmo payments for the current month

Usage: python generate_group_summary.py <gameweek_number>
"""

import sys
from pathlib import Path
from collections import defaultdict

from generate_monthly_payments import (
    read_gameweek_results,
    calculate_monthly_totals,
    get_weekly_winners,
    calculate_payments,
)
from fetch_gameweek import get_month_for_gameweek, get_gameweeks_for_month

# Venmo handles for each manager
VENMO_HANDLES = {
    "Andrew Smith": "@andrew-smith-224",
    "Josiah Loh": "@josiah-loh",
    "Roy Boateng": "@roy-boateng",
    "chris duncam": "@chrisduncan21",
    "Ronangel Rojas": "@ronangel-rojas",
    "Kyle Herrera": "@mastaphobia",
    "Sean Dunn": "@spjdunn",
    "Peter Henze": "@liahenze",
    "Don Kim": "@dkbananas",
    "Harry Liu": "@harryfliu",
    "Zryan Bhao": "@bryan-zhao",
    "Noah Wilson": "@noah_wilson",
}

# Short display names for text messages
FIRST_NAMES = {
    "Andrew Smith": "Andrew",
    "Josiah Loh": "Josiah",
    "Roy Boateng": "Roy",
    "chris duncam": "Chris",
    "Ronangel Rojas": "Ron",
    "Kyle Herrera": "Kyle",
    "Sean Dunn": "Sean",
    "Peter Henze": "Peter",
    "Don Kim": "Don",
    "Harry Liu": "Harry",
    "Zryan Bhao": "Zryan",
    "Noah Wilson": "Noah",
}


def first(name):
    return FIRST_NAMES.get(name, name.split()[0])


def parse_h2h_results(gameweek):
    """Parse head-to-head match results from final_results CSV"""
    import csv

    results_file = Path(f"gw{gameweek}") / f"final_results_gw{gameweek}.csv"
    if not results_file.exists():
        return []

    matches = []
    with open(results_file, "r") as f:
        reader = csv.reader(f)
        next(reader)  # Skip "Gameweek X" header

        for row in reader:
            if len(row) < 3 or not row[0].strip():
                continue

            home_parts = row[0].strip().split("\n")
            away_parts = row[2].strip().split("\n")

            if len(home_parts) < 2 or len(away_parts) < 2:
                continue

            score = row[1].strip().split(" - ")
            if len(score) != 2:
                continue

            matches.append(
                {
                    "home_manager": home_parts[1].strip(),
                    "away_manager": away_parts[1].strip(),
                    "home_score": int(score[0].strip()),
                    "away_score": int(score[1].strip()),
                }
            )

    return matches


def generate_group_summary(gameweek):
    """Generate plain-text group chat summary"""
    gw = int(gameweek)
    lines = []

    # --- Section 1: GW Results ---
    matches = parse_h2h_results(gw)
    scores = read_gameweek_results(gw)

    if not matches or not scores:
        return f"No results found for GW{gw}"

    lines.append(f"⚽ FPL DRAFT - GW{gw} RECAP")
    lines.append("")
    lines.append("📊 RESULTS")

    for m in matches:
        home = first(m["home_manager"])
        away = first(m["away_manager"])
        lines.append(f"{home} {m['home_score']} - {m['away_score']} {away}")

    # Weekly winner
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    winner_name, winner_pts = sorted_scores[0]
    num_others = len(scores) - 1
    lines.append("")
    lines.append(f"🏆 Weekly Winner: {first(winner_name)} ({winner_pts} pts) - ${num_others}!")

    # Biggest blowout & closest match
    margins = []
    for m in matches:
        diff = abs(m["home_score"] - m["away_score"])
        winner = m["home_manager"] if m["home_score"] > m["away_score"] else m["away_manager"]
        loser = m["away_manager"] if m["home_score"] > m["away_score"] else m["home_manager"]
        margins.append((diff, winner, loser, m["home_score"], m["away_score"], m["home_manager"]))

    margins.sort(key=lambda x: x[0])
    closest = margins[0]
    biggest = margins[-1]

    # Format with correct score order (home first)
    if closest[2] == closest[5]:  # loser was home team
        lines.append(f"🎯 Closest: {first(closest[2])} {closest[3]}-{closest[4]} {first(closest[1])} (+{closest[0]})")
    else:
        lines.append(f"🎯 Closest: {first(closest[1])} {closest[3]}-{closest[4]} {first(closest[2])} (+{closest[0]})")

    if biggest[2] == biggest[5]:  # loser was home team
        lines.append(f"💥 Blowout: {first(biggest[2])} {biggest[3]}-{biggest[4]} {first(biggest[1])} (+{biggest[0]})")
    else:
        lines.append(f"💥 Blowout: {first(biggest[1])} {biggest[3]}-{biggest[4]} {first(biggest[2])} (+{biggest[0]})")

    # --- Section 2: Monthly Recap ---
    current_month = get_month_for_gameweek(gw)
    month_gws = get_gameweeks_for_month(current_month)
    month_complete = gw >= max(month_gws)
    completed_gws = [g for g in month_gws if g <= gw]

    lines.append("")
    status = "COMPLETE" if month_complete else "IN PROGRESS"
    gw_range = f"GW{min(month_gws)}-{max(month_gws)}"
    lines.append(f"📅 {current_month.upper()} RECAP ({gw_range}) - {status}")
    lines.append("")

    # Weekly winners for the month
    weekly_winners = get_weekly_winners(min(completed_gws), max(completed_gws))
    lines.append("Weekly Winners:")
    for w in weekly_winners:
        lines.append(f"GW{w['gameweek']}: {first(w['manager'])} ({w['points']} pts)")

    # Monthly totals
    monthly_totals = calculate_monthly_totals(min(completed_gws), max(completed_gws))
    sorted_monthly = sorted(monthly_totals.items(), key=lambda x: x[1], reverse=True)

    if month_complete:
        monthly_winner_name, monthly_winner_pts = sorted_monthly[0]
        lines.append("")
        lines.append(f"🏆 Monthly Winner: {first(monthly_winner_name)} ({monthly_winner_pts} pts)")

        # Show full leaderboard
        medals = ["🥇", "🥈", "🥉"]
        for i, (name, pts) in enumerate(sorted_monthly):
            if i < 3:
                lines.append(f"{medals[i]} {first(name)} - {pts} pts")
            else:
                lines.append(f"{i+1}. {first(name)} - {pts} pts")
    else:
        leader_name, leader_pts = sorted_monthly[0]
        lines.append("")
        lines.append(f"📈 Current Leader: {first(leader_name)} ({leader_pts} pts)")
        for i, (name, pts) in enumerate(sorted_monthly[:3]):
            medals = ["🥇", "🥈", "🥉"]
            lines.append(f"{medals[i]} {first(name)} - {pts} pts")

    # --- Section 3: Venmo Payments (gross) ---
    if month_complete:
        all_managers = list(monthly_totals.keys())
        payments = calculate_payments(weekly_winners, sorted_monthly[0][0], all_managers)

        lines.append("")
        lines.append(f"💰 {current_month.upper()} VENMO")
        lines.append("")

        # Build gross payment list per payer, sorted by total owed descending
        payer_totals = []
        for payer in all_managers:
            debts = payments[payer]
            total = sum(debts.values())
            if total > 0:
                payer_totals.append((payer, total, dict(debts)))
        payer_totals.sort(key=lambda x: x[1], reverse=True)

        for payer, total, debts in payer_totals:
            parts = []
            for payee, amount in sorted(debts.items(), key=lambda x: x[1], reverse=True):
                if amount > 0:
                    parts.append(f"${amount} to {first(payee)}")
            debt_str = ", ".join(parts)
            lines.append(f"{first(payer)}: {debt_str} = ${total}")

        lines.append("")
        lines.append("Pay up! 💸")

        # Venmo handles
        lines.append("")
        lines.append("Venmo handles:")
        for name in sorted(all_managers):
            handle = VENMO_HANDLES.get(name, "???")
            lines.append(f"{first(name)}: {handle}")

    output = "\n".join(lines)
    return output


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_group_summary.py <gameweek_number>")
        sys.exit(1)

    gameweek = int(sys.argv[1])

    summary = generate_group_summary(gameweek)

    # Save to file
    output_file = Path(f"gw{gameweek}") / f"group_summary_gw{gameweek}.txt"
    with open(output_file, "w") as f:
        f.write(summary)

    print(summary)
    print(f"\n---\nSaved to: {output_file}")


if __name__ == "__main__":
    main()
