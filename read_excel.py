#!/usr/bin/env python3
"""
Excel Reader for FPL Draft Dashboard
This script reads the Excel file and shows the data structure
"""

import pandas as pd
import json
import sys
from pathlib import Path

def read_excel_file(file_path):
    """Read the Excel file and return information about its structure"""
    try:
        # Read all sheets from the Excel file
        excel_file = pd.ExcelFile(file_path)
        
        print(f"📊 Excel File: {file_path}")
        print(f"📋 Sheets found: {excel_file.sheet_names}")
        print("=" * 60)
        
        data_info = {}
        
        for sheet_name in excel_file.sheet_names:
            print(f"\n📄 Sheet: {sheet_name}")
            print("-" * 40)
            
            # Read the sheet
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Basic info
            print(f"Rows: {len(df)}")
            print(f"Columns: {len(df.columns)}")
            print(f"Column names: {list(df.columns)}")
            
            # Show first few rows
            print(f"\nFirst 3 rows:")
            print(df.head(3).to_string(index=False))
            
            # Show data types
            print(f"\nData types:")
            for col, dtype in df.dtypes.items():
                print(f"  {col}: {dtype}")
            
            # Store info for later use
            data_info[sheet_name] = {
                'rows': len(df),
                'columns': list(df.columns),
                'data_types': {col: str(dtype) for col, dtype in df.dtypes.items()},
                'sample_data': df.head(5).to_dict('records')
            }
            
            print("\n" + "=" * 60)
        
        return data_info
        
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        return None

def analyze_specific_sheets(data_info):
    """Analyze the specific sheet types we know about"""
    print("\n🎯 SHEET ANALYSIS:")
    print("=" * 60)
    
    if not data_info:
        return
    
    # Analyze each sheet type
    sheet_analysis = {}
    
    for sheet_name, info in data_info.items():
        sheet_lower = sheet_name.lower()
        
        if 'fixture' in sheet_lower:
            print(f"\n🏟️ FIXTURE LIST SHEET:")
            print(f"   Sheet name: {sheet_name}")
            print(f"   Rows: {info['rows']}")
            print(f"   Columns: {info['columns']}")
            
            # Look for common fixture columns
            fixture_columns = []
            for col in info['columns']:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['team', 'home', 'away', 'date', 'time', 'venue', 'gameweek']):
                    fixture_columns.append(col)
            
            if fixture_columns:
                print(f"   📝 Key columns: {fixture_columns}")
            
            sheet_analysis['fixtures'] = info
            
        elif 'result' in sheet_lower:
            print(f"\n🏆 RESULTS SHEET:")
            print(f"   Sheet name: {sheet_name}")
            print(f"   Rows: {info['rows']}")
            print(f"   Columns: {info['columns']}")
            
            # Look for common result columns
            result_columns = []
            for col in info['columns']:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['team', 'home', 'away', 'score', 'points', 'gameweek', 'date']):
                    result_columns.append(col)
            
            if result_columns:
                print(f"   📝 Key columns: {result_columns}")
            
            sheet_analysis['results'] = info
            
        elif 'draft' in sheet_lower or 'starting' in sheet_lower:
            print(f"\n🎯 STARTING DRAFT SHEET:")
            print(f"   Sheet name: {sheet_name}")
            print(f"   Rows: {info['rows']}")
            print(f"   Columns: {info['columns']}")
            
            # Look for common draft columns
            draft_columns = []
            for col in info['columns']:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['manager', 'team', 'player', 'pick', 'position', 'draft']):
                    draft_columns.append(col)
            
            if draft_columns:
                print(f"   📝 Key columns: {draft_columns}")
            
            sheet_analysis['draft'] = info
    
    return sheet_analysis

def suggest_csv_structure(sheet_analysis):
    """Suggest the best CSV structure based on the sheet analysis"""
    print("\n🎯 RECOMMENDED CSV STRUCTURE:")
    print("=" * 60)
    
    if not sheet_analysis:
        return
    
    print("Based on your Excel structure, here are the recommended CSV formats:")
    
    # Fixtures CSV
    if 'fixtures' in sheet_analysis:
        print(f"\n📅 FIXTURES CSV (export from '{list(sheet_analysis.keys())[0]}' sheet):")
        fixtures_cols = sheet_analysis['fixtures']['columns']
        print(f"   Expected columns: {fixtures_cols}")
        print(f"   💡 Map to dashboard: Home Team, Away Team, Date, Time, Gameweek")
    
    # Results CSV  
    if 'results' in sheet_analysis:
        print(f"\n🏆 RESULTS CSV (export from '{list(sheet_analysis.keys())[1]}' sheet):")
        results_cols = sheet_analysis['results']['columns']
        print(f"   Expected columns: {results_cols}")
        print(f"   💡 Map to dashboard: Home Team, Away Team, Home Score, Away Score, Date, Gameweek")
    
    # Draft CSV
    if 'draft' in sheet_analysis:
        print(f"\n🎯 DRAFT CSV (export from '{list(sheet_analysis.keys())[2]}' sheet):")
        draft_cols = sheet_analysis['draft']['columns']
        print(f"   Expected columns: {draft_cols}")
        print(f"   💡 Map to dashboard: Manager, Team Name, Draft Picks")
    
    print(f"\n💡 To convert to CSV:")
    print(f"  1. Open each sheet in Excel/Google Sheets")
    print(f"  2. File → Save As → CSV")
    print(f"  3. Import each CSV separately into the dashboard")

