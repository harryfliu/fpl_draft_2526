# 🌐 GitHub Pages Setup Instructions

## 🚀 **Next Steps (Do these now):**

### 1. **Create GitHub Repository**
1. Go to [github.com](https://github.com) and sign in
2. Click **"New repository"** (green button)
3. Repository name: `fpl-dashboard` (or whatever you prefer)
4. Make it **Public** (required for free GitHub Pages)
5. **DON'T** initialize with README (we already have files)
6. Click **"Create repository"**

### 2. **Push Your Code**
Copy and run these commands from your project folder:

```bash
# Set your GitHub username and repository name
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fpl-dashboard.git
git push -u origin main
```

### 3. **Enable GitHub Pages**
1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Source"**, select **"Deploy from a branch"**
5. Choose **"main"** branch and **"/docs"** folder
6. Click **"Save"**

### 4. **Access Your Dashboard**
- Your dashboard will be live at: `https://YOUR_USERNAME.github.io/fpl-dashboard`
- It may take a few minutes to deploy initially

---

## 📊 **Weekly Updates (Every Gameweek):**

### Update Process:
1. **Add new gameweek data**: Create `gw2/`, `gw3/`, etc. folders with your CSV files
2. **Regenerate web version**: Run `python3 deploy-github.py`
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "📊 Updated for GW2"
   git push
   ```
4. **Share the link**: Your league can access the updated dashboard immediately!

### What Your League Gets:
✅ **Live web dashboard** - no downloads needed  
✅ **Mobile-friendly** - works on phones/tablets  
✅ **Always up-to-date** - updates automatically when you push  
✅ **Professional URL** - easy to bookmark and share  
✅ **Free hosting** - GitHub Pages costs nothing  

---

## 🎯 **Pro Tips:**

### For League Sharing:
- **Bookmark URL**: `https://YOUR_USERNAME.github.io/fpl-dashboard`
- **Weekly announcement**: "GW2 data is live on the dashboard!"
- **Mobile use**: Works perfectly on phones
- **No technical knowledge needed** for your league members

### For Updates:
- **Consistent naming**: Keep using `gw1/`, `gw2/`, `gw3/` folder structure
- **Same CSV files**: `standings.csv`, `fixture_list.csv`, `starting_draft.csv`, etc.
- **Quick updates**: Run deploy script → commit → push (takes 30 seconds)
- **Automatic deployment**: GitHub rebuilds the site automatically

### For Customization:
- **Edit directly**: Modify files in `/docs` folder for web-only changes
- **Weekly summaries**: Add your LLM-generated summaries to the dashboard
- **New features**: Develop locally, then redeploy

---

## 🔧 **Troubleshooting:**

**Dashboard not loading?**
- Check GitHub Pages is enabled in repository settings
- Ensure `/docs` folder is selected as source
- Wait 5-10 minutes for initial deployment

**Data not updating?**
- Verify you ran `python3 deploy-github.py` after adding new data
- Check that new JSON files appear in `/docs/data/`
- Ensure you committed and pushed the changes

**Want to test locally first?**
- Run `python3 serve_dashboard.py` to test the original version
- Check `/docs/index.html` in a browser for the web version

---

## 🎉 **You're All Set!**

Your FPL dashboard is now ready for prime time. Your league will have access to a professional, live-updating dashboard that rivals any commercial FPL tool!

**Your Dashboard URL:** `https://YOUR_USERNAME.github.io/fpl-dashboard`
