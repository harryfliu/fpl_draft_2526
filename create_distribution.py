#!/usr/bin/env python3
"""
FPL Dashboard Distribution Creator
Creates a clean package for league members
"""

import os
import shutil
import zipfile
from datetime import datetime

def create_distribution():
    """Create a distribution package for league members"""
    
    # Distribution folder name
    dist_name = f"fpl_dashboard_gw{get_current_gameweek()}"
    dist_path = f"./dist/{dist_name}"
    
    # Clean and create distribution directory
    if os.path.exists(dist_path):
        shutil.rmtree(dist_path)
    os.makedirs(dist_path, exist_ok=True)
    
    # Files to include
    files_to_copy = [
        'index.html',
        'script.js', 
        'data_manager.js',
        'serve_dashboard.py',
        'README_DISTRIBUTION.md'
    ]
    
    # Copy main files
    for file in files_to_copy:
        if os.path.exists(file):
            shutil.copy2(file, dist_path)
            print(f"✓ Copied {file}")
    
    # Copy gameweek data folders
    for item in os.listdir('.'):
        if os.path.isdir(item) and item.startswith('gw'):
            dest_folder = os.path.join(dist_path, item)
            shutil.copytree(item, dest_folder)
            print(f"✓ Copied folder {item}/")
    
    # Create ZIP file
    zip_path = f"./dist/{dist_name}.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_path):
            for file in files:
                file_path = os.path.join(root, file)
                arc_path = os.path.relpath(file_path, dist_path)
                zipf.write(file_path, arc_path)
    
    print(f"\n🎉 Distribution created!")
    print(f"📁 Folder: {dist_path}")
    print(f"📦 ZIP: {zip_path}")
    print(f"📊 Size: {get_folder_size(dist_path):.1f} MB")
    
    # Instructions
    print(f"\n📧 To share with league:")
    print(f"1. Send them: {zip_path}")
    print(f"2. Tell them to extract and run: python serve_dashboard.py")
    print(f"3. Dashboard opens at http://localhost:8000")

def get_current_gameweek():
    """Get current gameweek from existing folders"""
    gw_folders = [d for d in os.listdir('.') if os.path.isdir(d) and d.startswith('gw')]
    if gw_folders:
        # Get highest numbered gameweek
        gw_numbers = [int(d[2:]) for d in gw_folders if d[2:].isdigit()]
        return max(gw_numbers) if gw_numbers else 1
    return 1

def get_folder_size(folder_path):
    """Get folder size in MB"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            total_size += os.path.getsize(filepath)
    return total_size / (1024 * 1024)  # Convert to MB

if __name__ == "__main__":
    print("🏆 FPL Dashboard Distribution Creator")
    print("=" * 40)
    create_distribution()