def create_dashboard_csv_templates(sheet_analysis):
    """Create CSV templates that match the dashboard structure"""
    print("\n📄 CREATING DASHBOARD CSV TEMPLATES:")
    print("=" * 60)
    
    if not sheet_analysis:
        return
    
    # Create main leaderboard template
    if 'draft' in sheet_analysis:
        print("📊 Creating main dashboard CSV template...")
        
        # Get sample data from draft sheet
        draft_data = sheet_analysis['draft']['sample_data']
        draft_columns = sheet_analysis['draft']['columns']
        
        # Create template with dashboard columns
        dashboard_template = []
        dashboard_headers = ['Manager', 'Team Name', 'Points', 'GW Points', 'Form', 'Total Winnings', 'Draft Picks']
        dashboard_template.append(','.join(dashboard_headers))
        
        # Add sample rows
        for i, row in enumerate(draft_data[:3]):  # First 3 rows
            template_row = []
            for header in dashboard_headers:
                if header == 'Manager':
                    # Try to find manager column
                    manager_col = next((col for col in draft_columns if 'manager' in col.lower()), 'Manager Name')
                    template_row.append(str(row.get(manager_col, f'Manager {i+1}')))
                elif header == 'Team Name':
                    # Try to find team column
                    team_col = next((col for col in draft_columns if 'team' in col.lower()), 'Team')
                    template_row.append(str(row.get(team_col, f'Team {i+1}')))
                elif header == 'Draft Picks':
                    # Try to find draft picks
                    picks_col = next((col for col in draft_columns if any(keyword in col.lower() for keyword in ['player', 'pick', 'draft'])), 'Draft Picks')
                    picks_value = row.get(picks_col, f'Player {i+1}')
                    template_row.append(str(picks_value))
                else:
                    template_row.append('0')  # Default values
            
            dashboard_template.append(','.join(template_row))
        
        # Write template
        with open('dashboard_import_template.csv', 'w', encoding='utf-8') as f:
            f.write('\n'.join(dashboard_template))
        
        print(f"✅ Dashboard template created: dashboard_import_template.csv")
        print(f"📝 Headers: {', '.join(dashboard_headers)}")
    
    # Create individual sheet templates
    for sheet_type, info in sheet_analysis.items():
        if sheet_type == 'fixtures':
            output_file = 'fixtures_template.csv'
        elif sheet_type == 'results':
            output_file = 'results_template.csv'
        elif sheet_type == 'draft':
            output_file = 'draft_template.csv'
        else:
            continue
        
        print(f"\n📋 Creating {sheet_type} template...")
        
        # Write original structure
        with open(output_file, 'w', encoding='utf-8') as f:
            # Write headers
            f.write(','.join(info['columns']) + '\n')
            
            # Write sample data
            for row in info['sample_data'][:3]:
                csv_line = []
                for col in info['columns']:
                    value = row.get(col, '')
                    if pd.isna(value):
                        value = ''
                    else:
                        value = str(value).replace(',', ';')  # Replace commas to avoid CSV issues
                    csv_line.append(value)
                f.write(','.join(csv_line) + '\n')
        
        print(f"✅ {sheet_type} template created: {output_file}")

def main():
    """Main function"""
    file_path = "gw1/draftdata25_26.xlsx"
    
    if not Path(file_path).exists():
        print(f"❌ File not found: {file_path}")
        print("Please make sure the Excel file is in the gw1/ folder")
        return
    
    print("🔍 FPL Draft Excel File Analyzer")
    print("=" * 60)
    
    # Read the Excel file
    data_info = read_excel_file(file_path)
    
    if data_info:
        # Analyze specific sheets
        sheet_analysis = analyze_specific_sheets(data_info)
        
        # Suggest CSV structure
        suggest_csv_structure(sheet_analysis)
        
        # Create CSV templates
        create_dashboard_csv_templates(sheet_analysis)
        
        print(f"\n🎉 Analysis complete!")
        print(f"📁 Files created:")
        print(f"  - dashboard_import_template.csv (main dashboard import)")
        print(f"  - fixtures_template.csv (fixtures data)")
        print(f"  - results_template.csv (results data)")
        print(f"  - draft_template.csv (draft data)")
        
        print(f"\n💡 Next steps:")
        print(f"  1. Review the sheet analysis above")
        print(f"  2. Export each sheet as CSV using the templates as reference")
        print(f"  3. Import the main dashboard CSV into your FPL dashboard")
        
        # Save detailed info to JSON for reference
        with open('excel_analysis.json', 'w') as f:
            json.dump(data_info, f, indent=2, default=str)
        print(f"  - excel_analysis.json (detailed analysis)")

if __name__ == "__main__":
    main()
