# Workflow Comparison: Current vs Desired

## Your Desired Workflow

1. **Activate skill with GW number**
2. **Create new GW directory**
3. **Copy static files**: `starting_draft.csv`, `fixture_list.csv`, `draftdata25_26.xlsx`
4. **Transfer history**: Append new transfers to previous GW's file
5. **Partial results**:
   - All 0s if GW hasn't started yet
   - Current scores if GW is in progress
6. **Players CSV**: Round points (not total points) from fantasy.premierleague.com/statistics
7. **PL fixtures CSV**: Only pull once per GW (reuse if already exists)
8. **Generate summary**: Run `generate_summary.py` after final results
9. **AI summary**: Generate `ai_summary_gwX.md` in GW11 tone using `summary_gwX.csv`
10. **Local verification first**: Serve with `serve_dashboard.py`, THEN push to prod/staging after verification

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 1. Skill activation | ✅ WORKS | Skill created, ready to use |
| 2. Create GW directory | ✅ WORKS | `fetch_gameweek.py` creates directory |
| 3. Copy static files | ⚠️ PARTIAL | Copies 2/3 files (missing `draftdata25_26.xlsx`) |
| 4. Transfer history | ✅ WORKS | API returns ALL transfers (cumulative) |
| 5. Partial results logic | ❌ MISSING | No 0s handling for unstarted GW |
| 6. Players round points | ✅ WORKS | Uses `event_points` (round points) |
| 7. PL fixtures reuse | ❌ MISSING | Re-fetches every time (should cache) |
| 8. Generate summary | ❌ MISSING | Not integrated into workflow |
| 9. AI summary | ❌ MISSING | Not implemented |
| 10. Workflow split | ❌ MISSING | No local verification step |

---

## Detailed Issues & Fixes Needed

### ❌ Issue 1: Missing `draftdata25_26.xlsx` Copy

**Current:**
```python
static_files = ['fixture_list.csv', 'starting_draft.csv']
```

**Need:**
```python
static_files = ['fixture_list.csv', 'starting_draft.csv', 'draftdata25_26.xlsx']
```

**Fix:** Update `csv_generator.py` line 195

---

### ❌ Issue 2: Partial Results Logic

**Current:**
- Always generates scores based on API data
- No handling for "GW hasn't started yet" case

**Need:**
- Detect if GW has started using `bootstrap['events']` data
- If not started: Generate all 0-0 scores
- If in progress: Use current scores from API
- If finished: Use final scores

**Fix:** Add logic to `data_parser.py` to check event status

**API Check:**
```python
events = bootstrap_data['events']
current_event = next((e for e in events if e['id'] == gameweek), None)

if current_event:
    is_started = current_event['finished'] or current_event['is_current']
else:
    is_started = False

# If not started, set all scores to 0
```

---

### ❌ Issue 3: PL Fixtures Re-use

**Current:**
- Always fetches from API even if file exists

**Need:**
- Check if `pl_gwX.csv` already exists
- If exists: Skip API call, reuse existing file
- If not exists: Fetch from API

**Fix:** Add check in `fetch_gameweek.py` before calling parser

---

### ❌ Issue 4: Summary Generation Not Integrated

**Current:**
- `generate_summary.py` exists but not called

**Need:**
- After generating `final_results_gwX.csv`, run:
  ```bash
  python3 generate_summary.py gwX
  ```
- This creates `summary_gwX.csv`

**Fix:** Add to `fetch_gameweek.py` workflow

---

### ❌ Issue 5: AI Summary Generation

**Current:**
- Not implemented

**Need:**
- Script that reads `summary_gwX.csv`
- Calls Claude API (or local LLM) to generate roast-style summary
- Uses GW11 tone as reference
- Outputs `ai_summary_gwX.md`

**Fix:** Create new script `generate_ai_summary.py`

**Approach:**
1. Read `summary_gwX.csv`
2. Read `gw11/ai_summary_gw11.md` as tone reference
3. Call Claude API with prompt: "Generate a roast-style FPL summary in this tone..."
4. Save to `ai_summary_gwX.md`

