# 📋 FPL Dashboard - Local TODO List

## 🔧 Fixes Needed:

### 1. Monthly Standings
- [ ] **Verify scores calculation works correctly**
- [ ] **Check monthly winner detection logic**
- [ ] **Ensure standings update properly when switching months**
- [ ] **Test edge cases (incomplete months, GW transitions)**

### 2. League Analytics
- [ ] **Double check all analytics calculations**
- [ ] **Optimize performance for large datasets**
- [ ] **Verify data accuracy and relevance**
- [ ] **Ensure analytics are actually useful for managers**
- [ ] **Test with different gameweek scenarios**

### 3. Player Analytics
- [ ] **Verify player performance calculations work**
- [ ] **Check "Best & Worst Players by Manager" section**
- [ ] **Ensure player data carries over correctly between gameweeks**
- [ ] **Test player movement impact on analytics**

### 4. Teams Section
- [ ] **Verify weekly points display correctly**
- [ ] **Check team information accuracy**
- [ ] **Ensure squad composition updates properly**
- [ ] **Test player movement integration**
- [ ] **Verify form calculations**

## 🚀 Feature Additions:

### 1. "Who's Currently Playing" Section
- [ ] **Design UI layout for live player tracking**
- [ ] **Integrate with Premier League fixture data**
- [ ] **Show which players from each manager's team are playing today/this weekend**
- [ ] **Display kickoff times and match details**
- [ ] **Add real-time status updates (if possible)**
- [ ] **Make it easily accessible from main dashboard**

## 🧪 Testing Checklist:

### Data Accuracy
- [ ] **GW1 final results display correctly**
- [ ] **GW2 partial results accumulate properly**
- [ ] **Manager names and team names match consistently**
- [ ] **Player movements affect squad composition correctly**

### Cross-Gameweek Functionality
- [ ] **Switching between GW1 and GW2 works smoothly**
- [ ] **Cumulative totals calculate correctly**
- [ ] **Historical data carries over properly**
- [ ] **Current vs. total displays update appropriately**

### Performance & UX
- [ ] **Page loads quickly without 404 errors**
- [ ] **All sections populate correctly**
- [ ] **Navigation between sections is smooth**
- [ ] **Mobile responsiveness works well**

## 📁 Files to Focus On:

### High Priority
- `script.js` - Core functionality and calculations
- `data_manager.js` - Data loading and processing
- `index.html` - UI structure and layout

### Medium Priority
- `deploy-github-clean.py` - Deployment workflow
- `serve_dashboard.py` - Local development server

## 🎯 Next Steps Priority:

1. **Fix Monthly Standings** (highest impact for managers)
2. **Verify League Analytics** (core dashboard functionality)
3. **Check Player Analytics** (important for team management)
4. **Test Teams Section** (daily usage by managers)
5. **Design "Currently Playing" Feature** (new value-add feature)

## 💡 Development Tips:

- **Test locally first** before deploying to staging
- **Use browser console** to debug data flow issues
- **Check data consistency** between local CSV and deployed JSON
- **Verify edge cases** (empty data, partial results, etc.)
- **Test with real data** scenarios managers will encounter

---

**This TODO list covers the major areas that need attention to ensure your dashboard is production-ready and provides real value to your league managers!** 🏆
