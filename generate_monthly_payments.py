#!/usr/bin/env python3
"""
Monthly Prize Payment Generator for FPL Dashboard

Generates a simple payment summary showing who owes who money for the monthly prize.
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


def generate_payment_summary(month_name: str, start_gw: int, end_gw: int) -> str:
    """Generate payment summary markdown"""

    # Calculate monthly totals
    monthly_totals = calculate_monthly_totals(start_gw, end_gw)

    if not monthly_totals:
        return f"# {month_name} Monthly Prize\n\n❌ No results found for GW{start_gw}-{end_gw}\n"

    # Find winner
    winner = max(monthly_totals, key=monthly_totals.get)
    winner_points = monthly_totals[winner]

    # Sort by points for leaderboard
    sorted_managers = sorted(monthly_totals.items(), key=lambda x: x[1], reverse=True)

    # Generate markdown
    md = f"# 💰 {month_name} Monthly Prize Payment Summary\n\n"
    md += f"**Period:** Gameweek {start_gw}-{end_gw}\n\n"
    md += "---\n\n"
    md += f"## 🏆 Winner: {winner}\n\n"
    md += f"**Total Points:** {winner_points}\n\n"
    md += "---\n\n"
    md += "## 💵 Payment Summary\n\n"
    md += f"**Everyone owes {winner}: $2**\n\n"

    # List all payments
    for manager, points in sorted_managers:
        if manager != winner:
            md += f"- {manager} → {winner}: **$2**\n"

    md += f"\n**Total Prize: ${len(sorted_managers) - 1} × $2 = ${(len(sorted_managers) - 1) * 2}**\n\n"
    md += "---\n\n"
    md += "## 📊 Monthly Leaderboard\n\n"

    for i, (manager, points) in enumerate(sorted_managers, 1):
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
