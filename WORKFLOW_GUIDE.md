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

## 🎯 **Key Benefits of This Setup**

### **Staging Branch (Development)**
- ✅ Safe testing environment
- ✅ No impact on managers' dashboard
- ✅ Can experiment freely
- ✅ Test deployment process
- ✅ Validate changes before going live

### **Main Branch (Production)**
- ✅ Stable, working dashboard
- ✅ Managers always see reliable version
- ✅ Only tested, working features
- ✅ Clean deployment history

## 🚨 **Important Rules**

### **NEVER:**
- ❌ Make changes directly on `main`
- ❌ Push untested code to production
- ❌ Skip local testing
- ❌ Skip staging testing

### **ALWAYS:**
- ✅ Develop on `staging`
- ✅ Test locally first
- ✅ Test on staging before production
- ✅ Use descriptive commit messages
- ✅ Run deploy script after changes

## 🔧 **Quick Commands Reference**

```bash
# Development workflow
git checkout staging          # Switch to development
git pull origin staging      # Get latest staging changes
# ... make changes ...
python3 deploy-github-clean.py  # Deploy to staging
git add . && git commit -m "..." && git push origin staging

# Production release
git checkout main            # Switch to production
git pull origin main        # Get latest production
git merge staging           # Merge tested changes
python3 deploy-github-clean.py  # Deploy to production
git add . && git commit -m "..." && git push origin main
```

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

## 🎉 **You're All Set!**

Now you have a professional development workflow that keeps your production dashboard stable while giving you a safe environment to develop and test new features!
