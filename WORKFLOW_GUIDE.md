# 🚀 FPL Dashboard - Staging + Production Workflow

## 📋 **Branch Structure**

- **`main`** → Production (stable, visible to managers)
- **`staging`** → Development (testing, only visible to you)  
- **`feature/*`** → Individual features/changes

## 🔄 **Daily Development Workflow**

### 1. **Start Development (Staging)**
```bash
# Switch to staging branch for development
git checkout staging

# Pull latest changes
git pull origin staging

# Make your changes to script.js, index.html, etc.
# Test locally with your Python server
```

### 2. **Test Changes Locally**
```bash
# Test your changes locally first
python3 serve_dashboard.py

# Make sure everything works as expected
# Fix any bugs or issues
```

### 3. **Deploy to Staging (Test Environment)**
```bash
# Run the deploy script to create staging version
python3 deploy-github-clean.py

# This creates docs/ folder with your changes
# Commit staging changes
git add .
git commit -m "Feature: [describe your changes]"
git push origin staging
```

### 4. **Test Staging Version**
- Go to your GitHub repository
- Switch to `staging` branch
- Check that your changes work correctly
- Test all functionality thoroughly

### 5. **Merge to Production (When Ready)**
```bash
# Switch to main branch
git checkout main

# Pull latest production changes
git pull origin main

# Merge staging into main
git merge staging

# Deploy to production
python3 deploy-github-clean.py

# Commit and push to production
git add .
git commit -m "Release: [describe your changes]"
git push origin main
```

## 🖥️ **Local Development Best Practices**

### **🔄 When to Sync Local vs Deployed:**

#### **✅ Sync After EVERY Significant Change:**
- **Bug fixes** - Test locally, then sync to verify deployed version works
- **New features** - Sync to test deployment process
- **UI changes** - Ensure they render correctly on deployed version
- **Data processing logic** - Verify JSON conversion works properly
- **Functionality changes** - Test end-to-end on deployed version

#### **❌ Don't Sync for:**
- **Minor text edits** (typos, comments)
- **Debug console.log statements** (unless testing deployment)
- **Temporary test code** (remove before syncing)

#### **🎯 Sync Strategy:**
```bash
# Development cycle:
1. Make changes locally
2. Test with python3 serve_dashboard.py
3. If working, sync: python3 deploy-github-clean.py
4. Test deployed version on staging
5. Fix any deployment issues
6. Repeat until perfect
```

### **🧪 Local Testing Best Practices:**

#### **Before Every Sync:**
```bash
# 1. Test core functionality locally
python3 serve_dashboard.py

# 2. Test all major dashboard sections:
#    - Season Leaderboard
#    - Teams section
#    - Player Movement
#    - Prize Pool
#    - Player Analytics
#    - Premier League fixtures

# 3. Test with different gameweek selections
# 4. Verify data loads correctly
# 5. Check for console errors
```

#### **Local Testing Checklist:**
- [ ] Dashboard loads without errors
- [ ] All sections populate correctly
- [ ] Gameweek switching works
- [ ] Data calculations are accurate
- [ ] UI elements render properly
- [ ] No JavaScript console errors
- [ ] Mobile responsiveness (if applicable)

### **📁 File Management Best Practices:**

#### **Keep These Files in Sync:**
- `script.js` - Core dashboard logic
- `index.html` - Dashboard structure
- `deploy-github-clean.py` - Deployment script
- `requirements.txt` - Python dependencies

#### **Local-Only Files (Don't Sync):**
- `*.csv` files in gameweek folders
- `serve_dashboard.py` - Local development server
- `.gitignore` patterns
- Local configuration files

#### **Deployed Files (Auto-Generated):**
- `docs/` folder contents
- `docs/data_manager.js` - Web-optimized version
- `docs/data/*.json` - Converted from CSV

## 🚨 **Important Rules**

### **NEVER:**
- ❌ Make changes directly on `main`
- ❌ Push untested code to production
- ❌ Skip local testing
- ❌ Skip staging testing
- ❌ Sync broken code to deployed version
- ❌ Forget to test after deployment

### **ALWAYS:**
- ✅ Develop on `staging`
- ✅ Test locally first
- ✅ Test on staging before production
- ✅ Use descriptive commit messages
- ✅ Run deploy script after changes
- ✅ Verify deployed version works
- ✅ Test all major functionality
- ✅ Check for console errors

## 🔧 **Quick Commands Reference**

```bash
# Development workflow
git checkout staging          # Switch to development
git pull origin staging      # Get latest staging changes
# ... make changes ...
python3 serve_dashboard.py   # Test locally
python3 deploy-github-clean.py  # Deploy to staging
git add . && git commit -m "..." && git push origin staging

# Production release
git checkout main            # Switch to production
git pull origin main        # Get latest production
git merge staging           # Merge tested changes
python3 deploy-github-clean.py  # Deploy to production
git add . && git commit -m "..." && git push origin main
```

