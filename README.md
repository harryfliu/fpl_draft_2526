# FPL Draft Dashboard 2025-26

A beautiful, modern web application for tracking Fantasy Premier League draft league standings, fixtures, results, and payouts.

## Features

### 🏆 Current Features
- **Season Leaderboard**: Complete standings with positions, points, form, and total winnings
- **Upcoming Fixtures**: Next gameweek matchups with dates and times
- **Recent Results**: Previous gameweek results with scores
- **Monthly Standings**: Current month performance tracking
- **Gameweek Tracker**: Shows current gameweek number
- **Stats Overview**: League size, prize pool, current month, and weekly winner
- **Draft Picks Display**: View everyone's initial draft selections
- **CSV Import/Export**: Easy data management with your Excel files
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile

### 🎨 Design Features
- **Modern UI**: Glassmorphism design with backdrop blur effects
- **Beautiful Gradients**: Eye-catching color schemes throughout
- **Smooth Animations**: Hover effects and scroll animations
- **Professional Typography**: Inter font family for excellent readability
- **Responsive Layout**: Adapts to all screen sizes

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Installation
1. Download all files to a folder
2. Open `index.html` in your web browser
3. The dashboard will load with demo data

### File Structure
```
fpl_dashboard/
├── index.html                    # Main HTML file
├── script.js                     # JavaScript functionality
├── sample_import_template.csv    # CSV template for data import
└── README.md                     # This file
```

## Data Import

### CSV Import Format
The dashboard expects CSV files with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Manager | Manager's name | Alex Chen |
| Team Name | Team name | Chen Dynasty |
| Points | Total season points | 487 |
| GW Points | Current gameweek points | 78 |
| Form | Recent form (W-W-L-W-W) | W-W-W-W-W |
| Total Winnings | Total money won | 42 |
| Draft Picks | Initial draft selections | Haaland,Salah,De Bruyne,Son,Trent |

### How to Import Your Data
1. **Export from Excel**: Save your Excel file as CSV format
2. **Click Import CSV**: Use the green "Import CSV" button in the dashboard
3. **Select File**: Choose your CSV file
4. **Auto-Update**: Dashboard automatically updates with your real data

### Sample Template
Use `sample_import_template.csv` as a reference for the correct format.

## Current Data

The dashboard is currently populated with realistic demo data for demonstration:

- **8 Teams**: Chen Dynasty, Johnson's Army, Rodriguez FC, Thompson Titans, Kim United, Wang Warriors, Wilson Wanderers, Brown Brigade
- **Current Gameweek**: 8
- **Prize Pool**: $280 (8 × $35 buy-in)
- **Monthly Prize**: $14 (monthly winner gets $2 from each player)

## Customization

### Adding Real Data
When you're ready to use real data:

1. **CSV Import**: Use the built-in import feature (recommended)
2. **Manual JavaScript**: Edit the `dashboardData` object in `script.js`
3. **API Integration**: Can be modified to pull data from external APIs

### Styling Changes
- Colors: Modify CSS variables in `styles.css`
- Layout: Adjust grid and flexbox properties
- Animations: Customize transition effects

## League Rules Integration

The dashboard reflects your league's specific rules:

- **Weekly Winners**: $1 from each player ($7 in 8-person league)
- **Monthly Winners**: $2 from each player ($14 in 8-person league)
- **Final Payouts**: 60% / 30% / 10% for 1st/2nd/3rd place
- **Last Place**: Punishment (no additional money owed)

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers

## Performance

- **Lightweight**: No heavy frameworks or libraries
- **Fast Loading**: Optimized CSS and JavaScript
- **Smooth Animations**: 60fps animations with CSS transforms
- **Responsive**: Efficient media queries for all devices

## Future Enhancements

Potential features to add:
- **Historical Data**: Season-long statistics
- **Player Performance**: Individual player tracking
- **Notifications**: Gameweek reminders
- **Dark Mode**: Alternative color scheme
- **Data Visualization**: Charts and graphs
- **Real-time Updates**: Live score updates

## Support

For questions or customization requests, refer to the code comments in each file. The dashboard is built with clean, well-documented code that's easy to modify.

## License

This project is open source and available for personal and commercial use.

---

**Enjoy your FPL Draft League! 🎯⚽**