**Note:** Will need Claude API key in `.env`

---

### ❌ Issue 6: Workflow Split (IMPORTANT)

**Current:**
- Single command does everything and assumes success
- No local verification step

**Need:**
Two separate workflows:

#### Workflow A: Fetch & Serve Locally
```bash
python3 fetch_gameweek.py --gameweek 18
python3 serve_dashboard.py
# User verifies in browser
```

#### Workflow B: Deploy to Prod/Staging
```bash
python3 deploy-github-clean.py
git add .
git commit -m "Add GW18 data"
git push origin main
```

**Fix Options:**

**Option 1: Manual (current)**
- User runs fetch, then serve, then deploy separately
- ✅ Simple, explicit control
- ❌ More commands to remember

**Option 2: Interactive Skill**
- Skill fetches data → serves locally → asks "Deploy?" → deploys if yes
- ✅ Streamlined, guided workflow
- ❌ Requires terminal interaction

**Option 3: Separate Skills**
- `/fetch-gameweek 18` - Fetch data and serve locally
- `/deploy-gameweek 18` - Deploy to prod/staging
- ✅ Clear separation, easy to remember
- ✅ Can verify locally between commands

**Recommended: Option 3** (Two separate skills)

---

## Updated Workflow (Recommended)

### Scenario 1: Before GW Starts (Setup)
```
You: "Fetch gameweek 18"
→ Creates gw18/
→ Copies static files (including .xlsx)
→ Generates partial_results_gw18.csv with all 0-0 scores
→ Fetches pl_gw18.csv (fixture times)
→ Transfer history is cumulative (all historical + new)
→ Serves locally at http://localhost:8000
→ "Review at localhost:8000, then run: deploy gameweek 18"
```

### Scenario 2: During GW (Mid-week Update)
```
You: "Fetch gameweek 18"
→ Updates partial_results_gw18.csv with current scores
→ Skips pl_gw18.csv (already exists)
→ Updates transfer history
→ Serves locally
→ "Review at localhost:8000, then run: deploy gameweek 18"
```

### Scenario 3: After GW Finishes (Final Results)
```
You: "Fetch gameweek 18"
→ Generates final_results_gw18.csv with final scores
→ Runs generate_summary.py to create summary_gw18.csv
→ Runs generate_ai_summary.py to create ai_summary_gw18.md
→ Serves locally
→ "Review at localhost:8000, then run: deploy gameweek 18"
```

### Deployment (After Local Verification)
```
You: "Deploy gameweek 18"
→ Runs deploy-github-clean.py
→ Commits to git
→ Pushes to staging
→ Asks: "Push to production?"
→ If yes: Pushes to main
```

---

## Implementation Plan

### Phase 1: Fix Current Issues (30 min)
1. ✅ Add `draftdata25_26.xlsx` to static file copy
2. ✅ Add partial results 0s logic for unstarted GW
3. ✅ Add PL fixtures reuse check

### Phase 2: Integration (30 min)
4. ✅ Integrate `generate_summary.py` call
5. ✅ Create `generate_ai_summary.py` script
6. ✅ Update fetch_gameweek.py to call summary scripts after final results

### Phase 3: Workflow Split (20 min)
7. ✅ Update `/fetch-gameweek` skill to serve locally (not deploy)
8. ✅ Create new `/deploy-gameweek` skill for deployment
9. ✅ Update AUTOMATION_GUIDE.md with new workflow

---

## Questions for You

1. **AI Summary Generation:**
   - Do you have a Claude API key? (needed for AI summaries)
   - Or should I use local LLM / different approach?

2. **Deployment Workflow:**
   - Do you like Option 3 (two separate skills)?
   - Or prefer Option 1 (fully manual)?

3. **Transfer History:**
   - Current approach: API returns ALL transfers (cumulative)
   - Is this OK or do you need incremental appending?

4. **Summary Generation:**
   - Should summary generation be automatic on final results?
   - Or separate command?

---

## Next Steps

Let me know your preferences on the questions above, and I'll implement the fixes!