## 🧹 **Code Quality Best Practices**

### **Before Committing:**
```bash
# 1. Remove debug code
#    - Remove console.log statements (unless permanent)
#    - Remove temporary test code
#    - Clean up commented-out code

# 2. Test thoroughly
#    - All major functionality works
#    - No obvious bugs
#    - UI looks correct

# 3. Write clear commit messages
#    - Use present tense: "Fix player movement bug"
#    - Be specific: "Fix: Player movement not showing in deployed version"
#    - Include context if needed
```

### **Code Organization:**
```javascript
// Good: Clear, organized code
function updateLeaderboard() {
    // Validate data first
    if (!dashboardData.leaderboard) return;
    
    // Process data
    const processedData = processLeaderboardData(dashboardData.leaderboard);
    
    // Update UI
    displayLeaderboard(processedData);
}

// Bad: Unclear, messy code
function updateLeaderboard() {
    if(dashboardData.leaderboard) {
        // do stuff
        displayLeaderboard(dashboardData.leaderboard);
    }
}
```

## 🐛 **Debugging Best Practices**

### **When Things Break:**

#### **1. Check Local First:**
```bash
# Always test locally before blaming deployment
python3 serve_dashboard.py
# Verify the issue exists locally
```

#### **2. Check Console Errors:**
```bash
# Open browser dev tools
# Look for JavaScript errors
# Check network requests
# Verify data loading
```

#### **3. Compare Local vs Deployed:**
```bash
# If local works but deployed doesn't:
# 1. Check if you synced latest changes
# 2. Verify deploy script ran successfully
# 3. Check if data files were updated
# 4. Look for deployment-specific issues
```

#### **4. Debug Deployment Issues:**
```bash
# Common deployment problems:
# - CSV to JSON conversion errors
# - Missing data files
# - data_manager.js generation issues
# - File permission problems
```

## 📊 **Performance Best Practices**

### **Dashboard Optimization:**
- **Lazy loading** - Only load data when needed
- **Efficient DOM updates** - Batch UI changes
- **Data caching** - Cache processed data
- **Error handling** - Graceful fallbacks for missing data

### **Data Processing:**
- **Validate data** before processing
- **Handle edge cases** (empty arrays, missing properties)
- **Efficient algorithms** for large datasets
- **Memory management** for long-running operations

## 🔄 **Sync Frequency Guidelines**

### **High Priority (Sync Immediately):**
- Bug fixes
- Critical functionality changes
- Data processing logic updates
- UI/UX improvements

### **Medium Priority (Sync After Testing):**
- New features
- Performance improvements
- Code refactoring
- Documentation updates

### **Low Priority (Sync When Convenient):**
- Minor text changes
- Comment updates
- Code formatting
- Minor UI tweaks

## 🌐 **GitHub Pages Setup**

### **Production (Main Branch)**
- Source: `/docs` folder
- URL: Your main dashboard URL
- Visible to: All managers

### **Staging (Staging Branch)**
- You can set up a separate staging site if needed
- Or just test locally and on GitHub staging branch

## 📝 **Example Workflow Session**

```bash
# 1. Start development
git checkout staging
git pull origin staging

# 2. Make changes to fix a bug
# Edit script.js to fix player movement issue

# 3. Test locally
python3 serve_dashboard.py
# Verify the fix works

# 4. Deploy to staging
python3 deploy-github-clean.py
git add .
git commit -m "Fix: Player movement not showing in deployed version"
git push origin staging

# 5. Test staging on GitHub
# Go to staging branch, verify fix works

# 6. Release to production
git checkout main
git pull origin main
git merge staging
python3 deploy-github-clean.py
git add .
git commit -m "Release: Fix player movement display issue"
git push origin main
```

## 🎯 **Daily Development Routine**

### **Morning Setup:**
```bash
git checkout staging
git pull origin staging
python3 serve_dashboard.py  # Quick health check
```

### **During Development:**
```bash
# Make changes
# Test locally
# If working, sync: python3 deploy-github-clean.py
# Test deployed version
# Fix any issues
# Repeat
```

### **End of Day:**
```bash
# Commit all changes
git add .
git commit -m "Daily progress: [summary]"
git push origin staging

# Verify staging works
# Plan next day's work
```

## 🎉 **You're All Set!**

Now you have a professional development workflow that keeps your production dashboard stable while giving you a safe environment to develop and test new features!

### **Key Takeaways:**
- **Sync frequently** - Every significant change should be tested deployed
- **Test locally first** - Always verify locally before deployment
- **Keep staging updated** - Regular commits keep your development branch current
- **Quality over speed** - Better to test thoroughly than fix bugs later
- **Document everything** - Clear commit messages and documentation save time
