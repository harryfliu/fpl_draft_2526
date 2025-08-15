# FPL Dashboard - Distribution Guide

## For League Members

### Quick Start (3 steps)
1. **Download & Extract** the dashboard files to any folder
2. **Install Python** (if not already installed): [python.org/downloads](https://python.org/downloads)
3. **Run the dashboard**:
   ```bash
   python serve_dashboard.py
   ```
   Dashboard opens automatically in your browser at `http://localhost:8000`

### What's Included
- `index.html` - Main dashboard
- `script.js` - Dashboard functionality  
- `data_manager.js` - Data processing
- `serve_dashboard.py` - Local server
- `gw1/` folder - Current gameweek data
- This README

### Updating for New Gameweeks
Harry will send you updated data folders (`gw2/`, `gw3/`, etc.). Just:
1. Drop the new folder into your dashboard directory
2. Refresh your browser
3. Use the gameweek selector to switch between weeks

### Troubleshooting
- **Python not found?** Install from [python.org](https://python.org/downloads)
- **Port 8000 busy?** Close other local servers or restart your computer
- **Data not loading?** Make sure you're accessing via `localhost:8000`, not opening `index.html` directly

---
*Questions? Ask Harry!*
