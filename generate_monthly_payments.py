#!/usr/bin/env python3
"""
Monthly Prize Payment Generator for FPL Dashboard

Generates payment summary including:
- Weekly winners ($1 from everyone else per gameweek)
- Monthly winner ($2 from everyone else)

Usage: python generate_monthly_payments.py <month_name> <start_gw> <end_gw>
Example: python generate_monthly_payments.py December 14 18
"""

import sys
import csv
from pathlib import Path
from collections import defaultdict


def read_gameweek_results(gameweek: int) -> dict:
    """Read match results and scores from a gameweek"""
    results_file = Path(f"gw{gameweek}") / f"final_results_gw{gameweek}.csv"

    if not results_file.exists():
        return {}

    scores = {}
    with open(results_file, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip "Gameweek X" header

        for row in reader:
            if len(row) < 3 or not row[0].strip():
                continue

            # Parse multi-line cells
            home_team_manager = row[0].strip().split('\n')
            away_team_manager = row[2].strip().split('\n')

            if len(home_team_manager) < 2 or len(away_team_manager) < 2:
                continue

            home_manager = home_team_manager[1].strip()
            away_manager = away_team_manager[1].strip()

            # Parse score
            score = row[1].strip().split(' - ')
            if len(score) != 2:
                continue

            home_score = int(score[0].strip())
            away_score = int(score[1].strip())

            scores[home_manager] = scores.get(home_manager, 0) + home_score
            scores[away_manager] = scores.get(away_manager, 0) + away_score

    return scores


def calculate_monthly_totals(start_gw: int, end_gw: int) -> dict:
    """Calculate total points for each manager across the month"""
    monthly_totals = defaultdict(int)

    for gw in range(start_gw, end_gw + 1):
        gw_scores = read_gameweek_results(gw)
        for manager, score in gw_scores.items():
            monthly_totals[manager] += score

    return dict(monthly_totals)


def get_weekly_winners(start_gw: int, end_gw: int) -> list:
    """Get the winner for each gameweek in the month"""
    weekly_winners = []

    for gw in range(start_gw, end_gw + 1):
        gw_scores = read_gameweek_results(gw)
        if gw_scores:
            winner = max(gw_scores, key=gw_scores.get)
            winner_points = gw_scores[winner]
            weekly_winners.append({
                'gameweek': gw,
                'manager': winner,
                'points': winner_points
            })

    return weekly_winners


def calculate_payments(weekly_winners: list, monthly_winner: str, all_managers: list) -> dict:
    """Calculate who owes who how much"""
    # Track what each person owes to each winner
    payments = defaultdict(lambda: defaultdict(int))

    # Weekly winners get $1 from everyone except themselves
    for week in weekly_winners:
        winner = week['manager']
        for manager in all_managers:
            if manager != winner:
                payments[manager][winner] += 1

    # Monthly winner gets $2 from everyone except themselves
    for manager in all_managers:
        if manager != monthly_winner:
            payments[manager][monthly_winner] += 2

    return payments


def generate_payment_summary(month_name: str, start_gw: int, end_gw: int) -> str:
    """Generate payment summary markdown"""

    # Calculate monthly totals
    monthly_totals = calculate_monthly_totals(start_gw, end_gw)

    if not monthly_totals:
        return f"# {month_name} Monthly Prize\n\n❌ No results found for GW{start_gw}-{end_gw}\n"

    # Get weekly winners
    weekly_winners = get_weekly_winners(start_gw, end_gw)

    # Find monthly winner
    monthly_winner = max(monthly_totals, key=monthly_totals.get)
    monthly_winner_points = monthly_totals[monthly_winner]

    # Get all managers
    all_managers = list(monthly_totals.keys())

    # Calculate payments
    payments = calculate_payments(weekly_winners, monthly_winner, all_managers)

    # Calculate total owed by each manager
    totals_owed = {}
    for manager in all_managers:
        totals_owed[manager] = sum(payments[manager].values())

    # Sort by total owed (descending)
    sorted_by_owed = sorted(totals_owed.items(), key=lambda x: x[1], reverse=True)

    # Sort by points for leaderboard
    sorted_by_points = sorted(monthly_totals.items(), key=lambda x: x[1], reverse=True)

    # Generate markdown
    md = f"# 💰 {month_name} Monthly Prize Payment Summary\n\n"
    md += f"**Period:** Gameweek {start_gw}-{end_gw}\n\n"
    md += "---\n\n"

    # Winners section
    md += "## 🏆 Winners\n\n"
    md += "### Weekly Winners ($1 each)\n"
    for week in weekly_winners:
        md += f"- **GW{week['gameweek']}:** {week['manager']} ({week['points']} pts)\n"

    md += f"\n### Monthly Winner ($2)\n"
    md += f"- **{monthly_winner}** ({monthly_winner_points} pts)\n\n"
    md += "---\n\n"

    # Outstanding payments section
    md += "## 💵 Outstanding Payments\n\n"

    for manager, total in sorted_by_owed:
        if total > 0:
            # Build breakdown string
            breakdown_parts = []
            for recipient, amount in sorted(payments[manager].items(), key=lambda x: x[1], reverse=True):
                if amount > 0:
                    breakdown_parts.append(f"${amount} to {recipient}")

            breakdown = ", ".join(breakdown_parts)
            md += f"**{manager}** → **${total}** ({breakdown})\n"

    md += "\n---\n\n"

    # Monthly leaderboard
    md += "## 📊 Monthly Leaderboard\n\n"
    for i, (manager, points) in enumerate(sorted_by_points, 1):
        medal = "🏆" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
        md += f"{medal} **{manager}** - {points} points\n"

    md += f"\n---\n\n"
    md += f"*Copy and paste the payment summary above to the group chat!*\n"

    return md


def main():
    if len(sys.argv) < 4:
        print("Usage: python generate_monthly_payments.py <month_name> <start_gw> <end_gw>")
        print("Example: python generate_monthly_payments.py December 14 18")
        sys.exit(1)

    month_name = sys.argv[1]
    start_gw = int(sys.argv[2])
    end_gw = int(sys.argv[3])

    print("=" * 80)
    print(f"  MONTHLY PRIZE PAYMENT GENERATOR - {month_name.upper()}")
    print("=" * 80)
    print(f"📅 Period: GW{start_gw}-{end_gw}")

    # Generate summary
    summary = generate_payment_summary(month_name, start_gw, end_gw)

    # Save to file
    output_file = Path(f"gw{end_gw}") / f"monthly_payments_{month_name.lower()}.md"
    with open(output_file, 'w') as f:
        f.write(summary)

    print(f"\n✅ Payment summary generated!")
    print(f"📄 Saved to: {output_file}")
    print(f"\n📋 Preview:")
    print("-" * 80)
    print(summary)
    print("-" * 80)


if __name__ == '__main__':
    main()
