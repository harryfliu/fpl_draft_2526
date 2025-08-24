// FPL Draft Dashboard JavaScript with DaisyUI

// Global data manager instance
let dataManager = null;

// Pagination state for upcoming fixtures
let fixturesPagination = {
    currentPage: 0,
    gameweeksPerPage: 1,
    availableGameweeks: [],
    currentGameweek: null
};

// Data structure for the dashboard
let dashboardData = {
    currentGameweek: 8,
    leagueSize: 12,
    prizePool: 420,
    currentMonth: "August",
    weeklyWinner: "TBD",
    dataSource: "Auto-detected from gameweek folders",
    lastUpdated: "Never",
    
    leaderboard: [],
    upcomingFixtures: [],
    recentStandings: [],
    monthlyStandings: []
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initializing FPL Dashboard...');
    console.log('🔧 DEBUG: DOMContentLoaded event fired');
    
    // Initialize the data manager
    dataManager = new FPLDataManager();
    console.log('🔧 DEBUG: Data manager created');
    const success = await dataManager.initialize();
    console.log('🔧 DEBUG: Data manager initialize result:', success);
    
    if (success) {
        // Load data from the data manager
        await loadDataFromManager();
        
        // Populate dashboard
        populateDashboard();
        populateGameweekSelector();
        setupEventListeners();
        addSmoothAnimations();
        
        console.log('✅ Dashboard initialized successfully');
    } else {
        console.error('❌ Failed to initialize data manager');
        showToast('Failed to load data from gameweek folders', 'error');
        
        // Still populate the dashboard with empty state
        populateDashboard();
        populateGameweekSelector();
        setupEventListeners();
        addSmoothAnimations();
    }
});

// Load data from the data manager
async function loadDataFromManager() {
    console.log('🔧 DEBUG: loadDataFromManager called');
    if (!dataManager || !dataManager.isDataLoaded()) {
        console.warn('Data manager not ready');
        return;
    }
    
    // Get data for the selected gameweek (respects user's gameweek selection)
    const selectedGameweek = dataManager.currentGameweek;
    const currentData = dataManager.getGameweekData(selectedGameweek);
    console.log('🔧 DEBUG: currentData from data manager for GW', selectedGameweek, ':', currentData);
    if (currentData) {
        // Update dashboard data
        dashboardData.leaderboard = currentData.draft?.teams || [];
        dashboardData.draft = currentData.draft || null; // Add this line to fix draft picks
        
        console.log('🔍 DEBUG: currentData.fixtures from data manager:', currentData.fixtures);
        dashboardData.upcomingFixtures = currentData.fixtures || [];
        dashboardData.recentStandings = currentData.standings || [];
        
        console.log('🔧 DEBUG: dashboardData.leaderboard after assignment:', dashboardData.leaderboard);
        dashboardData.transferHistory = currentData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
        
        // Update current gameweek
        dashboardData.currentGameweek = dataManager.currentGameweek;
        
        // Update current month from Premier League fixtures detection
        if (dataManager.currentMonth) {
            dashboardData.currentMonth = dataManager.currentMonth;
            console.log(`📅 Updated current month to: ${dataManager.currentMonth}`);
        }
        
        // Calculate weekly winner based on highest GW points
        if (dashboardData.leaderboard && dashboardData.leaderboard.length > 0) {
            const weeklyWinner = dashboardData.leaderboard.reduce((max, team) => {
                const maxGwPoints = parseInt(max.gwPoints) || 0;
                const teamGwPoints = parseInt(team.gwPoints) || 0;
                return teamGwPoints > maxGwPoints ? team : max;
            }, dashboardData.leaderboard[0]);
            
            if (weeklyWinner && (parseInt(weeklyWinner.gwPoints) || 0) > 0) {
                dashboardData.weeklyWinner = `${weeklyWinner.manager} (${weeklyWinner.gwPoints} pts)`;
                console.log(`🏆 Weekly winner: ${dashboardData.weeklyWinner}`);
            } else {
                dashboardData.weeklyWinner = "TBD";
                console.log(`🏆 No weekly winner yet (no GW points recorded)`);
            }
        }
        
        // Update last updated timestamp
        dashboardData.lastUpdated = new Date().toLocaleString();
        
        // Immediately update top contributors gameweek display
        const gwDisplay = document.getElementById('top-contributors-gw');
        if (gwDisplay) {
            gwDisplay.textContent = `GW ${dashboardData.currentGameweek}`;
        }
        
        console.log('📊 Data loaded from data manager');
        console.log('📅 Fixtures data:', currentData.fixtures);
        console.log('📊 Dashboard fixtures:', dashboardData.upcomingFixtures);
    } else {
        console.log('📊 No data available for current gameweek');
    }

    // Load weekly summary for the current gameweek
    try {
        await loadWeeklySummary(dashboardData.currentGameweek || 1);
    } catch (e) {
        console.warn('Weekly summary not loaded:', e);
    }

    // Compute and display Weekly Winner based on results (final > partial)
    computeAndDisplayWeeklyWinner(dashboardData.currentGameweek || 1);
}

// Populate dashboard with data
function populateDashboard() {
    populateLeaderboard();
    populateDraftPicks();
    populateCurrentFixtures(); // Current gameweek fixtures
    populateFixtures(); // Future gameweek fixtures
    populatePLFixtures(); // Premier League fixtures
    populateMonthlyStandings();
    populatePlayerMovement(); // Player transfer history
    populateAnalytics(); // League analytics and insights
    populatePrizePool(); // Prize pool and earnings tracking
    populateTeamSelector(); // Restore team selector population
    updateCurrentGameweek(); // Update the current gameweek display
    updateOverviewStats(); // Update Current Month and Weekly Winner
    updateDataStatus();
    updateFixturesHeaders(); // Update both current and upcoming fixtures headers
}

// Calculate cumulative team performance up to a specific gameweek
function calculateCumulativeTeamPerformance(teamName, targetGameweek) {
    if (!dataManager) {
        return {
            manager: '',
            totalPoints: 0,
            totalGWPoints: 0,
            totalGoalsFor: 0,
            totalGoalsAgainst: 0,
            totalWins: 0,
            totalDraws: 0,
            totalLosses: 0,
            form: 'N/A',
            totalWinnings: 0
        };
    }
    
    console.log(`\n🏆 === CUMULATIVE CALCULATION FOR ${teamName} UP TO GW${targetGameweek} ===`);
    
    let totalPoints = 0;
    let totalGWPoints = 0;
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let totalWins = 0;
    let totalDraws = 0;
    let totalLosses = 0;
    let manager = '';
    let totalWinnings = 0;
    
    // Calculate cumulative totals from GW1 to target gameweek
    for (let gw = 1; gw <= targetGameweek; gw++) {
        console.log(`\n📅 Processing GW${gw} for ${teamName}...`);
        
        const gwData = dataManager.getGameweekData(gw);
        console.log(`   GW${gw} data exists: ${!!gwData}`);
        console.log(`   GW${gw} finalResults: ${gwData?.finalResults?.length || 0} results`);
        
        // Check for results (final results take priority over partial results)
        let result = null;
        if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
            // Find this team's result from final results
            result = gwData.finalResults.find(r => 
                r.homeTeam === teamName || r.awayTeam === teamName
            );
        } else if (gwData && gwData.partialResults && gwData.partialResults.length > 0) {
            // If no final results, check partial results
            result = gwData.partialResults.find(r => 
                r.homeTeam === teamName || r.awayTeam === teamName
            );
        }
        
        if (result) {
            console.log(`   ✅ Found result: ${result.homeTeam} ${result.homeScore} - ${result.awayScore} ${result.awayTeam}`);
            console.log(`   Manager: ${result.homeManager || 'N/A'} vs ${result.awayManager || 'N/A'}`);
            
            // Update manager name from results
            if (result.homeTeam === teamName) {
                manager = result.homeManager || manager;
                totalGWPoints += result.homeScore || 0;
                console.log(`   📊 Added ${result.homeScore} GW points (home team)`);
            } else {
                manager = result.awayManager || manager;
                totalGWPoints += result.awayScore || 0;
                console.log(`   📊 Added ${result.awayScore} GW points (away team)`);
            }
            
            // Calculate league points (3 for win, 1 for draw, 0 for loss)
            const homeScore = result.homeScore || 0;
            const awayScore = result.awayScore || 0;
            
            if (result.homeTeam === teamName) {
                if (homeScore > awayScore) {
                    totalWins++;
                    totalPoints += 3;
                    console.log(`   🏆 WIN: +3 points (${homeScore} > ${awayScore})`);
                } else if (homeScore === awayScore) {
                    totalDraws++;
                    totalPoints += 1;
                    console.log(`   🤝 DRAW: +1 point (${homeScore} = ${awayScore})`);
                } else {
                    totalLosses++;
                    console.log(`   ❌ LOSS: +0 points (${homeScore} < ${awayScore})`);
                }
            } else {
                if (awayScore > homeScore) {
                    totalWins++;
                    totalPoints += 3;
                    console.log(`   🏆 WIN: +3 points (${awayScore} > ${homeScore})`);
                } else if (awayScore === homeScore) {
                    totalDraws++;
                    totalPoints += 1;
                    console.log(`   🤝 DRAW: +1 point (${awayScore} = ${homeScore})`);
                } else {
                    totalLosses++;
                    console.log(`   ❌ LOSS: +0 points (${awayScore} < ${homeScore})`);
                }
            }
        } else {
            console.log(`   ❌ No result found for ${teamName} in GW${gw}`);
        }
    }
    
    console.log(`\n📊 === ${teamName} CUMULATIVE TOTALS ===`);
    console.log(`   League Points: ${totalPoints} (W:${totalWins}, D:${totalDraws}, L:${totalLosses})`);
    console.log(`   GW Points (FPL): ${totalGWPoints}`);
    console.log(`   Manager: ${manager}`);
    
    // Calculate cumulative winnings up to target gameweek
    totalWinnings = calculateCumulativeWinnings(teamName, targetGameweek);
    
    // Calculate form from recent results (last 5 gameweeks)
    const form = calculateFormFromResults(teamName);
    console.log(`   Form: ${form}`);
    console.log(`   Total Winnings: $${totalWinnings}`);
    console.log(`========================================\n`);
    
    return {
        manager,
        totalPoints,
        totalGWPoints,
        totalGoalsFor,
        totalGoalsAgainst,
        totalWins,
        totalDraws,
        totalLosses,
        form,
        totalWinnings
    };
}

// Calculate cumulative winnings for a team up to a specific gameweek
function calculateCumulativeWinnings(teamName, targetGameweek) {
    if (!dataManager) return 0;
    
    console.log(`\n💰 === WINNINGS CALCULATION FOR ${teamName} UP TO GW${targetGameweek} ===`);
    
    let totalWinnings = 0;
    
    // Calculate weekly winnings
    for (let gw = 1; gw <= targetGameweek; gw++) {
        console.log(`\n📅 Checking GW${gw} for weekly winner...`);
        
        const gwData = dataManager.getGameweekData(gw);
        console.log(`   GW${gw} data exists: ${!!gwData}`);
        console.log(`   GW${gw} finalResults: ${gwData?.finalResults?.length || 0} results`);
        
        if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
            console.log(`   📊 All GW${gw} results:`);
            gwData.finalResults.forEach((result, index) => {
                console.log(`     ${index + 1}. ${result.homeTeam} ${result.homeScore} - ${result.awayScore} ${result.awayTeam}`);
            });
            
            // Find the weekly winner (highest score across all results)
            let highestScore = 0;
            let weeklyWinner = null;
            
            gwData.finalResults.forEach(result => {
                const homeScore = result.homeScore || 0;
                const awayScore = result.awayScore || 0;
                const maxScore = Math.max(homeScore, awayScore);
                
                if (maxScore > highestScore) {
                    highestScore = maxScore;
                    weeklyWinner = result;
                }
            });
            
            if (weeklyWinner) {
                const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                    weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                const winnerScore = Math.max(weeklyWinner.homeScore || 0, weeklyWinner.awayScore || 0);
                
                console.log(`   🏆 Weekly winner: ${winnerTeam} with ${winnerScore} points`);
                console.log(`   🏆 Winner result: ${weeklyWinner.homeTeam} ${weeklyWinner.homeScore} - ${weeklyWinner.awayScore} ${weeklyWinner.awayTeam}`);
                
                // Check if this team won this gameweek
                if (teamName === winnerTeam) {
                    const totalManagers = dashboardData.leaderboard.length;
                    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                    totalWinnings += weeklyWinnings;
                    console.log(`   💰 ${teamName} won GW${gw}: +$${weeklyWinnings} (from ${totalManagers} total managers)`);
                } else {
                    console.log(`   ❌ ${teamName} did NOT win GW${gw} (winner was ${winnerTeam})`);
                }
            } else {
                console.log(`   ⚠️ No weekly winner found for GW${gw}`);
            }
        } else {
            console.log(`   ⚠️ No final results data for GW${gw}`);
        }
    }
    
    console.log(`\n💰 === ${teamName} TOTAL WINNINGS: $${totalWinnings} ===\n`);
    return totalWinnings;
}

// Populate leaderboard with DaisyUI styling
function populateLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';
    
    if (dashboardData.leaderboard.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8">
                    <div class="text-white">
                        <i class="fas fa-database text-4xl mb-2"></i>
                        <p>No team data loaded</p>
                        <p class="text-sm">Data will be loaded from gameweek folders</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
            // Calculate cumulative totals for all teams up to the current gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    console.log(`🏆 Calculating cumulative totals up to GW${currentGameweek}`);
    
    let liveLeaderboard = [];
    
    if (dataManager) {
        // Calculate cumulative performance for each team
        liveLeaderboard = dashboardData.leaderboard.map(team => {
            const cumulativeData = calculateCumulativeTeamPerformance(team.teamName, currentGameweek);
            
            // Calculate current gameweek points (points from selected gameweek only)
            let currentGWPoints = 0;
            const gwData = dataManager.getGameweekData(currentGameweek);
            if (gwData) {
                // Check final results first (take priority over partial results)
                let result = null;
                if (gwData.finalResults && gwData.finalResults.length > 0) {
                    result = gwData.finalResults.find(r => r.homeTeam === team.teamName || r.awayTeam === team.teamName);
                }
                // If no final results, check partial results
                if (!result && gwData.partialResults && gwData.partialResults.length > 0) {
                    result = gwData.partialResults.find(r => r.homeTeam === team.teamName || r.awayTeam === team.teamName);
                }
                if (result) {
                    currentGWPoints = (result.homeTeam === team.teamName) ? result.homeScore || 0 : result.awayScore || 0;
                }
            }
            
            return {
                ...team,
                manager: cumulativeData.manager,
                points: cumulativeData.totalPoints,
                currentGWPoints: currentGWPoints,
                gwPoints: cumulativeData.totalGWPoints,
                goalsFor: cumulativeData.totalGoalsFor,
                goalsAgainst: cumulativeData.totalGoalsAgainst,
                wins: cumulativeData.totalWins,
                draws: cumulativeData.totalDraws,
                losses: cumulativeData.totalLosses,
                form: cumulativeData.form,
                totalWinnings: cumulativeData.totalWinnings
            };
        });
        
        // Sort by cumulative points (highest first), then by cumulative GW points as tiebreaker
        liveLeaderboard.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            // If points are equal, sort by cumulative GW points (FPL points) as tiebreaker
            if (b.gwPoints !== a.gwPoints) {
                return b.gwPoints - a.gwPoints;
            }
            // If GW points are equal, sort by goal difference
            const aGoalDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
            const bGoalDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
            if (bGoalDiff !== aGoalDiff) {
                return bGoalDiff - aGoalDiff;
            }
            // If goal difference is equal, sort by goals for
            return (b.goalsFor || 0) - (a.goalsFor || 0);
        });
        
        // Debug: Log teams with cumulative totals
        console.log('🔍 Live leaderboard with cumulative totals:');
        liveLeaderboard.forEach((team, index) => {
            const goalDiff = (team.goalsFor || 0) - (team.goalsAgainst || 0);
            console.log(`${index + 1}. ${team.teamName}: pts=${team.points}, gw=${team.gwPoints}, winnings=$${team.totalWinnings}, diff=${goalDiff}`);
        });
        
        // Update positions after sorting
        liveLeaderboard.forEach((team, index) => {
            team.position = index + 1;
        });
        
        // Update the main leaderboard data with cumulative data
        dashboardData.leaderboard = liveLeaderboard;
    } else {
        liveLeaderboard = dashboardData.leaderboard;
    }
    
    liveLeaderboard.forEach(team => {
        const row = document.createElement('tr');
        
        // Add special styling for top 3 positions
        if (team.position <= 3) {
            row.className = 'top-3-row';
        }
        
        row.innerHTML = `
            <td>
                <div class="flex items-center gap-3">
                    ${team.position <= 3 ? getPositionBadge(team.position) : ''}
                    <span class="font-bold text-white">${team.position}</span>
                </div>
            </td>
            <td>
                <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full w-8">
                            <span class="text-xs font-bold">${team.manager.charAt(0)}</span>
                        </div>
                    </div>
                    <div>
                        <div class="font-bold text-white">${team.manager}</div>
                    </div>
                </div>
            </td>
            <td class="text-white">${team.teamName}</td>
            <td>
                <div class="font-bold text-lg text-white">${team.points || 0}</div>
            </td>
            <td>
                <div class="badge badge-primary badge-sm">${team.currentGWPoints || 0}</div>
            </td>
            <td>
                <div class="badge badge-outline badge-sm">${team.gwPoints || 0}</div>
            </td>
            <td>
                <div class="flex gap-1">
                    ${(team.form || 'N/A').split('-').map(result => 
                        `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${result === 'W' ? 'bg-success' : result === 'D' ? 'bg-neutral' : result === 'L' ? 'bg-error' : 'bg-gray-500'}">${result}</div>`
                    ).join('')}
                </div>
            </td>
            <td>
                <div class="badge ${(team.totalWinnings || 0) > 0 ? 'badge-success' : 'badge-ghost'}">
                    $${team.totalWinnings || 0}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Populate draft picks section
function populateDraftPicks() {
    const container = document.getElementById('draft-picks-content');
    if (!container) {
        console.error('Draft picks container not found');
        return;
    }
    
    if (!dashboardData.draft || !dashboardData.draft.teams || dashboardData.draft.teams.length === 0) {
        container.innerHTML = '<p class="text-white">No draft data loaded</p>';
        return;
    }
    
    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">';
    
    dashboardData.draft.teams.forEach(team => {
        const resolvedManager = getManagerFromTeamName(team.teamName);
        html += `
            <div class="card bg-base-200 shadow-sm">
                <div class="card-body p-4">
                    <h3 class="card-title text-lg font-semibold mb-2">${team.teamName}</h3>
                    <p class="text-sm text-white mb-3">${resolvedManager}</p>
                    <div class="space-y-1">
                        ${team.draftPicks.map((pick, index) => `
                            <div class="flex justify-between text-sm">
                                <span class="text-white">${index + 1}.</span>
                                <span class="font-medium">${pick}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Get position badge for top 3
function getPositionBadge(position) {
    const badges = {
        1: '<div class="badge badge-sm bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white border-0 shadow-lg" style="background: linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c);">🥇</div>',
        2: '<div class="badge badge-sm bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 text-white border-0 shadow-lg" style="background: linear-gradient(135deg, #cbd5e1, #94a3b8, #64748b);">🥈</div>',
        3: '<div class="badge badge-sm bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white border-0 shadow-lg" style="background: linear-gradient(135deg, #d97706, #ea580c, #dc2626);">🥉</div>'
    };
    return badges[position] || '';
}

// Helper function to get manager name from team name
function getManagerFromTeamName(teamName) {
    console.log('🔍 Looking up manager for team:', teamName);
    
    // First try to get manager from final/partial results (most reliable)
    if (dataManager) {
        const results = dataManager.getResults();
        const result = results.find(r => r.homeTeam === teamName || r.awayTeam === teamName);
        
        if (result) {
            let managerName = '';
            if (result.homeTeam === teamName) {
                managerName = result.homeManager;
            } else if (result.awayTeam === teamName) {
                managerName = result.awayManager;
            }
            
            if (managerName && managerName.trim()) {
                console.log(`🎯 Found manager "${managerName}" for team "${teamName}" from results`);
                return managerName;
            }
        }
    }
    
    // Fallback to leaderboard data
    if (dashboardData.leaderboard && dashboardData.leaderboard.length > 0) {
    const team = dashboardData.leaderboard.find(team => team.teamName === teamName);
        if (team && team.manager && team.manager.trim()) {
            console.log(`🎯 Found manager "${team.manager}" for team "${teamName}" from leaderboard`);
            return team.manager;
        }
    }
    
    console.log(`❌ No manager found for team "${teamName}"`);
    return 'Unknown Manager';
}

// Calculate team performance from final/partial results
function calculateTeamPerformanceFromResults(teamName) {
    if (!dataManager) return { wins: 0, draws: 0, losses: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
    
    const results = dataManager.getResults(); // Use getResults() to prioritize final results
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    
    console.log(`🔍 Calculating performance for: "${teamName}"`);
    console.log(`🔍 Available results (final/partial):`, results);
    
    results.forEach(result => {
        if (result.homeTeam === teamName) {
            // Team is home
            if (result.homeScore > result.awayScore) {
                wins++;
            } else if (result.homeScore < result.awayScore) {
                losses++;
            } else {
                draws++;
            }
            goalsFor += result.homeScore;
            goalsAgainst += result.awayScore;
        } else if (result.awayTeam === teamName) {
            // Team is away
            if (result.awayScore > result.homeScore) {
                wins++;
            } else if (result.awayScore < result.homeScore) {
                losses++;
            } else {
                draws++;
            }
            goalsFor += result.awayScore;
            goalsAgainst += result.homeScore;
        }
    });
    
    // Calculate points (3 for win, 1 for draw, 0 for loss)
    const points = (wins * 3) + draws;
    
    const result = { wins, draws, losses, points, goalsFor, goalsAgainst };
    console.log(`🔍 Final performance for "${teamName}":`, result);
    
    return result;
}

// Populate current fixtures for the current gameweek only
function populateCurrentFixtures() {
    const container = document.getElementById('currentFixturesContainer');
    
    if (!container) {
        console.error('❌ currentFixturesContainer element not found!');
        return;
    }
    
    container.innerHTML = '';
    
    console.log('📅 Current gameweek:', dashboardData.currentGameweek);
    console.log('📅 All fixtures:', dashboardData.upcomingFixtures);
    console.log('🏆 Leaderboard at fixture render time:', dashboardData.leaderboard);
    
    if (!dashboardData.upcomingFixtures || dashboardData.upcomingFixtures.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-white mb-2">
                    <i class="fas fa-calendar-check text-4xl"></i>
                </div>
                <p class="text-white">No current fixtures loaded</p>
                <p class="text-sm text-white">Current gameweek fixtures will appear here</p>
            </div>
        `;
        return;
    }
    
    // Filter fixtures for current gameweek only
    const currentFixtures = dashboardData.upcomingFixtures.filter(fixture => 
        fixture.gameweek === dashboardData.currentGameweek
    );
    
    console.log('📅 Current fixtures filtered:', currentFixtures);
    
    if (currentFixtures.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-white mb-2">
                    <i class="fas fa-calendar-check text-4xl"></i>
                </div>
                <p class="text-white">No fixtures for current gameweek</p>
                <p class="text-sm text-white">GW ${dashboardData.currentGameweek} fixtures will appear here</p>
            </div>
        `;
        return;
    }
    
    currentFixtures.forEach(fixture => {
        const fixtureElement = document.createElement('div');
        fixtureElement.className = 'card bg-gray-900/90 border border-gray-700/50 mb-4 shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300';
        
        // Get manager names for both teams
        const homeManager = getManagerFromTeamName(fixture.homeTeam);
        const awayManager = getManagerFromTeamName(fixture.awayTeam);
        
        // Check if we have results for this fixture (final results take priority)
        const partialResult = dataManager?.getResults(dashboardData.currentGameweek)?.find(result => 
            (result.homeTeam === fixture.homeTeam && result.awayTeam === fixture.awayTeam) ||
            (result.homeTeam === fixture.awayTeam && result.awayTeam === fixture.homeTeam)
        );
        
        // Determine if this is a final result or partial result
        const isFinalResult = partialResult && partialResult.isFinal === true;
        
        // Determine which team is home/away in the fixture vs partial result
        let homeScore, awayScore;
        if (partialResult) {
            if (partialResult.homeTeam === fixture.homeTeam) {
                homeScore = partialResult.homeScore;
                awayScore = partialResult.awayScore;
            } else {
                homeScore = partialResult.awayScore;
                awayScore = partialResult.homeScore;
            }
        }
        
        fixtureElement.innerHTML = `
            <div class="card-body p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="avatar placeholder">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-10">
                                <span class="text-sm font-bold">${fixture.homeTeam.charAt(0)}</span>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="font-semibold text-white">${fixture.homeTeam}</div>
                            <div class="text-xs text-white">${homeManager}</div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r ${partialResult ? (partialResult.homeScore > partialResult.awayScore ? 'from-green-600 to-green-700' : partialResult.homeScore < partialResult.awayScore ? 'from-red-600 to-red-700' : 'from-yellow-600 to-yellow-700') : 'from-purple-600 to-blue-600'} text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                        ${partialResult ? `${partialResult.homeScore} - ${partialResult.awayScore}` : 'VS'}
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-center">
                            <div class="font-semibold text-white">${fixture.awayTeam}</div>
                            <div class="text-xs text-white">${awayManager}</div>
                        </div>
                        <div class="avatar placeholder">
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full w-10">
                                <span class="text-sm font-bold">${fixture.awayTeam.charAt(0)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${partialResult ? `
                <div class="text-center text-xs text-gray-400 mt-2">
                    <i class="fas fa-trophy mr-1"></i>
                    ${isFinalResult ? `Final result from GW${dashboardData.currentGameweek}` : `Partial result from GW${dashboardData.currentGameweek}`}
                </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(fixtureElement);
    });
}

// Populate upcoming fixtures (future gameweeks only) with pagination
function populateFixtures() {
    const container = document.getElementById('fixturesContainer');
    
    if (!container) {
        console.error('❌ fixturesContainer element not found!');
        return;
    }
    
    container.innerHTML = '';
    
    if (!dashboardData.upcomingFixtures || dashboardData.upcomingFixtures.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-white mb-2">
                    <i class="fas fa-calendar text-4xl"></i>
                </div>
                <p class="text-white">No upcoming fixtures</p>
                <p class="text-sm text-white">Future gameweek fixtures will appear here</p>
            </div>
        `;
        hidePaginationControls();
        return;
    }
    
    // Group fixtures by gameweek (only future gameweeks)
    const fixturesByGameweek = {};
    const currentGW = dashboardData.currentGameweek;
    
    dashboardData.upcomingFixtures.forEach(fixture => {
        // Only include fixtures from gameweeks AFTER the current gameweek
        if (fixture.gameweek > currentGW) {
            if (!fixturesByGameweek[fixture.gameweek]) {
                fixturesByGameweek[fixture.gameweek] = [];
            }
            fixturesByGameweek[fixture.gameweek].push(fixture);
        }
    });
    
    const availableGameweeks = Object.keys(fixturesByGameweek).sort((a, b) => parseInt(a) - parseInt(b));
    
    console.log('📊 Future fixtures grouped by gameweek:', fixturesByGameweek);
    console.log('📊 Available gameweeks:', availableGameweeks);
    
    // Update pagination state
    fixturesPagination.availableGameweeks = availableGameweeks;
    fixturesPagination.currentGameweek = currentGW;
    
    // Check if there are any future fixtures
    if (availableGameweeks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-white mb-2">
                    <i class="fas fa-calendar text-4xl"></i>
                </div>
                <p class="text-white">No upcoming fixtures</p>
                <p class="text-sm text-white">Future gameweek fixtures will appear here</p>
            </div>
        `;
        hidePaginationControls();
        return;
    }
    
    // Initialize pagination if needed
    if (fixturesPagination.currentPage >= availableGameweeks.length) {
        fixturesPagination.currentPage = 0;
    }
    
    // Display fixtures for current page (one gameweek)
    const currentGameweekIndex = fixturesPagination.currentPage;
    const gameweek = availableGameweeks[currentGameweekIndex];
    const fixtures = fixturesByGameweek[gameweek];
    
    console.log(`📄 Showing page ${currentGameweekIndex + 1}/${availableGameweeks.length}: GW ${gameweek}`);
    
    // Create gameweek header
    const gameweekHeader = document.createElement('div');
    gameweekHeader.className = 'text-lg font-semibold text-white mb-4';
    gameweekHeader.innerHTML = `<i class="fas fa-calendar-week text-primary mr-2"></i>Gameweek ${gameweek}`;
    container.appendChild(gameweekHeader);
    
    // Add fixtures for this gameweek
    fixtures.forEach(fixture => {
        const fixtureElement = document.createElement('div');
        fixtureElement.className = 'card bg-gray-900/90 border border-gray-700/50 mb-4 shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300';
        
        // Get manager names for both teams
        const homeManager = getManagerFromTeamName(fixture.homeTeam);
        const awayManager = getManagerFromTeamName(fixture.awayTeam);
        
        fixtureElement.innerHTML = `
            <div class="card-body p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="avatar placeholder">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full w-10">
                                <span class="text-sm font-bold">${fixture.homeTeam.charAt(0)}</span>
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="font-semibold text-white">${fixture.homeTeam}</div>
                            <div class="text-xs text-white">${homeManager}</div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">VS</div>
                    <div class="flex items-center gap-3">
                        <div class="text-center">
                            <div class="font-semibold text-white">${fixture.awayTeam}</div>
                            <div class="text-xs text-white">${awayManager}</div>
                        </div>
                        <div class="avatar placeholder">
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full w-10">
                                <span class="text-sm font-bold">${fixture.awayTeam.charAt(0)}</span>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(fixtureElement);
    });
    
    // Update pagination controls
    updatePaginationControls();
}

// Pagination control functions
function updatePaginationControls() {
    const paginationControls = document.getElementById('fixture-pagination-controls');
    const currentPageElement = document.getElementById('current-fixture-page');
    const prevButton = document.getElementById('prev-fixture-page');
    const nextButton = document.getElementById('next-fixture-page');
    
    if (!paginationControls || !currentPageElement || !prevButton || !nextButton) {
        console.error('❌ Pagination control elements not found!');
        return;
    }
    
    const availableGameweeks = fixturesPagination.availableGameweeks;
    
    if (availableGameweeks.length <= 1) {
        // Hide pagination if only one or no gameweeks
        paginationControls.style.display = 'none';
        return;
    }
    
    // Show pagination controls
    paginationControls.style.display = 'flex';
    
    // Update current page display
    const currentGameweek = availableGameweeks[fixturesPagination.currentPage];
    currentPageElement.textContent = `GW ${currentGameweek}`;
    
    // Update button states
    prevButton.disabled = fixturesPagination.currentPage === 0;
    nextButton.disabled = fixturesPagination.currentPage >= availableGameweeks.length - 1;
    
    // Add disabled styling
    if (prevButton.disabled) {
        prevButton.classList.add('btn-disabled');
    } else {
        prevButton.classList.remove('btn-disabled');
    }
    
    if (nextButton.disabled) {
        nextButton.classList.add('btn-disabled');
    } else {
        nextButton.classList.remove('btn-disabled');
    }
    
    console.log(`📄 Pagination: ${fixturesPagination.currentPage + 1}/${availableGameweeks.length} (GW ${currentGameweek})`);
}

function hidePaginationControls() {
    const paginationControls = document.getElementById('fixture-pagination-controls');
    if (paginationControls) {
        paginationControls.style.display = 'none';
    }
}

function changeFixturePage(direction) {
    const availableGameweeks = fixturesPagination.availableGameweeks;
    
    if (availableGameweeks.length === 0) {
        console.log('⚠️ No gameweeks available for pagination');
        return;
    }
    
    const newPage = fixturesPagination.currentPage + direction;
    
    // Check bounds
    if (newPage < 0 || newPage >= availableGameweeks.length) {
        console.log(`⚠️ Page ${newPage + 1} out of bounds (1-${availableGameweeks.length})`);
        return;
    }
    
    // Update pagination state
    fixturesPagination.currentPage = newPage;
    
    console.log(`📄 Changed to page ${newPage + 1}/${availableGameweeks.length} (GW ${availableGameweeks[newPage]})`);
    
    // Re-populate fixtures with new page
    populateFixtures();
}

// Populate monthly standings with DaisyUI styling
function populateMonthlyStandings() {
    const container = document.getElementById('monthlyContainer');
    container.innerHTML = '';
    
    if (dashboardData.leaderboard.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="text-white">
                    <i class="fas fa-calendar-month text-4xl mb-2"></i>
                    <p>No monthly data loaded</p>
                    <p class="text-sm">Monthly standings will be calculated from gameweek data</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Create monthly standings from leaderboard with correct monthly FPL points calculation
    dashboardData.monthlyStandings = dashboardData.leaderboard.map(team => {
        // Calculate total GW points (FPL points) for the current month
        let totalGWPoints = 0;
        
        // Get the current month based on selected gameweek
        const currentGameweek = dashboardData.currentGameweek || 1;
        const currentMonth = getMonthFromGameweek(currentGameweek);
        
        // Sum up FPL points from all gameweeks in the current month
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const monthForGW = getMonthFromGameweek(gw);
            if (monthForGW === currentMonth) {
                const gwData = dataManager.getGameweekData(gw);
                if (gwData) {
                    // Check final results first (take priority over partial results)
                    let result = null;
                    if (gwData.finalResults && gwData.finalResults.length > 0) {
                        result = gwData.finalResults.find(r => 
                            r.homeTeam === team.teamName || r.awayTeam === team.teamName
                        );
                    }
                    // If no final results, check partial results
                    if (!result && gwData.partialResults && gwData.partialResults.length > 0) {
                        result = gwData.partialResults.find(r => 
                            r.homeTeam === team.teamName || r.awayTeam === team.teamName
                        );
                    }
                    
                    if (result) {
                        if (result.homeTeam === team.teamName) {
                            totalGWPoints += result.homeScore || 0;
                        } else {
                            totalGWPoints += result.awayScore || 0;
                        }
                    }
                }
            }
        }
        
        // Calculate monthly-only winnings (not cumulative)
        let monthlyWinnings = 0;
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const monthForGW = getMonthFromGameweek(gw);
            if (monthForGW === currentMonth) {
                const gwData = dataManager.getGameweekData(gw);
                if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                    // Find the weekly winner for this gameweek
                    let highestScore = 0;
                    let weeklyWinner = null;
                    
                    gwData.finalResults.forEach(result => {
                        const homeScore = result.homeScore || 0;
                        const awayScore = result.awayScore || 0;
                        const maxScore = Math.max(homeScore, awayScore);
                        
                        if (maxScore > highestScore) {
                            highestScore = maxScore;
                            weeklyWinner = result;
                        }
                    });
                    
                    if (weeklyWinner) {
                        const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                            weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                        
                        // Check if this team won this gameweek
                        if (team.teamName === winnerTeam) {
                            const totalManagers = dashboardData.leaderboard.length;
                            const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                            monthlyWinnings += weeklyWinnings;
                        }
                    }
                }
            }
        }

        return {
        position: team.position,
            manager: getManagerFromTeamName(team.teamName), // Use function to get manager name
            teamName: team.teamName,
            totalGWPoints: totalGWPoints, // Total FPL points earned this month
            winnings: monthlyWinnings // Monthly-only winnings
        };
    });
    
    // Sort by total GW points (FPL points) highest first, then by goal difference
    dashboardData.monthlyStandings.sort((a, b) => {
        if (b.totalGWPoints !== a.totalGWPoints) {
            return b.totalGWPoints - a.totalGWPoints;
        }
        const aGoalDiff = a.goalsFor - a.goalsAgainst;
        const bGoalDiff = b.goalsFor - b.goalsAgainst;
        return bGoalDiff - aGoalDiff;
    });
    
    // Update positions after sorting by GW points
    dashboardData.monthlyStandings.forEach((standing, index) => {
        standing.position = index + 1;
    });
    
    dashboardData.monthlyStandings.forEach(standing => {
        const standingElement = document.createElement('div');
        standingElement.className = 'card bg-gray-900/90 border border-gray-700/50 text-center shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300';
        
        standingElement.innerHTML = `
            <div class="card-body p-6">
                <div class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">${standing.position}</div>
                <div class="font-semibold text-white mb-2">${standing.manager}</div>
                <div class="text-sm text-gray-300 mb-1">${standing.teamName}</div>
                <div class="text-lg font-bold text-white mb-2">${standing.totalGWPoints} FPL pts</div>
                
                ${standing.winnings > 0 ? 
                    `<div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg gap-1 inline-flex items-center">
                        <i class="fas fa-dollar-sign"></i>
                        +$${standing.winnings}
                    </div>` : 
                    '<div class="bg-gray-700/60 text-gray-300 px-3 py-2 rounded-full text-sm border border-gray-600/50">No winnings</div>'
                }
            </div>
        `;
        
        container.appendChild(standingElement);
    });
}

// Update both current and upcoming fixtures header gameweek indicators
function updateFixturesHeaders() {
    // Update current fixtures header
    const currentFixturesHeader = document.querySelector('.current-fixtures-section .current-gameweek-indicator');
    if (currentFixturesHeader) {
        currentFixturesHeader.textContent = `GW ${dashboardData.currentGameweek}`;
    }
    
    // Update upcoming fixtures header
    const upcomingFixturesHeader = document.querySelector('.fixtures-section .upcoming-gameweek-indicator');
    if (upcomingFixturesHeader) {
        const nextGameweek = dashboardData.currentGameweek + 1;
        upcomingFixturesHeader.textContent = `GW ${nextGameweek}+`;
    }
}

// Populate Premier League fixtures
function populatePLFixtures() {
    const container = document.getElementById('plFixturesContainer');
    
    if (!container) {
        console.error('❌ plFixturesContainer element not found!');
        return;
    }

    // Get selected gameweek's Premier League fixtures (respects user's gameweek selection)
    const currentData = dataManager?.getGameweekData(dashboardData.currentGameweek);
    const plFixtures = currentData?.plFixtures || [];

    // Update the gameweek indicator
    const plGameweekIndicator = document.getElementById('pl-gameweek-indicator');
    if (plGameweekIndicator) {
        plGameweekIndicator.textContent = `GW ${dashboardData.currentGameweek}`;
    }

    console.log(`🏆 Displaying ${plFixtures.length} Premier League fixtures`);

    if (plFixtures.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-white">
                    <i class="fas fa-futbol text-4xl mb-2"></i>
                    <p>No Premier League fixtures available</p>
                    <p class="text-sm text-white">No fixtures data available for GW${dashboardData.currentGameweek}</p>
                </div>
            </div>
        `;
        return;
    }

    // Group fixtures by date
    const fixturesByDate = {};
    plFixtures.forEach(fixture => {
        if (!fixturesByDate[fixture.date]) {
            fixturesByDate[fixture.date] = [];
        }
        fixturesByDate[fixture.date].push(fixture);
    });

    // Generate HTML for fixtures grouped by date
    let fixturesHTML = '';
    Object.keys(fixturesByDate).forEach(date => {
        const dayFixtures = fixturesByDate[date];
        
        fixturesHTML += `
            <div class="card bg-gray-900/90 border border-gray-700/50 mb-4 shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300">
                <div class="card-body p-4">
                    <h3 class="font-semibold text-white mb-3">
                        <i class="fas fa-calendar-day text-purple-400 mr-2"></i>
                        ${date}
                    </h3>
                    <div class="space-y-3">
                        ${dayFixtures.map(fixture => `
                            <div class="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-gray-600/40">
                                <div class="flex items-center space-x-3">
                                    <span class="text-white font-medium">${fixture.homeTeam}</span>
                                    <span class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">vs</span>
                                    <span class="text-white font-medium">${fixture.awayTeam}</span>
                                </div>
                                <div class="text-purple-300 font-semibold">
                                    <i class="fas fa-clock mr-1"></i>
                                    ${fixture.time}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = fixturesHTML;
}

// Update current gameweek
function updateCurrentGameweek() {
    const gameweekElement = document.getElementById('currentGameweek');
    if (gameweekElement) {
        if (dashboardData.currentGameweek === 1) {
            gameweekElement.textContent = '1';
        } else {
            gameweekElement.textContent = dashboardData.currentGameweek;
        }
    }
    
    // Update top contributors gameweek display
    const gwDisplay = document.getElementById('top-contributors-gw');
    if (gwDisplay) {
        gwDisplay.textContent = `GW ${dashboardData.currentGameweek}`;
    }
    
    // Update the "Current" label visibility
    const currentLabel = document.getElementById('current-label');
    if (currentLabel) {
        // Only show "Current" if the selected gameweek is the actual current gameweek
        const selectedGameweek = dashboardData.currentGameweek;
        const actualCurrentGameweek = dataManager ? dataManager.getCurrentGameweek() : 1;
        
        if (selectedGameweek === actualCurrentGameweek) {
            currentLabel.style.display = 'block';
            currentLabel.textContent = 'Current';
        } else {
            currentLabel.style.display = 'none';
        }
        
        console.log(`🎯 updateCurrentGameweek: selected=${selectedGameweek}, actual=${actualCurrentGameweek}, showing label: ${selectedGameweek === actualCurrentGameweek}`);
    }
}

// Helper function to get season month number from month name
function getSeasonMonthNumber(monthName) {
    const monthMap = {
        'August': 1,
        'September': 2,
        'October': 3,
        'November': 4,
        'December': 5,
        'January': 6,
        'February': 7,
        'March': 8,
        'April': 9,
        'May': 10
    };
    
    return monthMap[monthName] || 1; // Default to Month 1 if not found
}

// Update overview stats (Current Month and Weekly Winner)
function updateOverviewStats() {
    // Update Current Month display
    const currentMonthElement = document.getElementById('current-month-display');
    if (currentMonthElement) {
        currentMonthElement.textContent = dashboardData.currentMonth;
        console.log(`📅 Updated Current Month display to: ${dashboardData.currentMonth}`);
    }
    
    // Update Season Month display
    const seasonMonthElement = document.getElementById('season-month-display');
    if (seasonMonthElement) {
        const monthNumber = getSeasonMonthNumber(dashboardData.currentMonth);
        seasonMonthElement.textContent = `Month ${monthNumber}`;
        console.log(`📅 Updated Season Month display to: Month ${monthNumber}`);
    }
    
    // Update Weekly Winner display
    const weeklyWinnerElement = document.getElementById('weekly-winner-display');
    if (weeklyWinnerElement) {
        weeklyWinnerElement.textContent = dashboardData.weeklyWinner;
        console.log(`🏆 Updated Weekly Winner display to: ${dashboardData.weeklyWinner}`);
    }
}

// Update data status
function updateDataStatus() {
    if (!dataManager) {
        // Show default state when data manager is not ready
        const dataSourceElement = document.getElementById('dataSource');
        if (dataSourceElement) {
            dataSourceElement.textContent = 'Initializing...';
        }
        
        const gameweeksFoundElement = document.getElementById('gameweeksFound');
        if (gameweeksFoundElement) {
            gameweeksFoundElement.textContent = '0';
        }
        
        const currentGameweekStatusElement = document.getElementById('currentGameweekStatus');
        if (currentGameweekStatusElement) {
            currentGameweekStatusElement.textContent = 'GW 1';
        }
        
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = 'Never';
        }
        return;
    }
    
    const dataSummary = dataManager.getDataSummary();
    
    // Update the data source display
    const dataSourceElement = document.getElementById('dataSource');
    if (dataSourceElement) {
        console.log('📊 Data Summary:', dataSummary); // Debug log
        if (dataSummary.totalGameweeks === 0) {
            dataSourceElement.textContent = 'No gameweek folders found';
        } else if (dataSummary.totalGameweeks === 1 && dataSummary.availableGameweeks.includes(1)) {
            dataSourceElement.textContent = 'GW1 (First gameweek)';
        } else if (dataSummary.totalGameweeks === 1) {
            // Single gameweek but not GW1
            const gw = dataSummary.availableGameweeks[0];
            dataSourceElement.textContent = `GW${gw} (Current gameweek)`;
        } else {
            dataSourceElement.textContent = `Auto-detected (${dataSummary.totalGameweeks} gameweeks)`;
        }
        console.log('📊 Data Source updated to:', dataSourceElement.textContent); // Debug log
    }
    
    // Update gameweeks found
    const gameweeksFoundElement = document.getElementById('gameweeksFound');
    if (gameweeksFoundElement) {
        if (dataSummary.totalGameweeks === 0) {
            gameweeksFoundElement.textContent = '0';
        } else {
            gameweeksFoundElement.textContent = dataSummary.availableGameweeks.join(', ') || 'None';
        }
    }
    
    // Update current gameweek status
    const currentGameweekStatusElement = document.getElementById('currentGameweekStatus');
    if (currentGameweekStatusElement) {
        if (dataSummary.currentGameweek === 1) {
            currentGameweekStatusElement.textContent = 'GW 1';
        } else {
            currentGameweekStatusElement.textContent = `GW ${dataSummary.currentGameweek}`;
        }
    }
    
    // Update last updated
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = dataSummary.lastUpdated;
    }
}

// Refresh data from gameweek folders
async function refreshData() {
    if (!dataManager) {
        showToast('Data manager not initialized', 'error');
        return;
    }
    
    // Show loading state
    const refreshBtn = document.querySelector('button[onclick="refreshData()"]');
    const originalContent = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Refreshing...';
    refreshBtn.disabled = true;
    
    try {
        // Refresh data
        await dataManager.refreshData();
        
        // Reload dashboard data
        await loadDataFromManager();
        
        // Repopulate dashboard
        populateDashboard();
        
        // Update status
        updateDataStatus();
        
        showToast('Data refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error refreshing data', 'error');
    } finally {
        // Restore button state
        refreshBtn.innerHTML = originalContent;
        refreshBtn.disabled = false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // Gameweek selector
    const gameweekSelector = document.getElementById('gameweekSelector');
    if (gameweekSelector) {
        gameweekSelector.addEventListener('change', handleGameweekChange);
    }
    
    // Team selector
    const teamSelector = document.getElementById('teamSelector');
    if (teamSelector) {
        teamSelector.addEventListener('change', handleTeamSelection);
    }
    
    // Add hover effects to table rows
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.classList.add('scale-105', 'transition-transform', 'duration-200');
        });
        
        row.addEventListener('mouseleave', function() {
            this.classList.remove('scale-105');
        });
    });
}

// Handle team selection
function handleTeamSelection(event) {
    const selectedTeamName = event.target.value;
    if (!selectedTeamName) {
        hideTeamDetails();
        return;
    }
    
    // Find the selected team from the live leaderboard (same data source as the displayed table)
    let selectedTeam = null;
    
    if (dataManager) {
        const partialResults = dataManager.getResults();
        
        if (partialResults.length > 0) {
            // Get the live leaderboard data (same as populateLeaderboard)
            const liveLeaderboard = dashboardData.leaderboard.map(leaderboardTeam => {
                const performance = calculateTeamPerformanceFromResults(leaderboardTeam.teamName);
                
                // Get GW points from partial results
                let gwPoints = 0;
                partialResults.forEach(result => {
                    if (result.homeTeam === leaderboardTeam.teamName) {
                        gwPoints = result.homeScore;
                    } else if (result.awayTeam === leaderboardTeam.teamName) {
                        gwPoints = result.awayScore;
                    }
                });
                
                return {
                    ...leaderboardTeam,
                    points: performance.points,
                    gwPoints: gwPoints,
                    goalsFor: performance.goalsFor,
                    goalsAgainst: performance.goalsAgainst
                };
            });
            
            // Sort by points (highest first), then by GW points (FPL points) as tiebreaker, then by goal difference, then by goals for
            liveLeaderboard.sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                // If points are equal, sort by GW points (FPL points) as tiebreaker
                if (b.gwPoints !== a.gwPoints) {
                    return b.gwPoints - a.gwPoints;
                }
                // If GW points are equal, sort by goal difference
                const aGoalDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
                const bGoalDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
                if (bGoalDiff !== aGoalDiff) {
                    return bGoalDiff - aGoalDiff;
                }
                // If goal difference is equal, sort by goals for
                return (b.goalsFor || 0) - (a.goalsFor || 0);
            });
            
            // Update positions after sorting
            liveLeaderboard.forEach((leaderboardTeam, index) => {
                leaderboardTeam.position = index + 1;
            });
            
            // Find the team in the live leaderboard
            selectedTeam = liveLeaderboard.find(team => team.teamName === selectedTeamName);
        }
    }
    
    // Fallback to original leaderboard if no live data
    if (!selectedTeam) {
        selectedTeam = dashboardData.leaderboard.find(team => team.teamName === selectedTeamName);
    }
    
    if (selectedTeam) {
        console.log('🔍 DEBUG: Selected team from live leaderboard:', selectedTeam);
        displayTeamDetails(selectedTeam);
    }
}

// Display team details
function displayTeamDetails(team) {
    console.log('🔍 DEBUG: displayTeamDetails called with team:', team);
    console.log('🔍 DEBUG: Team position from object:', team.position);
    
    // Show team details container
    const teamDetailsContainer = document.getElementById('team-details-container');
    const teamSelectionPrompt = document.getElementById('team-selection-prompt');
    
    if (teamDetailsContainer && teamSelectionPrompt) {
        teamDetailsContainer.classList.remove('hidden');
        teamSelectionPrompt.classList.add('hidden');
    }
    
    // Update team info
    const teamInitial = document.getElementById('team-initial');
    const teamName = document.getElementById('team-name');
    const teamManager = document.getElementById('team-manager');
    const teamPosition = document.getElementById('team-position');
    
    if (teamInitial) teamInitial.textContent = team.teamName.charAt(0);
    if (teamName) teamName.textContent = team.teamName;
    if (teamManager) teamManager.textContent = team.manager;
    if (teamPosition) teamPosition.textContent = `#${team.position}`;
    
    // Update team stats with partial results data
    const teamPerformance = calculateTeamPerformanceFromResults(team.teamName);
    const teamTotalPoints = document.getElementById('team-total-points');
    const teamGWPoints = document.getElementById('team-gw-points');
    const teamForm = document.getElementById('team-form');
    const teamWinnings = document.getElementById('team-winnings');
    
    // Use partial results for points if available
    if (teamPerformance.points > 0) {
        if (teamTotalPoints) teamTotalPoints.textContent = teamPerformance.points;
    } else {
    if (teamTotalPoints) teamTotalPoints.textContent = team.points || 0;
    }
    
    // Calculate GW Points from partial results (actual FPL points earned)
    // For Teams section: only show current gameweek points, not cumulative
    const currentGameweek = dashboardData.currentGameweek || 1;
    let currentGameweekPoints = 0;
    
    if (dataManager) {
        // Check if there are results for the current gameweek
        const gwData = dataManager.getGameweekData(currentGameweek);
        if (gwData) {
            // Check final results first (take priority over partial results)
            let result = null;
            if (gwData.finalResults && gwData.finalResults.length > 0) {
                result = gwData.finalResults.find(r => 
                    r.homeTeam === team.teamName || r.awayTeam === team.teamName
                );
            }
            // If no final results, check partial results
            if (!result && gwData.partialResults && gwData.partialResults.length > 0) {
                result = gwData.partialResults.find(r => 
                    r.homeTeam === team.teamName || r.awayTeam === team.teamName
                );
            }
            
            if (result) {
                if (result.homeTeam === team.teamName) {
                    currentGameweekPoints = result.homeScore || 0;
                } else {
                    currentGameweekPoints = result.awayScore || 0;
                }
                console.log(`📊 ${team.teamName} GW${currentGameweek} points: ${currentGameweekPoints} (from current gameweek results)`);
            } else {
                console.log(`📊 ${team.teamName} GW${currentGameweek} points: 0 (no result found for current gameweek)`);
            }
        } else {
            console.log(`📊 ${team.teamName} GW${currentGameweek} points: 0 (no results data for current gameweek)`);
        }
    } else {
        console.log(`📊 ${team.teamName} GW${currentGameweek} points: 0 (no data manager)`);
    }
    
    if (teamGWPoints) teamGWPoints.textContent = currentGameweekPoints;
    
    // Use the new form calculation function for accurate form display
    if (teamForm) {
        const calculatedForm = calculateFormFromResults(team.teamName);
        if (calculatedForm !== 'N/A') {
            // Display form as badges (most recent on the right)
            teamForm.innerHTML = calculatedForm.split('-').map(result => 
                `<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white inline-block mr-1 ${result === 'W' ? 'bg-success' : result === 'D' ? 'bg-neutral' : result === 'L' ? 'bg-error' : 'bg-gray-500'}">${result}</div>`
            ).join('');
        } else {
            teamForm.textContent = calculatedForm;
        }
    }
    
    // For Teams section: only show current gameweek winnings, not cumulative
    // Check if there are results for the current gameweek
    let currentGameweekWinnings = 0;
    
    if (dataManager) {
        const partialResults = dataManager.getResults();
        if (partialResults.length > 0) {
            // Check if this team won the current gameweek
            const currentGameweek = dashboardData.currentGameweek || 1;
            const gwData = dataManager.getGameweekData(currentGameweek);
            
            if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                // Find the weekly winner for current gameweek
                let highestScore = 0;
                let weeklyWinner = null;
                
                gwData.finalResults.forEach(result => {
                    const homeScore = result.homeScore || 0;
                    const awayScore = result.awayScore || 0;
                    const maxScore = Math.max(homeScore, awayScore);
                    
                    if (maxScore > highestScore) {
                        highestScore = maxScore;
                        weeklyWinner = result;
                    }
                });
                
                if (weeklyWinner) {
                    const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                        weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                    
                    // Check if this team won the current gameweek
                    if (team.teamName === winnerTeam) {
                        const totalManagers = dashboardData.leaderboard.length;
                        currentGameweekWinnings = totalManagers - 1; // $1 from each other manager
                        console.log(`💰 ${team.teamName} won current gameweek (GW${currentGameweek}): +$${currentGameweekWinnings}`);
                    }
                }
            }
        }
    }
    
    if (teamWinnings) teamWinnings.textContent = `$${currentGameweekWinnings}`;
    console.log(`💰 ${team.teamName} current gameweek winnings: $${currentGameweekWinnings}`);
    
    // Update team performance (get from partial results data)
    const teamWins = document.getElementById('team-wins');
    const teamDraws = document.getElementById('team-draws');
    const teamLosses = document.getElementById('team-losses');
    const teamRank = document.getElementById('team-rank');
    
    if (teamWins) teamWins.textContent = teamPerformance.wins;
    if (teamDraws) teamDraws.textContent = teamPerformance.draws;
    if (teamLosses) teamLosses.textContent = teamPerformance.losses;
    // Use the exact same ranking from the live Season Leaderboard
    if (dataManager && teamPerformance.points > 0) {
        console.log('🔍 DEBUG: Looking for team position for:', team.teamName);
        
        // Instead of recalculating, get the team's position from the DOM table that's already been populated
        const leaderboardTable = document.getElementById('leaderboardBody');
        if (leaderboardTable) {
            const rows = leaderboardTable.querySelectorAll('tr');
            console.log('🔍 DEBUG: Found', rows.length, 'rows in leaderboard table');
            
            let teamPosition = null;
            
            // Find the row that contains this team
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const teamNameCell = row.querySelector('td:nth-child(3)'); // Team name is in 3rd column
                if (teamNameCell) {
                    console.log(`🔍 DEBUG: Row ${i} team name: "${teamNameCell.textContent.trim()}" vs looking for: "${team.teamName}"`);
                    if (teamNameCell.textContent.trim() === team.teamName) {
                        // Get the position from the first column
                        const positionCell = row.querySelector('td:first-child span.font-bold');
                        if (positionCell) {
                            teamPosition = positionCell.textContent.trim();
                            console.log('🔍 DEBUG: Found team position in DOM:', teamPosition);
                            break;
                        } else {
                            console.log('🔍 DEBUG: Position cell not found in row', i);
                        }
                    }
                } else {
                    console.log(`🔍 DEBUG: No team name cell found in row ${i}`);
                }
            }
            
            if (teamPosition && teamRank) {
                console.log('🔍 DEBUG: Setting team rank to:', teamPosition);
                teamRank.textContent = `#${teamPosition}`;
            } else {
                // Fallback: use the team's original position
                console.log('🔍 DEBUG: Using fallback position:', team.position);
                if (teamRank) teamRank.textContent = `#${team.position}`;
            }
        } else {
            // Fallback: use the team's original position
            console.log('🔍 DEBUG: Leaderboard table not found, using fallback position:', team.position);
            if (teamRank) teamRank.textContent = `#${team.position}`;
        }
    } else {
        console.log('🔍 DEBUG: No dataManager or no points, using original position:', team.position);
        if (teamRank) teamRank.textContent = `#${team.position}`;
    }
    
    // Update top contributors
    displayTeamTopContributors(team);
    
    // Update current squad
    displayTeamCurrentSquad(team);
    
    // Update draft picks
    displayTeamDraftPicks(team);
}

// Display team top contributors for current gameweek
function displayTeamTopContributors(team) {
    console.log('🏆 DEBUG: displayTeamTopContributors called for team:', team);
    
    const container = document.getElementById('team-top-contributors');
    const emptyMessage = document.getElementById('team-top-contributors-empty');
    
    console.log('🏆 DEBUG: Container found:', !!container);
    console.log('🏆 DEBUG: Empty message found:', !!emptyMessage);
    
    if (!container) {
        console.error('❌ Top contributors container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Get data for the selected gameweek (not necessarily the actual current gameweek)
    const currentData = dataManager.getGameweekData(dashboardData.currentGameweek);
    console.log('🏆 DEBUG: currentData from dataManager for GW', dashboardData.currentGameweek, ':', currentData);
    console.log('🏆 DEBUG: dataManager exists:', !!dataManager);
    console.log('🏆 DEBUG: currentData.transferHistory:', currentData?.transferHistory);
    console.log('🏆 DEBUG: currentData.transferHistory.waivers:', currentData?.transferHistory?.waivers);
    console.log('🏆 DEBUG: currentData.transferHistory.freeAgents:', currentData?.transferHistory?.freeAgents);
    console.log('🏆 DEBUG: currentData.transferHistory.trades:', currentData?.transferHistory?.trades);
    
    if (!currentData) {
        console.error('❌ No current data available');
        container.classList.add('hidden');
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        return;
    }
    
    // Check for both local (players) and deployed (playerData) structures
    const playerData = currentData.playerData || currentData.players;
    console.log('🏆 DEBUG: currentData.playerData:', currentData.playerData);
    console.log('🏆 DEBUG: currentData.players:', currentData.players);
    console.log('🏆 DEBUG: Using playerData:', playerData);
    console.log('🏆 DEBUG: playerData length:', playerData?.length);
    
    // Check if this gameweek has its own player performance data (not carried over from previous gameweek)
    // For deployed version: check if the current gameweek has its own players_gwX data
    const currentGW = dashboardData.currentGameweek;
    
    // Check if any player has performance data specifically for the current gameweek
    // This prevents showing GW1 data when viewing GW2
    let hasOwnPlayerData = false;
    
    if (currentData.playerData && currentData.playerData.length > 0) {
        // Check deployed JSON structure (nested gameweeks)
        hasOwnPlayerData = currentData.playerData.some(player => {
            return player.gameweeks && player.gameweeks[currentGW] && 
                   player.gameweeks[currentGW].points !== undefined;
        });
    } else if (currentData.players && currentData.players.length > 0) {
        // Check local CSV structure (direct roundPoints)
        hasOwnPlayerData = currentData.players.some(player => {
            return player.roundPoints !== undefined;
        });
    }
    
    console.log('🏆 DEBUG: Has own player data for GW', currentGW, ':', hasOwnPlayerData);
    console.log('🏆 DEBUG: Player data structure sample:', currentData.playerData?.[0] || currentData.players?.[0]);
    
    if (!playerData || playerData.length === 0 || !hasOwnPlayerData) {
        console.log('🏆 DEBUG: No player data available OR no own player data for this gameweek');
        container.classList.add('hidden');
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        return;
    }
    
            // Get the manager's current squad using team name (since draft data uses team names)
        const currentSquad = calculateCurrentTeam(team.teamName, null, team.manager);
    console.log('🏆 DEBUG: currentSquad for', team.teamName, ':', currentSquad);
    console.log('🏆 DEBUG: currentSquad length:', currentSquad?.length);
    
    if (!currentSquad || currentSquad.length === 0) {
        console.error('❌ No current squad available for', team.teamName);
        container.classList.add('hidden');
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        return;
    }
    
    // Match current squad players to performance data
    const managerPlayers = [];
    console.log('🏆 DEBUG: Starting player matching process...');
    
    currentSquad.forEach((currentPlayerName, index) => {
        console.log(`🏆 DEBUG: Processing player ${index + 1}/${currentSquad.length}: "${currentPlayerName}"`);
        
        const matchedPlayer = playerData.find(player => {
            if (player.name === currentPlayerName) {
                console.log(`🏆 DEBUG: Exact match found for "${currentPlayerName}"`);
                return true;
            }
            
            const playerNameLower = player.name.toLowerCase();
            const currentNameLower = currentPlayerName.toLowerCase();
            
            // Much stricter matching logic to avoid false positives
            let partialMatch = false;
            
            // 1. Only allow direct inclusion if the shorter name is at least 80% of the longer name
            const directInclusion = (playerNameLower.includes(currentNameLower) || currentNameLower.includes(playerNameLower));
            if (directInclusion) {
                const shorterLength = Math.min(playerNameLower.length, currentNameLower.length);
                const longerLength = Math.max(playerNameLower.length, currentNameLower.length);
                partialMatch = (shorterLength / longerLength) >= 0.8;
            }
            
            // 2. If no direct match, try word-based matching with strict rules
            if (!partialMatch) {
                // For hyphenated names, both names must contain the hyphen or be very similar
                if (currentNameLower.includes('-')) {
                    // Only match if the player name also contains the hyphen or is very close
                    partialMatch = playerNameLower.includes('-') && 
                                 (playerNameLower.includes(currentNameLower.replace('-', '')) || 
                                  currentNameLower.includes(playerNameLower.replace('-', '')));
                } else {
                    // For non-hyphenated names, require very substantial overlap
                    partialMatch = playerNameLower.split(' ').some(part => 
                        currentNameLower === part && part.length > 4
                    );
                }
            }
            
            if (partialMatch) {
                console.log(`🏆 DEBUG: Partial match found: "${currentPlayerName}" → "${player.name}"`);
            }
            
            return partialMatch;
        });
        
        if (matchedPlayer) {
            console.log(`🏆 DEBUG: Adding matched player:`, matchedPlayer);
            
            // Extract round points from both local and deployed data structures
            let roundPoints = 0;
            if (matchedPlayer.roundPoints !== undefined) {
                // Local CSV version: roundPoints is directly available
                roundPoints = matchedPlayer.roundPoints;
                console.log(`🏆 DEBUG: Found round points (local) for ${currentPlayerName}:`, roundPoints);
            } else if (matchedPlayer.gameweeks && matchedPlayer.gameweeks[currentGW]) {
                // Deployed JSON version: round points in nested structure
                roundPoints = matchedPlayer.gameweeks[currentGW].roundPts || 0;
                console.log(`🏆 DEBUG: Found round points (deployed) for ${currentPlayerName} in GW${currentGW}:`, roundPoints);
            } else if (matchedPlayer.gameweeks && matchedPlayer.gameweeks[currentGW.toString()]) {
                // Deployed JSON version: round points in nested structure (string key)
                roundPoints = matchedPlayer.gameweeks[currentGW.toString()].roundPts || 0;
                console.log(`🏆 DEBUG: Found round points (deployed string key) for ${currentPlayerName} in GW${currentGW}:`, roundPoints);
            } else {
                console.warn(`⚠️ No round points found for ${currentPlayerName}`);
            }
            
            managerPlayers.push({ 
                ...matchedPlayer, 
                currentSquadName: currentPlayerName,
                roundPoints: roundPoints  // Add the extracted round points
            });
        } else {
            console.warn(`⚠️ No match found for "${currentPlayerName}"`);
        }
    });
    
    console.log('🏆 DEBUG: Total matched players:', managerPlayers.length);
    console.log('🏆 DEBUG: Matched players:', managerPlayers);
    
    // Sort by round points (current gameweek performance) and take top 3
    console.log('🏆 DEBUG: Sorting players by round points...');
    console.log('🏆 DEBUG: Manager players before sorting:', managerPlayers.map(p => ({ name: p.currentSquadName, roundPoints: p.roundPoints })));
    
    const topContributors = managerPlayers
        .sort((a, b) => (b.roundPoints || 0) - (a.roundPoints || 0))
        .slice(0, 3);
    
    console.log('🏆 DEBUG: Top 3 contributors after sorting:', topContributors.map(p => ({ name: p.currentSquadName, roundPoints: p.roundPoints })));
    
    if (topContributors.length === 0) {
        console.error('❌ No top contributors found after sorting');
        container.classList.add('hidden');
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    if (emptyMessage) emptyMessage.classList.add('hidden');
    
    // Update the gameweek display in the title
    const gwDisplay = document.getElementById('top-contributors-gw');
    if (gwDisplay) {
        gwDisplay.textContent = `GW ${dashboardData.currentGameweek}`;
    }
    
    // Display top 3 contributors
    topContributors.forEach((player, index) => {
        const playerElement = document.createElement('div');
        const rankClass = index === 0 ? 'from-yellow-400 to-yellow-600' : 
                         index === 1 ? 'from-gray-300 to-gray-500' : 
                         'from-amber-600 to-amber-800';
        const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        
        playerElement.className = 'card bg-gradient-to-r ' + rankClass + ' border border-white/20 text-center p-4 shadow-2xl backdrop-blur-sm hover:shadow-lg transition-all duration-300';
        
        playerElement.innerHTML = `
            <div class="text-2xl mb-2">${rankIcon}</div>
            <div class="text-sm font-bold text-white mb-1">${player.currentSquadName}</div>
            <div class="text-xs text-white/80 mb-2">${player.team} • ${player.position}</div>
            <div class="text-lg font-bold text-white">${player.roundPoints || 0} pts</div>
            <div class="text-xs text-white/70">GW ${dashboardData.currentGameweek}</div>
        `;
        
        container.appendChild(playerElement);
    });
}

// Display team current squad (draft picks + transfers)
function displayTeamCurrentSquad(team) {
    const container = document.getElementById('team-current-squad');
    const emptyMessage = document.getElementById('team-current-squad-empty');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate current squad using team name (since draft data uses team names)
    const currentSquad = calculateCurrentTeam(team.teamName, null, team.manager);
    
    if (!currentSquad || currentSquad.length === 0) {
        container.classList.add('hidden');
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    if (emptyMessage) emptyMessage.classList.add('hidden');
    
    currentSquad.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'card bg-gray-900/90 border border-green-500/50 text-center p-3 shadow-2xl backdrop-blur-sm hover:shadow-green-500/20 transition-all duration-300';
        
        playerElement.innerHTML = `
            <div class="text-sm font-medium text-white">${player}</div>
            <div class="text-xs text-green-400 mt-1">
                <i class="fas fa-check-circle mr-1"></i>Active
            </div>
        `;
        
        container.appendChild(playerElement);
    });
}

// Display team draft picks
function displayTeamDraftPicks(team) {
    const container = document.getElementById('team-draft-picks');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Add manager name header
    const managerHeader = document.createElement('div');
    managerHeader.className = 'col-span-full text-center py-2 mb-3';
    managerHeader.innerHTML = `
        <div class="text-sm font-medium text-white mb-2">
            <i class="fas fa-user mr-2"></i>${getManagerFromTeamName(team.teamName)}
        </div>
    `;
    container.appendChild(managerHeader);
    
    if (team.draftPicks && team.draftPicks.length > 0) {
        team.draftPicks.forEach((pick, index) => {
            const pickElement = document.createElement('div');
            pickElement.className = 'card bg-gray-900/90 border border-gray-700/50 text-center p-3 shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300';
            
            pickElement.innerHTML = `
                <div class="text-xs text-white mb-1">Round ${index + 1}</div>
                <div class="font-semibold text-white text-sm">${pick}</div>
            `;
            
            container.appendChild(pickElement);
        });
    } else {
        container.innerHTML = `
            <div class="col-span-full text-center py-4 text-white">
                <i class="fas fa-info-circle text-2xl mb-2"></i>
                <p>No draft picks loaded</p>
            </div>
        `;
    }
}




// Hide team details
function hideTeamDetails() {
    const teamDetailsContainer = document.getElementById('team-details-container');
    const teamSelectionPrompt = document.getElementById('team-selection-prompt');
    
    if (teamDetailsContainer && teamSelectionPrompt) {
        teamDetailsContainer.classList.add('hidden');
        teamSelectionPrompt.classList.remove('hidden');
    }
}

// Populate team selector
function populateTeamSelector() {
    const selector = document.getElementById('team-selector');
    if (!selector) return;
    
    // Clear existing options
    selector.innerHTML = '<option value="">Select a team...</option>';
    
    if (dashboardData.leaderboard.length > 0) {
        dashboardData.leaderboard.forEach(team => {
            const option = document.createElement('option');
            option.value = team.teamName;
            // Only show manager name if it exists and isn't empty
            const managerDisplay = team.manager && team.manager.trim() ? ` (${team.manager})` : '';
            option.textContent = `${team.position}. ${team.teamName}${managerDisplay}`;
            selector.appendChild(option);
        });
        
        // Add event listener for team selection
        selector.addEventListener('change', handleTeamSelection);
    }
}

// Set current gameweek programmatically
function setCurrentGameweek(gameweek) {
    if (gameweek < 1 || gameweek > 38) {
        console.warn('Invalid gameweek:', gameweek);
        return;
    }
    
    dashboardData.currentGameweek = gameweek;
    
    // Update the selector
    const selector = document.getElementById('gameweekSelector');
    if (selector) {
        selector.value = gameweek;
    }
    
    // Update the display
    updateCurrentGameweek();
    
    // Update top contributors gameweek display
    const gwDisplay = document.getElementById('top-contributors-gw');
    if (gwDisplay) {
        gwDisplay.textContent = `GW ${gameweek}`;
    }
    
    // Update gameweek-specific data
    updateGameweekSpecificData(gameweek);
}

// Handle gameweek change
function handleGameweekChange(event) {
    const selectedGameweek = parseInt(event.target.value);
    
    // Update the dashboard data
    setCurrentGameweek(selectedGameweek);
    
    // Load data for the selected gameweek
    loadDataForGameweek(selectedGameweek);
    
    // Update prize pool calculations for new gameweek
    populatePrizePool();
    
    // Update player movement for new gameweek
    populatePlayerMovement();
    
    // Update top contributors gameweek display
    const gwDisplay = document.getElementById('top-contributors-gw');
    if (gwDisplay) {
        gwDisplay.textContent = `GW ${selectedGameweek}`;
    }
    
    // Show success message
    showToast(`Switched to Gameweek ${selectedGameweek}`, 'success');
    
    // Add visual feedback
    const currentGameweekElement = document.getElementById('currentGameweek');
    if (currentGameweekElement) {
        currentGameweekElement.classList.add('animate-pulse');
        setTimeout(() => {
            currentGameweekElement.classList.remove('animate-pulse');
        }, 1000);
    }
}

// Load data for a specific gameweek
async function loadDataForGameweek(gameweek) {
    if (!dataManager) return;
    
    const gameweekData = dataManager.getGameweekData(gameweek);
    if (gameweekData) {
        // Update dashboard data
        dashboardData.leaderboard = gameweekData.draft?.teams || [];
        dashboardData.draft = gameweekData.draft || null; // Fix: Add draft data to global state
        dashboardData.transferHistory = gameweekData.transferHistory || { waivers: [], freeAgents: [], trades: [] }; // Fix: Add transfer history
        dashboardData.upcomingFixtures = gameweekData.fixtures || [];
        dashboardData.recentStandings = gameweekData.standings || [];
        
        // Repopulate dashboard
        populateDashboard();
        
        console.log(`📊 Loaded data for Gameweek ${gameweek}`);
    } else {
        console.warn(`No data found for Gameweek ${gameweek}`);
    }
}

// Update gameweek-specific data
function updateGameweekSpecificData(gameweek) {
    // Update fixtures section header
    const fixturesHeader = document.querySelector('.fixtures-section .gameweek-indicator');
    if (fixturesHeader) {
        fixturesHeader.textContent = `GW ${gameweek}`;
    }
    
    // Update results section header
    const resultsHeader = document.querySelector('.results-section .gameweek-indicator');
    if (resultsHeader) {
        resultsHeader.textContent = `GW ${gameweek - 1}`;
    }
    
    // Update top contributors gameweek display
    const gwDisplay = document.getElementById('top-contributors-gw');
    if (gwDisplay) {
        gwDisplay.textContent = `GW ${gameweek}`;
    }

    // Update Weekly Summary badge and content
    const summaryBadge = document.getElementById('summary-gameweek-badge');
    if (summaryBadge) summaryBadge.textContent = `GW${gameweek}`;
    loadWeeklySummary(gameweek);

    // Recompute Weekly Winner for selected gameweek
    computeAndDisplayWeeklyWinner(gameweek);
}

// Populate gameweek selector with current season gameweeks
function populateGameweekSelector() {
    const selector = document.getElementById('gameweekSelector');
    if (!selector) return;
    
    // Clear existing options
    selector.innerHTML = '';
    
    if (dataManager && dataManager.isDataLoaded()) {
        // Add available gameweeks from data manager
        const availableGameweeks = dataManager.getAvailableGameweekNumbers();
        
        if (availableGameweeks.length === 0) {
            // No gameweeks found
            const option = document.createElement('option');
            option.value = 0;
            option.textContent = 'No gameweeks available';
            option.disabled = true;
            selector.appendChild(option);
        } else if (availableGameweeks.length === 1 && availableGameweeks[0] === 1) {
            // Only GW1 - first gameweek
            const option = document.createElement('option');
            option.value = 1;
            option.textContent = 'GW1 (First gameweek)';
            option.selected = true;
            selector.appendChild(option);
        } else {
            // Multiple gameweeks available
            availableGameweeks.forEach(gameweek => {
                const option = document.createElement('option');
                option.value = gameweek;
                option.textContent = `GW ${gameweek}`;
                
                // Mark current gameweek as selected
                if (gameweek === dashboardData.currentGameweek) {
                    option.selected = true;
                }
                
                selector.appendChild(option);
            });
        }
    } else {
        // Fallback: add basic options
        const option = document.createElement('option');
        option.value = 0;
        option.textContent = 'Loading...';
        option.disabled = true;
        selector.appendChild(option);
    }
}

// Jump to current gameweek (you can set this to whatever gameweek you're currently in)
function jumpToCurrentGameweek() {
    if (!dataManager) {
        showToast('Data manager not ready', 'error');
        return;
    }
    
    // Get the detected current gameweek from the data manager
    const currentGW = dataManager.getCurrentGameweek();
    setCurrentGameweek(currentGW);
    
    if (currentGW === 1) {
        showToast('Jumped to GW1 (First gameweek)', 'success');
    } else {
        showToast(`Jumped to current Gameweek ${currentGW}`, 'success');
    }
}

// Load Weekly Summary from ai_summary_gw#.md (if present)
async function loadWeeklySummary(gameweek) {
    try {
        const basePath = window.location.pathname.includes('/fpl_draft_2526/') ? '/fpl_draft_2526' : '';
        const gwKey = `gw${gameweek}`;
        const url = `${basePath}/${gwKey}/ai_summary_${gwKey}.md`;
        const resp = await fetch(url);
        const container = document.getElementById('weekly-summary-content');
        const badge = document.getElementById('summary-gameweek-badge');
        if (badge) badge.textContent = `GW${gameweek}`;

        if (!resp.ok) {
            if (container) {
                container.innerHTML = `
                    <div class="bg-gray-800/50 border border-gray-600/50 rounded-lg p-6 text-center">
                        <div class="text-gray-400 mb-2"><i class="fas fa-info-circle"></i></div>
                        <p class="text-gray-300">No summary uploaded for GW${gameweek} yet.</p>
                    </div>`;
            }
            return;
        }

        const markdownText = await resp.text();
        if (container) {
            // Parse and render Markdown to HTML
            const htmlContent = parseMarkdown(markdownText);
            container.innerHTML = htmlContent || '<p class="text-gray-300 text-sm">(Empty summary)</p>';
        }
        
        // Update the "last updated" text
        const lastUpdatedElement = document.getElementById('summary-last-updated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Summary loaded for GW${gameweek}`;
        }
    } catch (err) {
        console.warn('Failed to load weekly summary:', err);
    }
}

// Simple Markdown parser for weekly summaries
function parseMarkdown(markdown) {
    let html = markdown
        // Escape HTML
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-4 mb-3">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-4 mb-3">$1</h1>')
        
        // Bold and Italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-yellow-300"><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-yellow-300">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-gray-200">$1</em>')
        
        // Lists
        .replace(/^\* (.*$)/gm, '<li class="text-gray-100 text-sm ml-4">• $1</li>')
        .replace(/^\- (.*$)/gm, '<li class="text-gray-100 text-sm ml-4">• $1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li class="text-gray-100 text-sm ml-4">$1. $2</li>')
        
        // Code blocks
        .replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-green-400 px-1 rounded text-xs">$1</code>')
        
        // Line breaks and paragraphs
        .replace(/\n\n/g, '</p><p class="text-gray-100 leading-relaxed text-sm mb-2">')
        .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph tags
    html = '<p class="text-gray-100 leading-relaxed text-sm mb-2">' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p[^>]*><\/p>/g, '');
    
    return html;
}

// Compute Weekly Winner for a given gameweek using results (final preferred)
function computeAndDisplayWeeklyWinner(gameweek) {
    if (!dataManager) return;
    // Only calculate weekly winner if final results exist
    const finalResults = dataManager.getFinalResults(gameweek);
    if (!finalResults || finalResults.length === 0) {
        dashboardData.weeklyWinner = 'TBD';
        updateOverviewStats();
        return;
    }

    // Build a map of team -> { manager, gwPoints }
    const teamPoints = [];
    finalResults.forEach(r => {
        // Home
        teamPoints.push({ teamName: r.homeTeam, manager: r.homeManager || getManagerFromTeamName(r.homeTeam), gwPoints: parseInt(r.homeScore) || 0 });
        // Away
        teamPoints.push({ teamName: r.awayTeam, manager: r.awayManager || getManagerFromTeamName(r.awayTeam), gwPoints: parseInt(r.awayScore) || 0 });
    });

    // Pick highest GW points
    const winner = teamPoints.reduce((max, cur) => (cur.gwPoints > (max?.gwPoints || -Infinity) ? cur : max), null);
    if (winner && winner.gwPoints > 0) {
        dashboardData.weeklyWinner = `${winner.manager || winner.teamName} (${winner.gwPoints} pts)`;
        
        // Calculate winnings for this gameweek
        calculateWeeklyWinnings(gameweek, winner.manager || winner.teamName, winner.gwPoints);
    } else {
        dashboardData.weeklyWinner = 'TBD';
    }
    updateOverviewStats();
}

// Calculate weekly winnings and update manager totals
function calculateWeeklyWinnings(gameweek, winnerManager, gwPoints) {
    if (!dataManager) return;
    
    // Get all managers from the league
    const allManagers = new Set();
    const finalResults = dataManager.getFinalResults(gameweek);
    let gameweekDate = '';
    
    finalResults.forEach(r => {
        if (r.homeManager) allManagers.add(r.homeManager);
        if (r.awayManager) allManagers.add(r.awayManager);
        // Get the gameweek date from the first result
        if (!gameweekDate && r.gameweekDate) {
            gameweekDate = r.gameweekDate;
        }
    });
    
    // If no manager names in results, fall back to team names
    if (allManagers.size === 0) {
        finalResults.forEach(r => {
            allManagers.add(r.homeTeam);
            allManagers.add(r.awayTeam);
        });
    }
    
    const totalManagers = allManagers.size;
    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
    
    // Update dashboard data with winnings
    if (!dashboardData.weeklyWinnings) {
        dashboardData.weeklyWinnings = [];
    }
    
    // Check if this gameweek already has winnings calculated
    const existingWeek = dashboardData.weeklyWinnings.find(w => w.gameweek === gameweek);
    if (!existingWeek) {
        dashboardData.weeklyWinnings.push({
            gameweek: gameweek,
            winner: winnerManager,
            amount: weeklyWinnings,
            gwPoints: gwPoints || 0,
            date: gameweekDate || new Date().toISOString()
        });
        
        // Update manager totals
        updateManagerWinnings(winnerManager, weeklyWinnings);
        
        // Track for outstanding payments
        trackWeeklyWinnerWithDate(gameweek, winnerManager, gwPoints || 0, gameweekDate || `Gameweek ${gameweek}`);
        
        console.log(`💰 GW${gameweek} winnings: ${winnerManager} won $${weeklyWinnings}`);
    }
}

// Update manager's total winnings
function updateManagerWinnings(managerName, amount) {
    if (!dashboardData.managerWinnings) {
        dashboardData.managerWinnings = {};
    }
    
    if (!dashboardData.managerWinnings[managerName]) {
        dashboardData.managerWinnings[managerName] = 0;
    }
    
    dashboardData.managerWinnings[managerName] += amount;
    console.log(`💰 ${managerName} total winnings: $${dashboardData.managerWinnings[managerName]}`);
}

// Get manager's total winnings
function getManagerWinnings(managerName) {
    if (!dashboardData.managerWinnings || !managerName) return 0;
    return dashboardData.managerWinnings[managerName] || 0;
}

// Export data function
function exportData() {
    const dataStr = JSON.stringify(dashboardData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fpl_dashboard_data.json';
    link.click();
    
    URL.revokeObjectURL(url);
    
    // Show success toast
    showToast('Data exported successfully!', 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} fixed top-4 right-4 z-50 max-w-sm`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add smooth animations
function addSmoothAnimations() {
    // Animate stats cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all stat cards and cards (but exclude both fixtures sections)
    document.querySelectorAll('.stat, .card:not(.fixtures-section):not(.current-fixtures-section)').forEach(card => {
        card.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-700');
        observer.observe(card);
    });
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        .animate-fade-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate-fade-in {
            animation: fadeInUp 0.7s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

// Add loading states and interactions
function addLoadingStates() {
    // Add loading spinner to export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Exporting...';
            this.disabled = true;
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            }, 2000);
        });
    }
}

// Add keyboard shortcuts for gameweek navigation
function addGameweekKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Only work when not typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (!dataManager || !dataManager.isDataLoaded()) {
            return; // Don't handle shortcuts if data manager isn't ready
        }
        
        const currentGW = dashboardData.currentGameweek;
        const availableGameweeks = dataManager.getAvailableGameweekNumbers();
        
        if (availableGameweeks.length === 0) {
            return; // No gameweeks available
        }
        
        switch(event.key) {
            case 'ArrowLeft':
                // Previous gameweek
                const prevGW = availableGameweeks.filter(gw => gw < currentGW).pop();
                if (prevGW !== undefined) {
                    event.preventDefault();
                    setCurrentGameweek(prevGW);
                    showToast(`Previous Gameweek: ${prevGW}`, 'info');
                }
                break;
            case 'ArrowRight':
                // Next gameweek
                const nextGW = availableGameweeks.find(gw => gw > currentGW);
                if (nextGW !== undefined) {
                    event.preventDefault();
                    setCurrentGameweek(nextGW);
                    showToast(`Next Gameweek: ${nextGW}`, 'info');
                }
                break;
            case 'Home':
                // Jump to first available gameweek
                event.preventDefault();
                const firstGW = availableGameweeks[0];
                setCurrentGameweek(firstGW);
                showToast(`Jumped to ${firstGW === 0 ? 'Pre-season' : `Gameweek ${firstGW}`}`, 'info');
                break;
            case 'End':
                // Jump to last available gameweek
                event.preventDefault();
                const lastGW = availableGameweeks[availableGameweeks.length - 1];
                setCurrentGameweek(lastGW);
                showToast(`Jumped to ${lastGW === 0 ? 'Pre-season' : `Gameweek ${lastGW}`}`, 'info');
                break;
        }
    });
}

// ===== ANALYTICS FUNCTIONS =====

// Main analytics population function
function populateAnalytics() {
    console.log('🔍 Populating analytics...');
    
    if (!dashboardData.leaderboard || dashboardData.leaderboard.length === 0) {
        // Show placeholder for all analytics sections
        const sections = ['h2h-analysis', 'consistency-analysis', 'winners-analysis', 'marquee-matches-analysis', 'transfer-activity-analysis', 'player-popularity-analysis', 'manager-behavior-analysis', 'key-insights'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.innerHTML = '<p class="text-white">Waiting for league data...</p>';
            }
        });
        return;
    }
    
    // Populate each analytics section
    analyzeHeadToHead();
    analyzeConsistency();
    analyzeWeeklyWinners();
    analyzeMarqueeMatches();
    analyzeTransferActivity(); // New: Transfer activity analysis
    analyzePlayerPopularity(); // New: Most transferred players
    analyzeManagerBehavior(); // New: Manager transfer patterns
    generateKeyInsights();
    analyzePlayerPerformance(); // New: Player performance analytics
}

// Head-to-Head Analysis
function analyzeHeadToHead() {
    const container = document.getElementById('h2h-analysis');
    if (!container) return;
    
    if (!dataManager) {
        container.innerHTML = '<p class="text-white">Data manager not available</p>';
        return;
    }
    
    const partialResults = dataManager.getAllPartialResults();
    const teams = dashboardData.leaderboard || [];
    
    if (teams.length === 0 || partialResults.length === 0) {
        container.innerHTML = '<p class="text-white">No match data available</p>';
        return;
    }
    
    // Calculate team performance from partial results
    const teamPerformance = teams.map(team => {
        const performance = calculateTeamPerformanceFromResults(team.teamName);
        
        // Get GW points from partial results
        let gwPoints = 0;
        partialResults.forEach(result => {
            if (result.homeTeam === team.teamName) {
                gwPoints = result.homeScore;
            } else if (result.awayTeam === team.teamName) {
                gwPoints = result.awayScore;
            }
        });
        
        return {
            ...team,
            ...performance,
            gwPoints: gwPoints
        };
    });
    
    // Sort by points (highest first), then by GW points (FPL points) as tiebreaker, then by goal difference, then by goals for
    teamPerformance.sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        // If points are equal, sort by GW points (FPL points) as tiebreaker
        if (b.gwPoints !== a.gwPoints) {
            return b.gwPoints - a.gwPoints;
        }
        // If GW points are equal, sort by goal difference
        const aGoalDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
        const bGoalDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
        if (bGoalDiff !== aGoalDiff) {
            return bGoalDiff - aGoalDiff;
        }
        // If goal difference is equal, sort by goals for
        return (b.goalsFor || 0) - (a.goalsFor || 0);
    });
    
    const topTeam = teamPerformance[0];
    const bottomTeam = teamPerformance[teamPerformance.length - 1];
    
    // Find biggest upset (team with lower points beating team with higher points)
    let biggestUpset = null;
    let upsetMargin = 0;
    
    partialResults.forEach(result => {
        const homeTeam = teamPerformance.find(t => t.teamName === result.homeTeam);
        const awayTeam = teamPerformance.find(t => t.teamName === result.awayTeam);
        
        if (homeTeam && awayTeam) {
            if (homeTeam.points < awayTeam.points && result.homeScore > result.awayScore) {
                const margin = awayTeam.points - homeTeam.points;
                if (margin > upsetMargin) {
                    upsetMargin = margin;
                    biggestUpset = { winner: homeTeam, loser: awayTeam, score: `${result.homeScore}-${result.awayScore}` };
                }
            } else if (awayTeam.points < homeTeam.points && result.awayScore > result.homeScore) {
                const margin = homeTeam.points - awayTeam.points;
                if (margin > upsetMargin) {
                    upsetMargin = margin;
                    biggestUpset = { winner: awayTeam, loser: homeTeam, score: `${result.awayScore}-${result.homeScore}` };
                }
            }
        }
    });
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                    <div class="font-semibold text-green-800">👑 League Leader</div>
                    <div class="text-sm text-green-800">${getManagerFromTeamName(topTeam.teamName)} (${topTeam.teamName})</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-green-800">${topTeam.points} pts</div>
                    <div class="text-xs text-green-800">${topTeam.wins}W ${topTeam.draws}D ${topTeam.losses}L</div>
                </div>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                    <div class="font-semibold text-red-800">📉 Last Place</div>
                    <div class="text-sm text-red-800">${getManagerFromTeamName(bottomTeam.teamName)} (${bottomTeam.teamName})</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-red-800">${bottomTeam.points} pts</div>
                    <div class="text-xs text-red-800">${bottomTeam.wins}W ${bottomTeam.draws}D ${bottomTeam.losses}L</div>
                </div>
            </div>
            
            ${biggestUpset ? `
            <div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                    <div class="font-semibold text-yellow-800">🎯 Biggest Upset</div>
                    <div class="text-sm text-yellow-800">${biggestUpset.winner.teamName} beats ${biggestUpset.loser.teamName}</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-yellow-800">${biggestUpset.score}</div>
                    <div class="text-xs text-yellow-800">${upsetMargin} pt gap</div>
                </div>
            </div>
            ` : ''}
            
            <div class="text-xs text-white mt-2">
                ${teams.length} managers • ${partialResults.length} matches played • Point gap: ${topTeam.points - bottomTeam.points} points
            </div>
        </div>
    `;
}

// Draft Analysis
function analyzeDraftInsights() {
    const container = document.getElementById('draft-analysis');
    if (!container) return;
    
    const draftData = dashboardData.draft || [];
    console.log('🎯 Draft data type:', typeof draftData, 'Is array:', Array.isArray(draftData), 'Data:', draftData);
    
    // Ensure draftData is actually an array
    if (!Array.isArray(draftData) || draftData.length === 0) {
        container.innerHTML = '<p class="text-white">No draft data available</p>';
        return;
    }
    
    // Analyze player popularity across all draft picks
    const playerCounts = {};
    const totalManagers = draftData.length;
    
    draftData.forEach(team => {
        if (team.picks && Array.isArray(team.picks)) {
            team.picks.forEach(player => {
                if (player && player.trim()) {
                    playerCounts[player] = (playerCounts[player] || 0) + 1;
                }
            });
        }
    });
    
    // Sort players by popularity
    const sortedPlayers = Object.entries(playerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    // Find hidden gems (only drafted by 1-2 teams)
    const hiddenGems = Object.entries(playerCounts)
        .filter(([player, count]) => count <= 2)
        .slice(0, 3);
    
    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-white mb-2">🔥 Most Popular Picks</h4>
                <div class="space-y-1">
                    ${sortedPlayers.map(([player, count], index) => `
                        <div class="flex items-center justify-between">
                            <span class="text-sm">${index + 1}. ${player}</span>
                            <span class="badge badge-primary badge-sm">${count}/${totalManagers}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${hiddenGems.length > 0 ? `
                <div>
                    <h4 class="font-semibold text-white mb-2">💎 Hidden Gems</h4>
                    <div class="space-y-1">
                        ${hiddenGems.map(([player, count]) => `
                            <div class="flex items-center justify-between">
                                <span class="text-sm">${player}</span>
                                <span class="badge badge-accent badge-sm">${count} team${count > 1 ? 's' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="text-xs text-white">
                📊 ${Object.keys(playerCounts).length} unique players drafted
            </div>
        </div>
    `;
}

// Consistency Analysis
function analyzeConsistency() {
    const container = document.getElementById('consistency-analysis');
    if (!container) return;
    
    if (!dataManager) {
        container.innerHTML = '<p class="text-white">Data manager not available</p>';
        return;
    }
    
    const partialResults = dataManager.getAllPartialResults();
    const teams = dashboardData.leaderboard || [];
    
    if (!Array.isArray(teams) || teams.length === 0 || partialResults.length === 0) {
        container.innerHTML = '<p class="text-white">No match data available</p>';
        return;
    }
    
    // Calculate team performance from partial results
    const consistencyRankings = teams.map(team => {
        const performance = calculateTeamPerformanceFromResults(team.teamName);
        
        // Get GW points from partial results
        let gwPoints = 0;
        partialResults.forEach(result => {
            if (result.homeTeam === team.teamName) {
                gwPoints = result.homeScore;
            } else if (result.awayTeam === team.teamName) {
                gwPoints = result.awayScore;
            }
        });
        
        // Calculate consistency based on performance
        let consistencyScore = 0;
        let performanceNote = '';
        
        if (performance.wins > 0 && performance.losses === 0) {
            consistencyScore = 5; // All wins = most consistent
            performanceNote = 'Perfect record';
        } else if (performance.wins > 0 && performance.draws > 0 && performance.losses === 0) {
            consistencyScore = 4; // Wins + draws only
            performanceNote = 'Unbeaten';
        } else if (performance.wins > 0 && performance.losses > 0) {
            consistencyScore = 2; // Mixed results
            performanceNote = 'Mixed form';
        } else if (performance.losses > 0 && performance.wins === 0) {
            consistencyScore = 1; // All losses
            performanceNote = 'Struggling';
        } else {
            consistencyScore = 3; // Default
            performanceNote = 'Balanced';
        }
        
        return {
            manager: getManagerFromTeamName(team.teamName), // Use function to get manager name
            teamName: team.teamName,
            wins: performance.wins,
            draws: performance.draws,
            losses: performance.losses,
            consistencyScore: consistencyScore,
            performanceNote: performanceNote,
            form: `${performance.wins > 0 ? 'W'.repeat(performance.wins) : ''}${performance.draws > 0 ? 'D'.repeat(performance.draws) : ''}${performance.losses > 0 ? 'L'.repeat(performance.losses) : ''}`.split('').join('-') || 'N/A',
            points: performance.points,
            gwPoints: gwPoints
        };
    }).sort((a, b) => {
        // Sort by consistency score first, then by GW points (FPL points) as tiebreaker
        if (b.consistencyScore !== a.consistencyScore) {
            return b.consistencyScore - a.consistencyScore;
        }
        // If consistency score is equal, sort by GW points (FPL points) as tiebreaker
        if (b.gwPoints !== a.gwPoints) {
            return b.gwPoints - a.gwPoints;
        }
        // If GW points are equal, sort by points
        return b.points - a.points;
    });
    
    const mostConsistent = consistencyRankings.slice(0, 3);
    const leastConsistent = consistencyRankings.slice(-2);
    
    container.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-white mb-2">📈 Most Consistent</h4>
                <div class="space-y-2">
                    ${mostConsistent.map((team, index) => `
                        <div class="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                            <div>
                                <div class="font-medium text-green-800">${index + 1}. ${team.manager}</div>
                                <div class="text-xs text-green-600">${team.performanceNote} • ${team.wins}W ${team.draws}D ${team.losses}L</div>
                            </div>
                            <div class="text-green-800 font-bold">${team.points} pts</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-white mb-2">📉 Most Volatile</h4>
                <div class="space-y-2">
                    ${leastConsistent.map(team => `
                        <div class="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                            <div>
                                <div class="font-medium text-orange-800">${team.manager}</div>
                                <div class="text-xs text-orange-600">Form: ${team.form}</div>
                            </div>
                            <div class="text-orange-800 font-bold">${team.points} pts</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Weekly Winners Analysis
function analyzeWeeklyWinners() {
    const container = document.getElementById('winners-analysis');
    if (!container) return;
    
    if (!dataManager) {
        container.innerHTML = '<p class="text-white">Data manager not available</p>';
        return;
    }
    
    const partialResults = dataManager.getAllPartialResults();
    
    if (partialResults.length === 0) {
        container.innerHTML = '<p class="text-white">No match results available</p>';
        return;
    }
    
    // Find the highest and lowest scoring teams this week
    // For lowest scorer, consider goal difference as tiebreaker when GW points are equal
    let highestScore = 0;
    let highestScoringTeam = null;
    let lowestScore = Infinity;
    let lowestScoringTeam = null;
    
    // Get all teams with their GW points and goal differences for proper ranking
    const teamScores = [];
    partialResults.forEach(result => {
        // Add home team
        const homePerformance = calculateTeamPerformanceFromResults(result.homeTeam);
        teamScores.push({
            name: result.homeTeam,
            score: result.homeScore,
            manager: result.homeManager,
            goalDifference: (homePerformance.goalsFor || 0) - (homePerformance.goalsAgainst || 0)
        });
        
        // Add away team
        const awayPerformance = calculateTeamPerformanceFromResults(result.awayTeam);
        teamScores.push({
            name: result.awayTeam,
            score: result.awayScore,
            manager: result.awayManager,
            goalDifference: (awayPerformance.goalsFor || 0) - (awayPerformance.goalsAgainst || 0)
        });
    });
    
    // Sort by score (highest first), then by goal difference (highest first) as tiebreaker
    teamScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // If scores are equal, sort by goal difference (highest first)
        return b.goalDifference - a.goalDifference;
    });
    
    // Get highest scorer (first in sorted array)
    highestScoringTeam = teamScores[0];
    highestScore = highestScoringTeam.score;
    
    // Get lowest scorer (last in sorted array)
    lowestScoringTeam = teamScores[teamScores.length - 1];
    lowestScore = lowestScoringTeam.score;
    
    // Calculate average score
    const totalScores = partialResults.reduce((sum, result) => sum + result.homeScore + result.awayScore, 0);
    const averageScore = Math.round(totalScores / (partialResults.length * 2));
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="font-semibold text-green-800">🏆 Highest Scorer</div>
                <div class="text-lg font-bold text-green-800">${highestScoringTeam?.name}</div>
                <div class="text-sm text-green-600">${highestScoringTeam?.manager} • ${highestScoringTeam?.score} pts</div>
            </div>
            
            <div class="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div class="font-semibold text-red-800">📉 Lowest Scorer</div>
                <div class="text-sm text-red-600">${lowestScoringTeam?.manager} • ${lowestScoringTeam?.score} pts</div>
                </div>
            
            <div class="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div class="font-semibold text-blue-800">📊 League Average</div>
                <div class="text-lg font-bold text-blue-800">${averageScore} pts</div>
                <div class="text-sm text-blue-600">${partialResults.length * 2} teams</div>
            </div>
            
            <div class="text-xs text-white text-center">
                Based on ${partialResults.length} matches played
            </div>
        </div>
    `;
}

// Schedule Strength Analysis
function analyzeMarqueeMatches() {
    const container = document.getElementById('marquee-matches-analysis');
    if (!container) return;
    
    const fixtures = dashboardData.upcomingFixtures || [];
    const teams = dashboardData.leaderboard || [];
    
    if (!Array.isArray(teams) || !Array.isArray(fixtures) || teams.length === 0 || fixtures.length === 0) {
        container.innerHTML = '<p class="text-white">No fixture data available</p>';
        return;
    }
    
    // Create team lookup using live partial results data (same logic as populateLeaderboard)
    const teamLookup = {};
    
    if (dataManager) {
        const partialResults = dataManager.getResults();
        
        if (partialResults.length > 0) {
            // Calculate live standings from results (final results take priority)
            const liveLeaderboard = teams.map(leaderboardTeam => {
                const performance = calculateTeamPerformanceFromResults(leaderboardTeam.teamName);
                
                // Get GW points from partial results
                let gwPoints = 0;
                partialResults.forEach(result => {
                    if (result.homeTeam === leaderboardTeam.teamName) {
                        gwPoints = result.homeScore;
                    } else if (result.awayTeam === leaderboardTeam.teamName) {
                        gwPoints = result.awayScore;
                    }
                });
                
                return {
                    ...leaderboardTeam,
                    points: performance.points,
                    gwPoints: gwPoints,
                    goalsFor: performance.goalsFor,
                    goalsAgainst: performance.goalsAgainst
                };
            });
            
            // Sort by points (highest first), then by GW points (FPL points) as tiebreaker, then by goal difference, then by goals for
            liveLeaderboard.sort((a, b) => {
                if (b.points !== a.points) {
                    return b.points - a.points;
                }
                // If points are equal, sort by GW points (FPL points) as tiebreaker
                if (b.gwPoints !== a.gwPoints) {
                    return b.gwPoints - a.gwPoints;
                }
                // If GW points are equal, sort by goal difference
                const aGoalDiff = (a.goalsFor || 0) - (a.goalsAgainst || 0);
                const bGoalDiff = (b.goalsFor || 0) - (b.goalsAgainst || 0);
                if (bGoalDiff !== aGoalDiff) {
                    return bGoalDiff - aGoalDiff;
                }
                // If goal difference is equal, sort by goals for
                return (b.goalsFor || 0) - (a.goalsFor || 0);
            });
            
            // Update positions after sorting
            liveLeaderboard.forEach((leaderboardTeam, index) => {
                leaderboardTeam.position = index + 1;
            });
            
            // Create team lookup from live data
            liveLeaderboard.forEach((team, index) => {
                teamLookup[team.teamName] = {
                    ...team,
                    position: team.position,
                    points: team.points,
                    gwPoints: team.gwPoints,
                    manager: getManagerFromTeamName(team.teamName), // Add manager name
                    form: `${team.wins > 0 ? 'W'.repeat(team.wins) : ''}${team.draws > 0 ? 'D'.repeat(team.draws) : ''}${team.losses > 0 ? 'L'.repeat(team.losses) : ''}`.split('').join('-') || 'N/A'
                };
            });
        } else {
            // Fallback to original data if no partial results
    teams.forEach((team, index) => {
        teamLookup[team.teamName] = {
            ...team,
            position: index + 1,
            points: parseInt(team.points) || 0,
            gwPoints: parseInt(team.gwPoints) || 0,
                manager: getManagerFromTeamName(team.teamName), // Add manager name
            form: team.form || 'N/A'
        };
    });
        }
    } else {
        // Fallback to original data if no data manager
        teams.forEach((team, index) => {
            teamLookup[team.teamName] = {
                ...team,
                position: index + 1,
                points: parseInt(team.points) || 0,
                gwPoints: parseInt(team.gwPoints) || 0,
                manager: getManagerFromTeamName(team.teamName), // Add manager name
                form: team.form || 'N/A'
            };
        });
    }
    
    // Analyze upcoming fixtures and score them for "marquee" potential
    const currentGW = dashboardData.currentGameweek || 1;
    const nextFixtures = fixtures.filter(f => f.gameweek >= currentGW && f.gameweek <= currentGW + 1);
    
    const marqueeFixtures = nextFixtures.map(fixture => {
        const homeTeam = teamLookup[fixture.homeTeam];
        const awayTeam = teamLookup[fixture.awayTeam];
        
        if (!homeTeam || !awayTeam) return null;
        
        let hypeScore = 0;
        let hypeReasons = [];
        
        // 1. Title race (top 3 vs top 3)
        if (homeTeam.position <= 3 && awayTeam.position <= 3) {
            hypeScore += 100;
            hypeReasons.push(`🏆 Title clash: ${homeTeam.position}${getPositionSuffix(homeTeam.position)} vs ${awayTeam.position}${getPositionSuffix(awayTeam.position)} place`);
        }
        // 2. Top vs bottom drama
        else if ((homeTeam.position <= 2 && awayTeam.position >= teams.length - 1) || 
                 (awayTeam.position <= 2 && homeTeam.position >= teams.length - 1)) {
            hypeScore += 80;
            hypeReasons.push('⚔️ David vs Goliath battle');
        }
        // 3. Close positions (within 3 spots)
        else if (Math.abs(homeTeam.position - awayTeam.position) <= 3) {
            hypeScore += 60;
            hypeReasons.push('🔥 Tight positional battle');
        }
        
        // 4. Points difference analysis
        const pointsDiff = Math.abs(homeTeam.points - awayTeam.points);
        if (pointsDiff < 10) {
            hypeScore += 70;
            hypeReasons.push(`📊 Only ${pointsDiff} points separate them`);
        } else if (pointsDiff < 25) {
            hypeScore += 40;
        }
        
        // 5. Form analysis (recent GW points)
        const homeForm = homeTeam.gwPoints;
        const awayForm = awayTeam.gwPoints;
        if (homeForm > 70 && awayForm > 70) {
            hypeScore += 90;
            hypeReasons.push('🚀 Both teams in red-hot form');
        } else if (homeForm > 80 || awayForm > 80) {
            hypeScore += 60;
            hypeReasons.push('⭐ One team hitting peak form');
        }
        
        // 6. Mid-table mayhem (positions 4-9)
        if (homeTeam.position >= 4 && homeTeam.position <= 9 && 
            awayTeam.position >= 4 && awayTeam.position <= 9) {
            hypeScore += 50;
            hypeReasons.push('🌊 Mid-table madness');
        }
        
        // 7. Relegation battle (bottom 3)
        if (homeTeam.position >= teams.length - 2 && awayTeam.position >= teams.length - 2) {
            hypeScore += 85;
            hypeReasons.push('🆘 Relegation six-pointer');
        }
        
        // 8. Manager rivalry (based on total winnings)
        const homeWinnings = parseInt(homeTeam.totalWinnings) || 0;
        const awayWinnings = parseInt(awayTeam.totalWinnings) || 0;
        if (homeWinnings > 20 && awayWinnings > 20) {
            hypeScore += 30;
            hypeReasons.push('💰 High earners clash');
        }
        
        // 9. Gameweek timing bonus
        if (fixture.gameweek === currentGW) {
            hypeScore += 30; // Current gameweek gets highest priority
        } else if (fixture.gameweek === currentGW + 1) {
            hypeScore += 20; // Next gameweek gets priority
        }
        
        return {
            ...fixture,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            hypeScore: hypeScore,
            hypeReasons: hypeReasons
        };
    }).filter(f => f !== null && f.hypeScore > 30) // Only show matches with decent hype
      .sort((a, b) => b.hypeScore - a.hypeScore) // Sort by hype level
      .slice(0, 5); // Top 5 marquee matches
    
    // Helper function for position suffixes
    function getPositionSuffix(pos) {
        if (pos === 1) return 'st';
        if (pos === 2) return 'nd';
        if (pos === 3) return 'rd';
        return 'th';
    }
    
    if (marqueeFixtures.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="text-white">
                    <i class="fas fa-calendar-check text-2xl mb-2 text-gray-400"></i>
                    <p>No marquee matches identified yet</p>
                    <p class="text-xs text-gray-400 mt-1">Check back as the season develops!</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-3">
            ${marqueeFixtures.map((fixture, index) => `
                <div class="p-3 bg-gradient-to-r ${index === 0 ? 'from-red-900/40 to-orange-900/40 border-red-500/50' : 
                                                    index === 1 ? 'from-orange-900/40 to-yellow-900/40 border-orange-500/50' :
                                                    'from-gray-800/80 to-gray-700/80 border-gray-600/50'} rounded-lg border shadow-lg">
                    
                    <!-- Match Header -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            ${index === 0 ? '<i class="fas fa-crown text-yellow-400"></i>' :
                              index === 1 ? '<i class="fas fa-fire text-orange-400"></i>' :
                              '<i class="fas fa-star text-purple-400"></i>'}
                            <span class="text-xs font-bold ${index === 0 ? 'text-yellow-400' : 
                                                               index === 1 ? 'text-orange-400' : 
                                                               'text-purple-400'}">
                                ${index === 0 ? 'BLOCKBUSTER' : 
                                  index === 1 ? 'MUST-WATCH' : 
                                  'HYPE MATCH'}
                            </span>
                        </div>
                        <span class="text-xs text-white bg-gray-600/50 px-2 py-1 rounded">GW${fixture.gameweek}</span>
                    </div>
                    
                    <!-- Teams -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-center flex-1">
                            <div class="font-bold text-white">${fixture.homeTeam.manager}</div>
                            <div class="text-xs text-gray-300">${fixture.homeTeam.teamName}</div>
                            <div class="text-xs ${fixture.homeTeam.position <= 3 ? 'text-green-400' : 
                                                   fixture.homeTeam.position >= teams.length - 2 ? 'text-red-400' : 
                                                   'text-gray-400'}">
                                ${fixture.homeTeam.position}${getPositionSuffix(fixture.homeTeam.position)} • ${fixture.homeTeam.points}pts
                            </div>
                        </div>
                        
                        <div class="mx-4">
                            <div class="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                VS
                            </div>
                        </div>
                        
                        <div class="text-center flex-1">
                            <div class="font-bold text-white">${fixture.awayTeam.manager}</div>
                            <div class="text-xs text-gray-300">${fixture.awayTeam.teamName}</div>
                            <div class="text-xs ${fixture.awayTeam.position <= 3 ? 'text-green-400' : 
                                                   fixture.awayTeam.position >= teams.length - 2 ? 'text-red-400' : 
                                                   'text-gray-400'}">
                                ${fixture.awayTeam.position}${getPositionSuffix(fixture.awayTeam.position)} • ${fixture.awayTeam.points}pts
                            </div>
                        </div>
                    </div>
                    
                    <!-- Hype Reasons -->
                    <div class="space-y-1">
                        ${fixture.hypeReasons.slice(0, 2).map(reason => `
                            <div class="text-xs text-white bg-gray-700/50 px-2 py-1 rounded">
                                ${reason}
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Hype Meter -->
                    <div class="mt-2 flex items-center gap-2">
                        <span class="text-xs text-white">Hype:</span>
                        <div class="flex-1 bg-gray-700 rounded-full h-2">
                            <div class="h-2 rounded-full ${fixture.hypeScore > 150 ? 'bg-gradient-to-r from-red-500 to-yellow-500' :
                                                            fixture.hypeScore > 100 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                                            fixture.hypeScore > 60 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                                            'bg-gradient-to-r from-blue-500 to-purple-500'}" 
                                 style="width: ${Math.min(100, (fixture.hypeScore / 200) * 100)}%"></div>
                        </div>
                        <span class="text-xs font-bold ${fixture.hypeScore > 150 ? 'text-yellow-400' :
                                                         fixture.hypeScore > 100 ? 'text-orange-400' :
                                                         fixture.hypeScore > 60 ? 'text-purple-400' :
                                                         'text-blue-400'}">${fixture.hypeScore}</span>
                    </div>
                </div>
            `).join('')}
            
            <div class="text-xs text-center text-gray-400 mt-3">
                🔥 ${marqueeFixtures.length} marquee matches identified
            </div>
        </div>
    `;
}

// Key Insights Generation
function generateKeyInsights() {
    const container = document.getElementById('key-insights');
    if (!container) return;
    
    const teams = dashboardData.leaderboard || [];
    const fixtures = dashboardData.upcomingFixtures || [];
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    const currentGW = dashboardData.currentGameweek || 1;
    
    if (!Array.isArray(teams) || teams.length === 0) {
        container.innerHTML = '<p class="text-white">No data for insights</p>';
        return;
    }
    
    // Use the existing leaderboard data directly - it already has the correct league points
    let liveTeams = teams;
    
    const insights = [];
    
    // === LEAGUE STANDING INSIGHTS === //
    
    // League competitiveness analysis
    const topPoints = liveTeams[0]?.points || 0;
    const bottomPoints = liveTeams[liveTeams.length - 1]?.points || 0;
    const pointsGap = topPoints - bottomPoints;
    const midTablePoints = liveTeams[Math.floor(liveTeams.length / 2)]?.points || 0;
    
    if (pointsGap === 0) {
        insights.push({
            icon: '🏁',
            text: 'Perfect tie! All managers have identical points - anyone can win!',
            type: 'extreme'
        });
    } else if (pointsGap <= 3) {
        insights.push({
            icon: '🔥',
            text: `Ultra-tight race! Only ${pointsGap} points separate 1st and last place.`,
            type: 'ultra_competitive'
        });
    } else if (pointsGap <= 6) {
        insights.push({
            icon: '⚡',
            text: `Very competitive! Just ${pointsGap} points between top and bottom.`,
            type: 'very_competitive'
        });
    } else if (pointsGap <= 9) {
        insights.push({
            icon: '⚔️',
            text: `Tight competition with ${pointsGap} point gap between 1st and last.`,
            type: 'competitive'
        });
    } else if (pointsGap <= 15) {
        insights.push({
            icon: '🎯',
            text: `Moderate gap of ${pointsGap} points - still anyone's game!`,
            type: 'moderate'
        });
    } else if (pointsGap <= 24) {
        insights.push({
            icon: '🌊',
            text: `${pointsGap} point spread - some managers are pulling ahead.`,
            type: 'spreading'
        });
    } else if (pointsGap <= 36) {
        insights.push({
            icon: '🏆',
            text: `${getManagerFromTeamName(liveTeams[0]?.teamName || '')} has built a solid ${pointsGap} point lead.`,
            type: 'leading'
        });
    } else if (pointsGap <= 48) {
        insights.push({
            icon: '👑',
            text: `${getManagerFromTeamName(liveTeams[0]?.teamName || '')} is commanding with a ${pointsGap} point advantage.`,
            type: 'commanding'
        });
    } else if (pointsGap > 48) {
        insights.push({
            icon: '🚀',
            text: `${getManagerFromTeamName(liveTeams[0]?.teamName || '')} is absolutely dominating with a ${pointsGap} point lead!`,
            type: 'dominant'
        });
    }
    
    // Top 3 analysis
    const topThreeGap = (liveTeams[0]?.points || 0) - (liveTeams[2]?.points || 0);
    if (liveTeams.length >= 3 && topThreeGap <= 3) {
        insights.push({
            icon: '🥇',
            text: 'Three-way title race! Top 3 managers separated by just ' + topThreeGap + ' points.',
            type: 'title_race'
        });
    } else if (liveTeams.length >= 3 && topThreeGap <= 6) {
        insights.push({
            icon: '🥈',
            text: 'Tight top 3! Leaders within ' + topThreeGap + ' points of each other.',
            type: 'title_race'
        });
    }
    
    // Bottom 3 analysis
    if (liveTeams.length >= 3) {
        const bottomThreeGap = (liveTeams[liveTeams.length - 3]?.points || 0) - (liveTeams[liveTeams.length - 1]?.points || 0);
        if (bottomThreeGap <= 3) {
            insights.push({
                icon: '⚠️',
                text: 'Intense relegation battle! Bottom 3 managers within ' + bottomThreeGap + ' points.',
                type: 'danger'
            });
        } else if (bottomThreeGap <= 6) {
            insights.push({
                icon: '🔻',
                text: 'Relegation zone tight! Bottom 3 within ' + bottomThreeGap + ' points.',
                type: 'danger'
            });
        }
    }
    
    // Middle pack competitiveness
    if (liveTeams.length >= 6) {
        const midStart = Math.floor(liveTeams.length * 0.3);
        const midEnd = Math.floor(liveTeams.length * 0.7);
        const midPackGap = (liveTeams[midStart]?.points || 0) - (liveTeams[midEnd]?.points || 0);
        if (midPackGap <= 3) {
            insights.push({
                icon: '🌊',
                text: 'Ultra-crowded midfield! Middle pack separated by just ' + midPackGap + ' points.',
                type: 'ultra_competitive'
            });
        } else if (midPackGap <= 6) {
            insights.push({
                icon: '⚔️',
                text: 'Tight midfield battle! Several managers within ' + midPackGap + ' points.',
                type: 'competitive'
            });
        } else if (midPackGap <= 9) {
            insights.push({
                icon: '🎯',
                text: 'Moderate midfield spread of ' + midPackGap + ' points.',
                type: 'moderate'
            });
        }
    }
    
    // === GAMEWEEK & PERFORMANCE INSIGHTS === //
    
    // Early vs late season context
    if (currentGW <= 3) {
        insights.push({
            icon: '🚀',
            text: 'Early days! Rankings will shuffle significantly as the season develops.',
            type: 'season_phase'
        });
    } else if (currentGW >= 30) {
        insights.push({
            icon: '🏁',
            text: 'Crunch time! Every point matters in these final gameweeks.',
            type: 'season_phase'
        });
    } else if (currentGW >= 20) {
        insights.push({
            icon: '⏰',
            text: 'Business end of the season - time for decisive moves!',
            type: 'season_phase'
        });
    }
    
    // GW Points analysis - use currentGWPoints (Current GW Pts) not total GW Pts
    const highestGWPoints = Math.max(...liveTeams.map(team => parseInt(team.currentGWPoints) || 0));
    const lowestGWPoints = Math.min(...liveTeams.filter(team => (team.currentGWPoints || 0) > 0).map(team => parseInt(team.currentGWPoints) || 0));
    const gwPointsGap = highestGWPoints - lowestGWPoints;
    
    if (highestGWPoints > 100) {
        const topGWManager = liveTeams.find(team => parseInt(team.currentGWPoints) === highestGWPoints);
        insights.push({
            icon: '💥',
            text: topGWManager?.manager + ' had an explosive gameweek with ' + highestGWPoints + ' points!',
            type: 'performance'
        });
    } else if (highestGWPoints > 80) {
        const topGWManager = liveTeams.find(team => parseInt(team.currentGWPoints) === highestGWPoints);
        insights.push({
            icon: '⭐',
            text: topGWManager?.manager + ' dominated the gameweek with ' + highestGWPoints + ' points.',
            type: 'performance'
        });
    }
    
    if (lowestGWPoints < 20 && lowestGWPoints > 0) {
        const lowGWManager = liveTeams.find(team => parseInt(team.currentGWPoints) === lowestGWPoints);
        insights.push({
            icon: '📉',
            text: 'Tough gameweek for ' + lowGWManager?.manager + ' with only ' + lowestGWPoints + ' points.',
            type: 'struggle'
        });
    }
    
    // === TRANSFER MARKET INSIGHTS === //
    
    const totalTransfers = transferHistory.freeAgents.length + transferHistory.waivers.length + transferHistory.trades.length;
    const freeAgentCount = transferHistory.freeAgents.length;
    const waiverCount = transferHistory.waivers.length;
    const tradeCount = transferHistory.trades.length;
    
    // Transfer activity levels
    if (totalTransfers === 0) {
        insights.push({
            icon: '😴',
            text: 'Silent transfer market - all managers confident in their squads.',
            type: 'inactive'
        });
    } else if (totalTransfers > 50) {
        insights.push({
            icon: '🌪️',
            text: `Transfer frenzy! ${totalTransfers} moves completed - managers are restless!`,
            type: 'hyperactive'
        });
    } else if (totalTransfers > 25) {
        insights.push({
            icon: '🔄',
            text: `Active transfer market with ${totalTransfers} completed moves.`,
            type: 'active'
        });
    } else if (totalTransfers > 10) {
        insights.push({
            icon: '📈',
            text: `Moderate transfer activity with ${totalTransfers} moves so far.`,
            type: 'moderate'
        });
    }
    
    // Transfer method preferences
    if (totalTransfers > 0) {
        if (freeAgentCount > waiverCount + tradeCount) {
            insights.push({
                icon: '🆓',
                text: 'Free agency rules! Managers prefer the safety of uncontested signings.',
                type: 'strategy'
            });
        } else if (waiverCount > freeAgentCount + tradeCount) {
            insights.push({
                icon: '⚡',
                text: 'Waiver wars! Managers are fighting hard for priority picks.',
                type: 'strategy'
            });
        } else if (tradeCount > 0 && tradeCount >= freeAgentCount) {
            insights.push({
                icon: '🤝',
                text: 'Deal makers! Managers prefer negotiating direct trades.',
                type: 'strategy'
            });
        }
    }
    
    // Failed waiver attempts
    const failedWaivers = transferHistory.waivers.filter(w => w.Result !== 'Success').length;
    if (failedWaivers > 5) {
        insights.push({
            icon: '🚫',
            text: `${failedWaivers} failed waiver claims - competition is fierce!`,
            type: 'competitive'
        });
    }
    
    // === PLAYER MARKET INSIGHTS === //
    
    // Most transferred players
    const playersIn = {};
    const playersOut = {};
    
    transferHistory.freeAgents.forEach(move => {
        if (move.In) playersIn[move.In] = (playersIn[move.In] || 0) + 1;
        if (move.Out) playersOut[move.Out] = (playersOut[move.Out] || 0) + 1;
    });
    
    transferHistory.waivers.forEach(move => {
        if (move.Result === 'Success') {
            if (move.In) playersIn[move.In] = (playersIn[move.In] || 0) + 1;
            if (move.Out) playersOut[move.Out] = (playersOut[move.Out] || 0) + 1;
        }
    });
    
    const topTarget = Object.entries(playersIn).sort(([,a], [,b]) => b - a)[0];
    const mostDropped = Object.entries(playersOut).sort(([,a], [,b]) => b - a)[0];
    
    if (topTarget && topTarget[1] > 2) {
        insights.push({
            icon: '🎯',
            text: `${topTarget[0]} is the hottest property with ${topTarget[1]} acquisitions!`,
            type: 'trending'
        });
    } else if (topTarget && topTarget[1] > 1) {
        insights.push({
            icon: '📈',
            text: `${topTarget[0]} is gaining popularity with ${topTarget[1]} transfers in.`,
            type: 'rising'
        });
    }
    
    if (mostDropped && mostDropped[1] > 2) {
        insights.push({
            icon: '📉',
            text: `${mostDropped[0]} is falling out of favor - ${mostDropped[1]} managers have moved on.`,
            type: 'declining'
        });
    }
    
    // === MANAGER BEHAVIOR INSIGHTS === //
    
    // Most active manager
    const managerActivity = {};
    const normalizeName = (n) => (n || '').trim();
    const firstNameOf = (n) => normalizeName(n).split(' ')[0] || '';
    
    // Count free agents and waivers
    [...transferHistory.freeAgents, ...transferHistory.waivers].forEach(move => {
        const full = normalizeName(move.Manager);
        const first = firstNameOf(full);
        if (!full && !first) return;
        if (full) managerActivity[full] = (managerActivity[full] || 0) + 1;
        if (first && first !== full) managerActivity[first] = (managerActivity[first] || 0) + 1;
    });
    
    // Count accepted trades (both sides)
    if (Array.isArray(transferHistory.trades)) {
        transferHistory.trades.forEach(trade => {
            if (trade.Result === 'Accepted') {
                const offeredBy = normalizeName(trade['Offered By']);
                const offeredTo = normalizeName(trade['Offered To']);
                [offeredBy, offeredTo].forEach(name => {
                    if (!name) return;
                    const first = firstNameOf(name);
                    managerActivity[name] = (managerActivity[name] || 0) + 1;
                    if (first && first !== name) managerActivity[first] = (managerActivity[first] || 0) + 1;
                });
            }
        });
    }
    
    const mostActiveManager = Object.entries(managerActivity).sort(([,a], [,b]) => b - a)[0];
    if (mostActiveManager && mostActiveManager[1] > 5) {
        insights.push({
            icon: '🏃',
            text: `${mostActiveManager[0]} is the busiest manager with ${mostActiveManager[1]} transfer moves!`,
            type: 'hyperactive'
        });
    } else if (mostActiveManager && mostActiveManager[1] > 3) {
        insights.push({
            icon: '🔧',
            text: `${mostActiveManager[0]} is actively tinkering with ${mostActiveManager[1]} transfers.`,
            type: 'active'
        });
    }
    
    // Inactive managers
    const activeManagers = new Set(Object.keys(managerActivity));
    const allManagers = liveTeams.map(team => normalizeName(team.manager));
    const inactiveManagers = allManagers.filter(manager => {
        const first = firstNameOf(manager);
        return !(activeManagers.has(manager) || (first && activeManagers.has(first)));
    });
     
    if (inactiveManagers.length >= liveTeams.length / 2) {
        insights.push({
            icon: '🧘',
            text: `${inactiveManagers.length} managers haven't made any transfers - trusting their draft!`,
            type: 'conservative'
        });
    }
    
    // === FINANCIAL INSIGHTS === //
    
    const totalWinnings = liveTeams.reduce((sum, team) => sum + (parseInt(team.totalWinnings) || 0), 0);
    if (totalWinnings > 100) {
        insights.push({
            icon: '💰',
            text: `$${totalWinnings} in prize money distributed so far this season!`,
            type: 'financial'
        });
    } else if (totalWinnings > 50) {
        insights.push({
            icon: '💵',
            text: `$${totalWinnings} earned by managers through weekly and monthly wins.`,
            type: 'financial'
        });
    }
    
    // High earner
    const topEarner = liveTeams.reduce((max, team) => {
        const maxEarnings = parseInt(max.totalWinnings) || 0;
        const teamEarnings = parseInt(team.totalWinnings) || 0;
        return teamEarnings > maxEarnings ? team : max;
    }, liveTeams[0]);
    
    if (topEarner && (parseInt(topEarner.totalWinnings) || 0) > 30) {
        insights.push({
            icon: '🤑',
            text: `${topEarner.manager} is banking serious cash with $${topEarner.totalWinnings} earned!`,
            type: 'financial'
        });
    }
    
    // === SEASONAL INSIGHTS === //
    
    if (fixtures.length > 0) {
        // Calculate remaining fixtures based on current gameweek
        const totalSeasonFixtures = 228; // Total fixtures in a season
        const fixturesPlayed = (currentGW - 1) * 6; // 6 matches per gameweek
        const remainingFixtures = totalSeasonFixtures - fixturesPlayed;
        
        insights.push({
            icon: '📅',
            text: `${remainingFixtures} fixtures still to be played this season.`,
            type: 'schedule'
        });
    }
    
    // === CRAZY HYPE INSIGHTS === //
    
    // Player performance trends and anomalies
    if (dataManager) {
        const currentData = dataManager.getGameweekData(dashboardData.currentGameweek);
        const previousData = dataManager.getGameweekData(dashboardData.currentGameweek - 1);
        
        if (currentData && previousData) {
            // Find players who exploded this gameweek vs last
            const currentPlayers = currentData.players || [];
            const previousPlayers = previousData.players || [];
            
            // Find biggest point jumpers
            const pointJumpers = currentPlayers
                .filter(current => {
                    const previous = previousPlayers.find(p => p.Player === current.Player);
                    return previous && (current.RP || 0) > (previous.RP || 0);
                })
                .map(current => {
                    const previous = previousPlayers.find(p => p.Player === current.Player);
                    const jump = (current.RP || 0) - (previous.RP || 0);
                    return { player: current.Player, jump, current: current.RP || 0, previous: previous.RP || 0 };
                })
                .sort((a, b) => b.jump - a.jump)
                .slice(0, 3);
            
            if (pointJumpers.length > 0 && pointJumpers[0].jump >= 5) {
                insights.push({
                    icon: '🚀',
                    text: pointJumpers[0].player + ' just EXPLODED with a ' + pointJumpers[0].jump + ' point jump! (' + pointJumpers[0].previous + ' → ' + pointJumpers[0].current + ' pts)',
                    type: 'explosion'
                });
            }
            
            // Find players who went from hero to zero
            const pointDroppers = currentPlayers
                .filter(current => {
                    const previous = previousPlayers.find(p => p.Player === current.Player);
                    return previous && (current.RP || 0) < (previous.RP || 0) && (previous.RP || 0) >= 8;
                })
                .map(current => {
                    const previous = previousPlayers.find(p => p.Player === current.Player);
                    const drop = (previous.RP || 0) - (current.RP || 0);
                    return { player: current.Player, drop, current: current.RP || 0, previous: previous.RP || 0 };
                })
                .sort((a, b) => b.drop - a.drop)
                .slice(0, 2);
            
            if (pointDroppers.length > 0 && pointDroppers[0].drop >= 6) {
                insights.push({
                    icon: '📉',
                    text: pointDroppers[0].player + ' went from ' + pointDroppers[0].previous + ' to ' + pointDroppers[0].current + ' pts - what happened?!',
                    type: 'collapse'
                });
            }
        }
        
        // Transfer market chaos analysis
        const transferHistory = currentData?.transferHistory || {};
        const waivers = transferHistory.waivers || [];
        const freeAgents = transferHistory.freeAgents || [];
        
        // Most contested players
        const playerAcquisitions = {};
        [...waivers, ...freeAgents].forEach(move => {
            if (move.In) {
                playerAcquisitions[move.In] = (playerAcquisitions[move.In] || 0) + 1;
            }
        });
        
        const mostContested = Object.entries(playerAcquisitions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        if (mostContested.length > 0 && mostContested[0][1] >= 3) {
            insights.push({
                icon: '🔥',
                text: mostContested[0][0] + ' is the HOTTEST property with ' + mostContested[0][1] + ' managers fighting for them!',
                type: 'hot_property'
            });
        }
        
        // Waiver war analysis
        const deniedWaivers = waivers.filter(w => w.Result !== 'Success').length;
        const acceptedWaivers = waivers.filter(w => w.Result === 'Success').length;
        
        if (deniedWaivers > acceptedWaivers && deniedWaivers >= 5) {
            insights.push({
                icon: '⚔️',
                text: 'WAIVER WAR ZONE! ' + deniedWaivers + ' denied claims vs ' + acceptedWaivers + ' accepted - managers are DESPERATE!',
                type: 'waiver_war'
            });
        }
        
        // Manager transfer patterns
        const managerTransferCounts = {};
        [...waivers, ...freeAgents].forEach(move => {
            if (move.Manager) {
                managerTransferCounts[move.Manager] = (managerTransferCounts[move.Manager] || 0) + 1;
            }
        });
        
        const mostActiveManager = Object.entries(managerTransferCounts)
            .sort(([,a], [,b]) => b - a)[0];
        
        if (mostActiveManager && mostActiveManager[1] >= 4) {
            insights.push({
                icon: '🌪️',
                text: mostActiveManager[0] + ' is in FULL PANIC MODE with ' + mostActiveManager[1] + ' transfers this gameweek!',
                type: 'panic_mode'
            });
        }
        
        // Performance vs Transfer correlation
        const highTransferManagers = Object.entries(managerTransferCounts)
            .filter(([,count]) => count >= 3)
            .map(([manager]) => manager);
        
        if (highTransferManagers.length > 0) {
            const highTransferTeam = liveTeams.find(team => 
                highTransferManagers.some(manager => 
                    team.manager?.includes(manager) || team.teamName?.includes(manager)
                )
            );
            
            if (highTransferTeam && (highTransferTeam.currentGWPoints || 0) < 20) {
                insights.push({
                    icon: '🤡',
                    text: highTransferTeam.manager + ' made ' + (managerTransferCounts[highTransferTeam.manager] || 0) + ' transfers but still only got ' + (highTransferTeam.currentGWPoints || 0) + ' points - classic!',
                    type: 'transfer_fail'
                });
            }
        }
    }
    
    // === RANDOMIZED MOTIVATIONAL INSIGHTS === //
    
    const motivationalInsights = [
        { icon: '🎲', text: 'Every gameweek brings new opportunities for dramatic swings!', type: 'motivation' },
        { icon: '💫', text: 'One captain pick could change everything - choose wisely!', type: 'motivation' },
        { icon: '🎯', text: 'The beauty of FPL - anyone can have their moment of glory!', type: 'motivation' },
        { icon: '🌟', text: 'Remember: points are temporary, but league bragging rights are forever!', type: 'motivation' },
        { icon: '🚀', text: 'Form is temporary, class is permanent - or is it the other way around?', type: 'motivation' },
        { icon: '🎪', text: 'Welcome to the greatest show on earth - your FPL league!', type: 'motivation' }
    ];
    
    // Add a random motivational insight 30% of the time
    if (Math.random() < 0.3) {
        const randomInsight = motivationalInsights[Math.floor(Math.random() * motivationalInsights.length)];
        insights.push(randomInsight);
    }
    
    // Ensure we always have some insights
    if (insights.length === 0) {
        insights.push({
            icon: '📊',
            text: 'Building comprehensive insights as your league data grows...',
            type: 'placeholder'
        });
    }
    
    container.innerHTML = `
        <div class="space-y-3">
            ${insights.map(insight => `
                <div class="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600/50">
                    <span class="text-lg">${insight.icon}</span>
                    <span class="text-sm text-white">${insight.text}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Player Performance Analytics
function analyzePlayerPerformance() {
    const container = document.getElementById('player-analytics');
    if (!container) return;
    
    if (!dataManager) {
        container.innerHTML = '<p class="text-white">Data manager not available</p>';
        return;
    }
    
    const allPlayers = dataManager.getAllPlayers();
    
    if (!allPlayers || allPlayers.length === 0) {
        container.innerHTML = '<p class="text-white">No player data available</p>';
        return;
    }
    
    // Get draft data to match players to managers (respects user's gameweek selection)
    const currentData = dataManager.getGameweekData(dashboardData.currentGameweek);
    const draftData = {
        teams: currentData?.draft?.teams || []
    };
    
    console.log('🔍 Debug: Current gameweek data:', currentData);
    console.log('🔍 Debug: Draft data structure:', draftData);
    
    // Create the HTML with the 3 cool analytics
    const playerAnalyticsHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- 1. Player Impact on Manager Success -->
            <div class="space-y-4">
                <h4 class="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                    <i class="fas fa-trophy text-yellow-400 mr-2"></i>
                    Player Impact on Manager Success
                </h4>
                
                <!-- Best Player Acquisition -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Best Value Pick</h5>
                    <div class="space-y-2">
                        ${getBestValuePick(allPlayers).map((player, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-yellow-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${player.name}</span>
                                    <span class="badge badge-sm ${
                                        player.position === 'FWD' ? 'badge-error' :
                                        player.position === 'MID' ? 'badge-warning' :
                                        player.position === 'DEF' ? 'badge-info' :
                                        'badge-secondary'
                                    }">${player.position}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-green-400 font-bold">${player.totalPoints || 0} pts</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Best & Worst Players by Manager -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Best & Worst Players by Manager</h5>
                    <div class="space-y-3">
                        ${getBestAndWorstPlayers(allPlayers, draftData).map((manager, index) => `
                            <div class="bg-gray-600/50 rounded p-3">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-blue-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${manager.name}</span>
                                </div>
                                <div class="grid grid-cols-2 text-sm">
                                    <div class="text-center border-r border-gray-500 pr-3">
                                        <div class="text-green-400 font-bold">${manager.bestPlayer.name}</div>
                                        <div class="text-xs text-gray-400">${manager.bestPlayer.points} pts</div>
                                    </div>
                                    <div class="text-center pl-3">
                                        <div class="text-red-400 font-bold">${manager.worstPlayer.name}</div>
                                        <div class="text-xs text-gray-400">${manager.worstPlayer.points} pts</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 2. Transfer Market Genius & 3. Risk vs Reward -->
            <div class="space-y-4">
                <h4 class="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                    <i class="fas fa-chart-line text-blue-400 mr-2"></i>
                    Transfer Market & Risk Analysis
                </h4>
                
                <!-- Bargain Hunters -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Bargain Hunters</h5>
                    <div class="space-y-2">
                        ${getBargainHunters(allPlayers).map((player, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-green-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${player.name}</span>
                                    <span class="badge badge-sm ${
                                        player.position === 'FWD' ? 'badge-error' :
                                        player.position === 'MID' ? 'badge-warning' :
                                        player.position === 'DEF' ? 'badge-info' :
                                        'badge-secondary'
                                    }">${player.position}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-green-400 font-bold">${player.pointsPerCost} pts/£</div>
                                    <div class="text-xs text-gray-400">${player.totalPoints || 0} pts</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- High-Risk, High-Reward -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">High-Risk, High-Reward</h5>
                    <div class="space-y-2">
                        ${getHighRiskHighReward(allPlayers).map((player, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-red-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${player.name}</span>
                                    <span class="badge badge-sm ${
                                        player.position === 'FWD' ? 'badge-error' :
                                        player.position === 'MID' ? 'badge-warning' :
                                        player.position === 'DEF' ? 'badge-info' :
                                        'badge-secondary'
                                    }">${player.position}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-red-400 font-bold">${player.totalPoints || 0} pts</div>
                                    <div class="text-xs text-gray-400">High Risk</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 4. Form vs Consistency Analysis & 5. Position Strategy & 6. Value for Money -->
            <div class="space-y-4">
                <h4 class="text-lg font-semibold text-white border-b border-gray-600 pb-2">
                    <i class="fas fa-chart-bar text-purple-400 mr-2"></i>
                    Form, Strategy & Value Analysis
                </h4>
                
                <!-- 4. Form vs Consistency Analysis -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Form vs Consistency</h5>
                    <div class="space-y-2">
                        ${getFormVsConsistency(allPlayers).map((player, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-purple-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${player.name}</span>
                                    <span class="badge badge-sm ${
                                        player.position === 'FWD' ? 'badge-error' :
                                        player.position === 'MID' ? 'badge-warning' :
                                        player.position === 'DEF' ? 'badge-info' :
                                        'badge-secondary'
                                    }">${player.position}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-purple-400 font-bold">${player.consistencyScore}</div>
                                    <div class="text-xs text-gray-400">${player.consistencyType}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 5. Position Strategy Analysis -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Position Strategy</h5>
                    <div class="space-y-2">
                        ${getPositionStrategy(allPlayers).map((position, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-cyan-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${position.name}</span>
                                    <span class="text-xs text-gray-400">${position.count} players</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-cyan-400 font-bold">${position.avgPoints}</div>
                                    <div class="text-xs text-gray-400">avg pts</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- 6. Value for Money Analysis -->
                <div class="bg-gray-700/50 rounded-lg p-4">
                    <h5 class="text-md font-medium text-white mb-3">Value for Money</h5>
                    <div class="space-y-2">
                        ${getValueForMoney(allPlayers).map((player, index) => `
                            <div class="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                                <div class="flex items-center gap-2">
                                    <span class="text-emerald-400 font-bold">${index + 1}</span>
                                    <span class="text-white font-medium">${player.name}</span>
                                    <span class="badge badge-sm ${
                                        player.position === 'FWD' ? 'badge-error' :
                                        player.position === 'MID' ? 'badge-warning' :
                                        player.position === 'DEF' ? 'badge-info' :
                                        'badge-secondary'
                                    }">${player.position}</span>
                                </div>
                                <div class="text-right">
                                    <div class="text-emerald-400 font-bold">${player.valueScore}</div>
                                    <div class="text-xs text-gray-400">value rating</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = playerAnalyticsHTML;
}

// Helper function: Get best value picks (points per cost)
function getBestValuePick(players) {
    return players
        .filter(p => p.cost > 0 && p.totalPoints > 0)
        .map(p => ({
            ...p,
            pointsPerCost: (p.totalPoints / p.cost).toFixed(2)
        }))
        .sort((a, b) => parseFloat(b.pointsPerCost) - parseFloat(a.pointsPerCost))
        .slice(0, 3);
}

// Helper function: Get top player contributors by manager
function getTopPlayerContributors(players, draftData) {
    console.log('🏆 Calculating Top Player Contributors...');
    console.log('📊 Players available:', players.length);
    console.log('📊 Draft data:', draftData);
    
    // Debug: Check what leaderboard data we're working with
    console.log('🔍 Current dashboardData.leaderboard:', dashboardData.leaderboard);
    console.log('🔍 Leaderboard manager names:', dashboardData.leaderboard.map(t => t.manager));
    console.log('🔍 Leaderboard team names:', dashboardData.leaderboard.map(t => t.teamName));
    
    if (!draftData || !draftData.teams || draftData.teams.length === 0) {
        console.warn('❌ No draft data available for player-manager matching');
        return [
            { name: "No Draft Data", contributionRatio: "0%" },
            { name: "Please Check Data", contributionRatio: "0%" }
        ];
    }
    
    const managerAnalysis = [];
    
    // For each manager (team), analyze their player contributions
    draftData.teams.forEach(team => {
        // Get manager name directly from results data instead of leaderboard
        let managerName = '';
        
        if (dataManager) {
            const results = dataManager.getResults();
            // Find the result that contains this team
            const teamResult = results.find(result => 
                result.homeTeam === team.teamName || result.awayTeam === team.teamName
            );
            
            if (teamResult) {
                if (teamResult.homeTeam === team.teamName) {
                    managerName = teamResult.homeManager || '';
                } else {
                    managerName = teamResult.awayManager || '';
                }
            }
        }
        
        // Fallback to team name if no manager found
        if (!managerName) {
            managerName = team.teamName;
        }
        
        // Get current squad using team name instead of manager name
        // since draft data has empty manager fields
        const currentSquad = calculateCurrentTeam(team.teamName, null, team.manager);
        
        if (!currentSquad || currentSquad.length === 0) {
            console.warn(`❌ No current squad found for ${managerName}`);
            return;
        }
        
        console.log(`🔍 Analyzing ${managerName} with ${currentSquad.length} current squad players:`, currentSquad);
        
        // Find all players that belong to this manager
        const managerPlayers = [];
        
        currentSquad.forEach(currentPlayerName => {
            // Try to find this player in the performance data
            // We need to match by name, handling potential variations
            const matchedPlayer = players.find(player => {
                // Try exact match first
                if (player.name === currentPlayerName) return true;
                
                // Try partial matches (handling different name formats)
                const playerNameLower = player.name.toLowerCase();
                const currentNameLower = currentPlayerName.toLowerCase();
                
                // Check if player name is contained in current name or vice versa
                return playerNameLower.includes(currentNameLower) || 
                       currentNameLower.includes(playerNameLower) ||
                       // Check last name matching (common in FPL)
                       playerNameLower.split(' ').some(part => 
                           currentNameLower.includes(part) && part.length > 2
                       );
            });
            
            if (matchedPlayer) {
                console.log(`✅ Matched ${currentPlayerName} → ${matchedPlayer.name} (${matchedPlayer.totalPoints} pts)`);
                managerPlayers.push({
                    ...matchedPlayer,
                    currentSquadName: currentPlayerName
                });
            } else {
                console.log(`❌ Could not match ${currentPlayerName} to any performance data`);
            }
        });
        
        if (managerPlayers.length === 0) {
            console.warn(`❌ No players matched for ${team.manager || team.teamName}`);
            return;
        }
        
        // Sort players by total points and get top 3
        const sortedPlayers = managerPlayers.sort((a, b) => b.totalPoints - a.totalPoints);
        const top3Players = sortedPlayers.slice(0, 3);
        
        // Calculate total points from top 3 players
        const top3Points = top3Players.reduce((sum, player) => sum + player.totalPoints, 0);
        
        // Calculate total points from all players
        const totalPlayerPoints = managerPlayers.reduce((sum, player) => sum + player.totalPoints, 0);
        
        // Calculate contribution ratio (what % of manager's player points come from top 3)
        const contributionRatio = totalPlayerPoints > 0 ? 
            Math.round((top3Points / totalPlayerPoints) * 100) : 0;
        
        // Get manager's current league points for context
        const managerLeaguePoints = team.points || 0;
        
        console.log(`📊 ${managerName || team.teamName}:`, {
            totalPlayers: managerPlayers.length,
            top3Points,
            totalPlayerPoints,
            contributionRatio: `${contributionRatio}%`,
            leaguePoints: managerLeaguePoints
        });
        
        managerAnalysis.push({
            name: (managerName || team.teamName).split(' ')[0], // First name only
            fullName: managerName || team.teamName,
            contributionRatio: contributionRatio,
            top3Points,
            totalPlayerPoints,
            playerCount: managerPlayers.length,
            topPlayers: top3Players.slice(0, 3).map(p => ({
                name: p.name,
                points: p.totalPoints
            }))
        });
    });
    
    // Sort managers by contribution ratio (higher = more dependent on top players)
    // Secondary sort by top 3 points total for tiebreaker
    const sortedAnalysis = managerAnalysis.sort((a, b) => {
        if (b.contributionRatio === a.contributionRatio) {
            return b.top3Points - a.top3Points; // Higher top 3 points as tiebreaker
        }
        return b.contributionRatio - a.contributionRatio; // Higher ratio first
    });
    
    console.log('🏆 Final manager analysis ranking:', sortedAnalysis);
    
    // Return top 3 managers with formatted results
    return sortedAnalysis.slice(0, 3).map(manager => ({
        name: manager.name,
        fullName: manager.fullName,
        contributionRatio: `${manager.contributionRatio}%`,
        contributionRatioNumeric: manager.contributionRatio,
        top3Points: manager.top3Points,
        playerCount: manager.playerCount,
        topPlayers: manager.topPlayers
    }));
}

// Helper function: Get best and worst player from each manager
function getBestAndWorstPlayers(players, draftData) {
    if (!draftData || !draftData.teams || draftData.teams.length === 0) {
        return [
            { name: "No Draft Data", bestPlayer: { name: "N/A", points: 0 }, worstPlayer: { name: "N/A", points: 0 } }
        ];
    }
    
    const managerAnalysis = [];
    
    // For each manager (team), find their best and worst player
    draftData.teams.forEach(team => {
        // Get manager name directly from results data
        let managerName = '';
        
        if (dataManager) {
            const results = dataManager.getResults();
            const teamResult = results.find(result => 
                result.homeTeam === team.teamName || result.awayTeam === team.teamName
            );
            
            if (teamResult) {
                if (teamResult.homeTeam === team.teamName) {
                    managerName = teamResult.homeManager || '';
                } else {
                    managerName = teamResult.awayManager || '';
                }
            }
        }
        
        // Fallback to team name if no manager found
        if (!managerName) {
            managerName = team.teamName;
        }
        
        // Get current squad using team name
        const currentSquad = calculateCurrentTeam(team.teamName, null, team.manager);
        
        if (!currentSquad || currentSquad.length === 0) {
            return;
        }
        
        // Find all players that belong to this manager
        const managerPlayers = [];
        
        currentSquad.forEach(currentPlayerName => {
            const matchedPlayer = players.find(player => {
                if (player.name === currentPlayerName) return true;
                
                const playerNameLower = player.name.toLowerCase();
                const currentNameLower = currentPlayerName.toLowerCase();
                
                return playerNameLower.includes(currentNameLower) || 
                       currentNameLower.includes(playerNameLower) ||
                       playerNameLower.split(' ').some(part => 
                           currentNameLower.includes(part) && part.length > 2
                       );
            });
            
            if (matchedPlayer) {
                managerPlayers.push({
                    ...matchedPlayer,
                    currentSquadName: currentPlayerName
                });
            }
        });
        
        if (managerPlayers.length === 0) {
            return;
        }
        
        // Sort players by points to find best and worst
        const sortedPlayers = managerPlayers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        const bestPlayer = sortedPlayers[0];
        const worstPlayer = sortedPlayers[sortedPlayers.length - 1];
        
        managerAnalysis.push({
            name: (managerName || team.teamName).split(' ')[0], // First name only
            fullName: managerName || team.teamName,
            bestPlayer: {
                name: bestPlayer.name,
                points: bestPlayer.totalPoints || 0
            },
            worstPlayer: {
                name: worstPlayer.name,
                points: worstPlayer.totalPoints || 0
            }
        });
    });
    
    // Sort managers by best player points (higher = better)
    const sortedAnalysis = managerAnalysis.sort((a, b) => b.bestPlayer.points - a.bestPlayer.points);
    
    // Return top 3 managers
    return sortedAnalysis.slice(0, 3);
}

// Helper function: Get bargain hunters (low cost, high points)
function getBargainHunters(players) {
    return players
        .filter(p => p.cost <= 6 && p.totalPoints > 0) // Low cost players
        .map(p => ({
            ...p,
            pointsPerCost: (p.totalPoints / p.cost).toFixed(2)
        }))
        .sort((a, b) => parseFloat(b.pointsPerCost) - parseFloat(a.pointsPerCost))
        .slice(0, 3);
}

// Helper function: Get high-risk, high-reward players
function getHighRiskHighReward(players) {
    return players
        .filter(p => p.cost >= 10 && p.totalPoints > 0) // Expensive players
        .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
        .slice(0, 3);
}

// Helper function: Get form vs consistency analysis
function getFormVsConsistency(players) {
    return players
        .filter(p => p.totalPoints > 0)
        .map(p => {
            // Calculate consistency score based on points vs cost ratio
            const pointsPerCost = p.totalPoints / (p.cost || 1);
            let consistencyType, consistencyScore;
            
            if (pointsPerCost >= 2.0) {
                consistencyType = "Steady Eddie";
                consistencyScore = "A+";
            } else if (pointsPerCost >= 1.5) {
                consistencyType = "Reliable";
                consistencyScore = "A";
            } else if (pointsPerCost >= 1.0) {
                consistencyType = "Solid";
                consistencyScore = "B+";
            } else if (pointsPerCost >= 0.5) {
                consistencyType = "Inconsistent";
                consistencyScore = "C";
            } else {
                consistencyType = "Streaky";
                consistencyScore = "D";
            }
            
            return {
                ...p,
                consistencyScore,
                consistencyType
            };
        })
        .sort((a, b) => {
            // Sort by consistency score (A+ > A > B+ > C > D)
            const scoreOrder = { 'A+': 5, 'A': 4, 'B+': 3, 'C': 2, 'D': 1 };
            return scoreOrder[b.consistencyScore] - scoreOrder[a.consistencyScore];
        })
        .slice(0, 3);
}

// Helper function: Get position strategy analysis
function getPositionStrategy(players) {
    const positions = ['GKP', 'DEF', 'MID', 'FWD'];
    
    return positions.map(pos => {
        const posPlayers = players.filter(p => p.position === pos);
        const totalPoints = posPlayers.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
        const avgPoints = posPlayers.length > 0 ? (totalPoints / posPlayers.length).toFixed(1) : 0;
        
        return {
            name: pos,
            count: posPlayers.length,
            avgPoints: avgPoints,
            totalPoints: totalPoints
        };
    }).sort((a, b) => parseFloat(b.avgPoints) - parseFloat(a.avgPoints));
}

// Helper function: Get value for money analysis
function getValueForMoney(players) {
    return players
        .filter(p => p.cost > 0 && p.totalPoints > 0)
        .map(p => {
            // Calculate value score: (points * 10) / cost
            // This gives higher scores to players who deliver more points per pound
            const valueScore = ((p.totalPoints * 10) / p.cost).toFixed(1);
            
            return {
                ...p,
                valueScore
            };
        })
        .sort((a, b) => parseFloat(b.valueScore) - parseFloat(a.valueScore))
        .slice(0, 3);
}

// Prize Pool & Earnings Management
class PrizePoolManager {
    constructor() {
        this.leagueSize = 12;
        this.weeklyWinnerAmount = 1; // $1 from each other manager to weekly winner
        this.monthlyWinnerAmount = 2; // $2 from each other manager to monthly winner
        this.finalPayoutPercentages = {
            first: 0.60,   // 60% to 1st place
            second: 0.30,  // 30% to 2nd place  
            third: 0.10    // 10% to 3rd place
        };
        this.leaguePot = 420; // Fixed league pot ($35 × 12 people) for final payouts
    }

    // Calculate all earnings up to a specific gameweek
    calculateEarningsUpToGameweek(targetGameweek) {
        if (!dataManager) return this.getEmptyEarnings();

        const earnings = {
            totalPool: 0,
            weeklyWinners: [],
            monthlyWinners: [],
            totalWeeklyPayout: 0,
            totalMonthlyPayout: 0,
            managerEarnings: new Map(),
            outstandingPayments: new Map()
        };

        // Calculate weekly earnings for each gameweek up to target
        for (let gw = 1; gw <= targetGameweek; gw++) {
            const gameweekData = dataManager.gameweekData.get(`gw${gw}`);
            if (gameweekData && gameweekData.standings && gameweekData.standings.length > 0) {
                const weeklyResult = this.calculateWeeklyWinner(gameweekData.standings, gw);
                if (weeklyResult) {
                    earnings.weeklyWinners.push(weeklyResult);
                    earnings.totalWeeklyPayout += weeklyResult.winnings;
                    
                    // Add to manager earnings
                    const currentEarnings = earnings.managerEarnings.get(weeklyResult.manager) || 0;
                    earnings.managerEarnings.set(weeklyResult.manager, currentEarnings + weeklyResult.winnings);
                }
            }
        }

        // Calculate monthly earnings (group weeks by month)
        earnings.monthlyWinners = this.calculateMonthlyWinners(earnings.weeklyWinners, targetGameweek);
        earnings.totalMonthlyPayout = earnings.monthlyWinners.reduce((sum, winner) => sum + winner.winnings, 0);

        // Update manager earnings with monthly winnings
        earnings.monthlyWinners.forEach(winner => {
            const currentEarnings = earnings.managerEarnings.get(winner.manager) || 0;
            earnings.managerEarnings.set(winner.manager, currentEarnings + winner.winnings);
        });

        // Show league pot (fixed $420 for final payouts)
        earnings.totalPool = this.leaguePot;
        earnings.outstandingPayments = this.calculateOutstandingPayments(earnings.managerEarnings, earnings.weeklyWinners, earnings.monthlyWinners);
        
        // Calculate final season payouts based on current leaderboard
        const currentData = dataManager?.getCurrentGameweekData();
        const leaderboard = currentData?.draft?.teams || [];
        earnings.finalPayouts = this.calculateFinalPayouts(leaderboard, this.leaguePot);

        return earnings;
    }

    // Calculate weekly winner for a specific gameweek
    calculateWeeklyWinner(standings, gameweek) {
        if (!standings || standings.length === 0) return null;

        // Find manager with highest GW points
        const winner = standings.reduce((max, manager) => {
            const maxGwPoints = parseInt(max.gwPoints) || 0;
            const managerGwPoints = parseInt(manager.gwPoints) || 0;
            return managerGwPoints > maxGwPoints ? manager : max;
        }, standings[0]);

        if (!winner || (parseInt(winner.gwPoints) || 0) === 0) return null;

        // Weekly winner gets $1 from each of the other 11 managers
        const weeklyWinnings = (this.leagueSize - 1) * this.weeklyWinnerAmount;

        return {
            gameweek: gameweek,
            manager: winner.manager || winner.teamName,
            points: parseInt(winner.gwPoints) || 0,
            winnings: weeklyWinnings
        };
    }

    // Calculate monthly winners based on cumulative points in calendar months
    calculateMonthlyWinners(weeklyWinners, targetGameweek) {
        // Group gameweeks by month (assume GW1 = August for now)
        const monthlyGroups = this.groupGameweeksByMonth(targetGameweek);
        const monthlyWinners = [];

        monthlyGroups.forEach(monthData => {
            // Only calculate monthly winners for complete months
            if (!monthData.isComplete) {
                console.log(`📅 Skipping incomplete month: ${monthData.name} (GW${monthData.startGW}-${monthData.endGW})`);
                return;
            }
            
            const monthlyPointsMap = new Map();
            
            // Sum points for each manager in this month
            for (let gw = monthData.startGW; gw <= monthData.endGW; gw++) {
                const gameweekData = dataManager.gameweekData.get(`gw${gw}`);
                if (gameweekData && gameweekData.standings) {
                    gameweekData.standings.forEach(manager => {
                        const managerName = manager.manager || manager.teamName;
                        const gwPoints = parseInt(manager.gwPoints) || 0;
                        const currentTotal = monthlyPointsMap.get(managerName) || 0;
                        monthlyPointsMap.set(managerName, currentTotal + gwPoints);
                    });
                }
            }

            // Find monthly winner
            if (monthlyPointsMap.size > 0) {
                let monthlyWinner = null;
                let maxPoints = 0;
                
                monthlyPointsMap.forEach((points, manager) => {
                    if (points > maxPoints) {
                        maxPoints = points;
                        monthlyWinner = manager;
                    }
                });

                if (monthlyWinner && maxPoints > 0) {
                    // Monthly winner gets $2 from each of the other 11 managers
                    const monthlyWinnings = (this.leagueSize - 1) * this.monthlyWinnerAmount;
                    
                    console.log(`🏆 Monthly winner for ${monthData.name}: ${monthlyWinner} with ${maxPoints} points, winning $${monthlyWinnings}`);
                    
                    monthlyWinners.push({
                        month: monthData.name,
                        manager: monthlyWinner,
                        points: maxPoints,
                        winnings: monthlyWinnings,
                        gameweeksIncluded: `GW${monthData.startGW}-${monthData.endGW}`
                    });
                }
            }
        });

        return monthlyWinners;
    }

    // Group gameweeks by calendar month
    groupGameweeksByMonth(targetGameweek) {
        // Simplified: assume 4 gameweeks per month, starting in August
        const months = [];
        const monthNames = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
        
        let currentGW = 1;
        let monthIndex = 0;
        
        while (currentGW <= targetGameweek && monthIndex < monthNames.length) {
            const endGW = Math.min(currentGW + 3, targetGameweek); // 4 gameweeks per month
            
            // Only include months that are complete (have all 4 gameweeks or reach target gameweek)
            // This prevents calculating monthly winners for incomplete months
            if (endGW - currentGW + 1 >= 4 || endGW === targetGameweek) {
            months.push({
                name: monthNames[monthIndex],
                startGW: currentGW,
                    endGW: endGW,
                    isComplete: endGW - currentGW + 1 >= 4
            });
            }
            
            currentGW = endGW + 1;
            monthIndex++;
        }
        
        return months;
    }

    // Calculate who owes what payments (only pay when you lose to weekly/monthly winners)
    calculateOutstandingPayments(managerEarnings, weeklyWinners, monthlyWinners) {
        const payments = new Map();
        
        // Initialize all managers with zero balances
        if (dataManager && dataManager.gameweekData.size > 0) {
            const firstGameweek = dataManager.gameweekData.values().next().value;
            if (firstGameweek && firstGameweek.standings) {
                firstGameweek.standings.forEach(manager => {
                    const managerName = manager.manager || manager.teamName;
                    payments.set(managerName, {
                        totalOwed: 0,
                        totalEarned: managerEarnings.get(managerName) || 0,
                        weeklyLosses: 0,
                        monthlyLosses: 0,
                        netBalance: 0,
                        status: 'even'
                    });
                });
            }
        }
        
        // Calculate what each manager owes for weekly losses
        weeklyWinners.forEach(winner => {
            payments.forEach((payment, manager) => {
                if (manager !== winner.manager) {
                    payment.totalOwed += this.weeklyWinnerAmount;
                    payment.weeklyLosses += this.weeklyWinnerAmount;
                }
            });
        });
        
        // Calculate what each manager owes for monthly losses (only paid at end of month)
        monthlyWinners.forEach(winner => {
            payments.forEach((payment, manager) => {
                if (manager !== winner.manager) {
                    payment.totalOwed += this.monthlyWinnerAmount;
                    payment.monthlyLosses += this.monthlyWinnerAmount;
                }
            });
        });
        
        // Calculate net balances and statuses
        payments.forEach((payment, manager) => {
            payment.netBalance = payment.totalEarned - payment.totalOwed;
            payment.status = payment.netBalance > 0 ? 'credit' : 
                            payment.netBalance < 0 ? 'debt' : 'even';
        });
        
        return payments;
    }

    // Calculate final season payouts (60%/30%/10% split of $420 league pot)
    calculateFinalPayouts(leaderboard, leaguePot) {
        if (!leaderboard || leaderboard.length < 3) {
            return {
                first: { manager: 'TBD', payout: Math.round(leaguePot * this.finalPayoutPercentages.first) },
                second: { manager: 'TBD', payout: Math.round(leaguePot * this.finalPayoutPercentages.second) },
                third: { manager: 'TBD', payout: Math.round(leaguePot * this.finalPayoutPercentages.third) }
            };
        }

        // Sort by total points (leaderboard should already be sorted)
        const sortedLeaderboard = [...leaderboard].sort((a, b) => (parseInt(b.points) || 0) - (parseInt(a.points) || 0));

        return {
            first: { 
                manager: sortedLeaderboard[0]?.manager || sortedLeaderboard[0]?.teamName || 'TBD', 
                teamName: sortedLeaderboard[0]?.teamName || 'TBD',
                payout: Math.round(leaguePot * this.finalPayoutPercentages.first) 
            },
            second: { 
                manager: sortedLeaderboard[1]?.manager || sortedLeaderboard[1]?.teamName || 'TBD', 
                teamName: sortedLeaderboard[1]?.teamName || 'TBD',
                payout: Math.round(leaguePot * this.finalPayoutPercentages.second) 
            },
            third: { 
                manager: sortedLeaderboard[2]?.manager || sortedLeaderboard[2]?.teamName || 'TBD', 
                teamName: sortedLeaderboard[2]?.teamName || 'TBD',
                payout: Math.round(leaguePot * this.finalPayoutPercentages.third) 
            }
        };
    }

    // Get empty earnings structure
    getEmptyEarnings() {
        return {
            totalPool: 0,
            weeklyWinners: [],
            monthlyWinners: [],
            totalWeeklyPayout: 0,
            totalMonthlyPayout: 0,
            managerEarnings: new Map(),
            outstandingPayments: new Map(),
            finalPayouts: null
        };
    }
}

// Global prize pool manager
let prizePoolManager = new PrizePoolManager();

// Populate Prize Pool section
function populatePrizePool() {
    if (!dataManager) {
        console.warn('Prize pool: Data manager not ready');
        return;
    }

    const targetGameweek = dashboardData.currentGameweek || 1;
    
    // Use the current live leaderboard for final payouts (already sorted and up-to-date)
    let liveLeaderboard = dashboardData.leaderboard || [];
    
    // Ensure we have the most current data by refreshing from the data manager
    if (dataManager && liveLeaderboard.length > 0) {
        // Map the current leaderboard to include all necessary fields for final payouts
        liveLeaderboard = liveLeaderboard.map(leaderboardTeam => {
            // Get the current team data from the data manager
            const currentTeamData = dataManager.getCurrentGameweekData()?.draft?.teams?.find(
                team => team.teamName === leaderboardTeam.teamName
            );
            
            return {
                ...leaderboardTeam,
                manager: leaderboardTeam.manager || getManagerFromTeamName(leaderboardTeam.teamName),
                teamName: leaderboardTeam.teamName,
                points: leaderboardTeam.totalLeaguePoints || 0,
                gwPoints: leaderboardTeam.totalGWPoints || 0
            };
        });
        
        // Sort by total league points (highest first), then by total GW points as tiebreaker
        liveLeaderboard.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            // If league points are equal, sort by total GW points (FPL points) as tiebreaker
            if (b.gwPoints !== a.gwPoints) {
                return b.gwPoints - a.gwPoints;
            }
            // If both are equal, maintain current order
            return 0;
        });
        
        // Update positions after sorting
        liveLeaderboard.forEach((leaderboardTeam, index) => {
            leaderboardTeam.position = index + 1;
        });
        
        console.log('🏆 Live leaderboard for final payouts:', liveLeaderboard.map(team => 
            `${team.position}. ${team.manager} (${team.teamName}) - ${team.points} LP, ${team.gwPoints} GW pts`
        ));
    }
    
    // Calculate earnings with live leaderboard for final payouts
    const earnings = prizePoolManager.calculateEarningsUpToGameweek(targetGameweek);
    
    // Override final payouts with live data
    earnings.finalPayouts = prizePoolManager.calculateFinalPayouts(liveLeaderboard, prizePoolManager.leaguePot);
    
    console.log(`💰 Prize pool calculated for GW1-${targetGameweek}:`, earnings);

    // Update overview stats
    updatePrizePoolStats(earnings, targetGameweek);
    
    // Populate weekly winners table
    populateWeeklyWinnersTable(earnings.weeklyWinners);
    
    // Populate monthly winners table
    populateMonthlyWinnersTable(earnings.monthlyWinners);
    
    // Populate payment summary
    populatePaymentSummary(earnings.managerEarnings, earnings.outstandingPayments);
    
    // Populate final payouts
    populateFinalPayouts(earnings.finalPayouts);
}

// Update prize pool statistics
function updatePrizePoolStats(earnings, targetGameweek) {
    // Overview stat
    const overviewElement = document.getElementById('overview-prize-pool');
    if (overviewElement) {
        overviewElement.textContent = `$${earnings.totalPool}`;
    }

    // Finance section stats
    const totalPoolElement = document.getElementById('total-pool-amount');
    const weeklyPoolElement = document.getElementById('weekly-pool-amount');
    const monthlyPoolElement = document.getElementById('monthly-pool-amount');
    const totalIndicator = document.getElementById('total-pool-indicator');

    if (totalPoolElement) totalPoolElement.textContent = `$${earnings.totalPool}`;
    if (weeklyPoolElement) {
        // Calculate cumulative weekly winnings up to selected gameweek
        const currentGameweek = dashboardData.currentGameweek || 1;
        let totalWeeklyWinnings = 0;
        
        if (dataManager) {
            for (let gw = 1; gw <= currentGameweek; gw++) {
                const gwData = dataManager.getGameweekData(gw);
                if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                    // Find weekly winner for this gameweek
                    let highestScore = 0;
                    let weeklyWinner = null;
                    
                    gwData.finalResults.forEach(result => {
                        const homeScore = result.homeScore || 0;
                        const awayScore = result.awayScore || 0;
                        const maxScore = Math.max(homeScore, awayScore);
                        
                        if (maxScore > highestScore) {
                            highestScore = maxScore;
                            weeklyWinner = result;
                        }
                    });
                    
                    if (weeklyWinner) {
                        const totalManagers = dashboardData.leaderboard.length;
                        const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                        totalWeeklyWinnings += weeklyWinnings;
                    }
                }
            }
        }
        
        weeklyPoolElement.textContent = `$${totalWeeklyWinnings}`;
    }
    if (monthlyPoolElement) monthlyPoolElement.textContent = `$${earnings.totalMonthlyPayout}`;
    // Keep badge label static as "$MONEY"
    if (totalIndicator) totalIndicator.textContent = '$MONEY';

    // Calculate total winnings (so far) - cumulative up to selected gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    let totalWeeklyWinnings = 0;
    
    if (dataManager) {
        // Loop through all gameweeks from GW1 to selected gameweek
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const gwData = dataManager.getGameweekData(gw);
            if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                // Find the weekly winner for this gameweek
                let highestScore = 0;
                let weeklyWinner = null;
                
                gwData.finalResults.forEach(result => {
                    const homeScore = result.homeScore || 0;
                    const awayScore = result.awayScore || 0;
                    const maxScore = Math.max(homeScore, awayScore);
                    
                    if (maxScore > highestScore) {
                        highestScore = maxScore;
                        weeklyWinner = result;
                    }
                });
                
                if (weeklyWinner) {
                    const totalManagers = dashboardData.leaderboard.length;
                    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                    totalWeeklyWinnings += weeklyWinnings;
                }
            }
        }
    }
    
    const totalMonthlyWinnings = earnings.monthlyWinners.reduce((sum, winner) => sum + (winner.winnings || 0), 0);
    const leaguePotWinnings = 0; // $0 during season, $420 at end ($35 entry fee * 12 managers)
    const totalWinnings = totalWeeklyWinnings + totalMonthlyWinnings + leaguePotWinnings;

    // Update total winnings section
    const totalWinningsElement = document.getElementById('total-winnings');
    const totalWeeklyWinningsElement = document.getElementById('total-weekly-winnings');
    const totalMonthlyWinningsElement = document.getElementById('total-monthly-winnings');
    const leaguePotElement = document.getElementById('league-pot');

    if (totalWinningsElement) totalWinningsElement.textContent = `$${totalWinnings}`;
    if (totalWeeklyWinningsElement) totalWeeklyWinningsElement.textContent = `$${totalWeeklyWinnings}`;
    if (totalMonthlyWinningsElement) totalMonthlyWinningsElement.textContent = `$${totalMonthlyWinnings}`;
    if (leaguePotElement) leaguePotElement.textContent = `$${leaguePotWinnings}`;

    // Breakdown descriptions
    const poolBreakdown = document.getElementById('pool-breakdown');
    const weeklyBreakdown = document.getElementById('weekly-breakdown');
    const monthlyBreakdown = document.getElementById('monthly-breakdown');

    if (poolBreakdown) poolBreakdown.textContent = `Through GW${targetGameweek}`;
    if (weeklyBreakdown) weeklyBreakdown.textContent = `${dashboardData.weeklyWinnings ? dashboardData.weeklyWinnings.length : 0} weeks`;
    if (monthlyBreakdown) monthlyBreakdown.textContent = `${earnings.monthlyWinners.length} months`;
    
    // Populate top earners leaderboard
    populateTopEarnersLeaderboard();
    
    // Display outstanding payments
    displayOutstandingPayments();
}

// Populate weekly winners table
function populateWeeklyWinnersTable(weeklyWinners) {
    const tbody = document.getElementById('weekly-winners-table');
    if (!tbody) return;

    // Calculate cumulative weekly winners up to the selected gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    let cumulativeWeeklyWinners = [];
    
    if (dataManager) {
        // Loop through all gameweeks from GW1 to selected gameweek
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const gwData = dataManager.getGameweekData(gw);
            if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                // Find the weekly winner for this gameweek
                let highestScore = 0;
                let weeklyWinner = null;
                
                gwData.finalResults.forEach(result => {
                    const homeScore = result.homeScore || 0;
                    const awayScore = result.awayScore || 0;
                    const maxScore = Math.max(homeScore, awayScore);
                    
                    if (maxScore > highestScore) {
                        highestScore = maxScore;
                        weeklyWinner = result;
                    }
                });
                
                if (weeklyWinner) {
                    const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                        weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                    const winnerScore = Math.max(weeklyWinner.homeScore || 0, weeklyWinner.awayScore || 0);
                    
                    // Find manager name for the winning team
                    let managerName = '';
                    if (weeklyWinner.homeTeam === winnerTeam) {
                        managerName = weeklyWinner.homeManager || winnerTeam;
                    } else {
                        managerName = weeklyWinner.awayManager || winnerTeam;
                    }
                    
                    const totalManagers = dashboardData.leaderboard.length;
                    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                    
                    cumulativeWeeklyWinners.push({
                        gameweek: gw,
                        manager: managerName,
                        winner: winnerTeam,
                        gwPoints: winnerScore,
                        winnings: weeklyWinnings,
                        amount: weeklyWinnings
                    });
                }
            }
        }
    }
    
    if (cumulativeWeeklyWinners.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-white">
                    <i class="fas fa-info-circle text-2xl mb-2"></i>
                    <p>No weekly winners yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = cumulativeWeeklyWinners.map(winner => `
        <tr class="hover:bg-gray-700/30">
            <td class="text-white font-medium">GW${winner.gameweek}</td>
            <td class="text-white">${winner.manager}</td>
            <td class="text-purple-300 font-semibold">${winner.gwPoints} pts</td>
            <td class="text-green-400 font-bold">$${winner.winnings}</td>
        </tr>
    `).join('');
    
    console.log(`💰 Populated ${cumulativeWeeklyWinners.length} cumulative weekly winners up to GW${currentGameweek}`);
}

// Populate monthly winners table
function populateMonthlyWinnersTable(monthlyWinners) {
    const tbody = document.getElementById('monthly-winners-table');
    if (!tbody) return;

    if (monthlyWinners.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-white">
                    <i class="fas fa-info-circle text-2xl mb-2"></i>
                    <p>No monthly winners yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = monthlyWinners.map(winner => `
        <tr class="hover:bg-gray-700/30">
            <td class="text-white font-medium">${winner.month}</td>
            <td class="text-white">${winner.manager}</td>
            <td class="text-purple-300 font-semibold">${winner.points} pts</td>
            <td class="text-green-400 font-bold">$${winner.winnings}</td>
        </tr>
    `).join('');
}

// Populate payment summary
function populatePaymentSummary(managerEarnings, outstandingPayments) {
    populateTopEarners(managerEarnings);
    populatePaymentDebts(outstandingPayments);
}

// Populate top earners list
function populateTopEarners(managerEarnings) {
    const container = document.getElementById('top-earners-list');
    if (!container) return;

    // Calculate cumulative earnings up to the selected gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    let cumulativeEarnings = new Map();
    
    if (dataManager) {
        // Loop through all gameweeks from GW1 to selected gameweek
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const gwData = dataManager.getGameweekData(gw);
            if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                // Find the weekly winner for this gameweek
                let highestScore = 0;
                let weeklyWinner = null;
                
                gwData.finalResults.forEach(result => {
                    const homeScore = result.homeScore || 0;
                    const awayScore = result.awayScore || 0;
                    const maxScore = Math.max(homeScore, awayScore);
                    
                    if (maxScore > highestScore) {
                        highestScore = maxScore;
                        weeklyWinner = result;
                    }
                });
                
                if (weeklyWinner) {
                    const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                        weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                    
                    // Find manager name for the winning team
                    let managerName = '';
                    if (weeklyWinner.homeTeam === winnerTeam) {
                        managerName = weeklyWinner.homeManager || winnerTeam;
                    } else {
                        managerName = weeklyWinner.awayManager || winnerTeam;
                    }
                    
                    const totalManagers = dashboardData.leaderboard.length;
                    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                    
                    // Add to cumulative earnings
                    const currentEarnings = cumulativeEarnings.get(managerName) || 0;
                    cumulativeEarnings.set(managerName, currentEarnings + weeklyWinnings);
                }
            }
        }
    }
    
    const sortedEarners = Array.from(cumulativeEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedEarners.length === 0) {
        container.innerHTML = '<p class="text-white text-sm">No earnings recorded yet</p>';
        return;
    }

    container.innerHTML = sortedEarners.map(([manager, earnings], index) => `
        <div class="flex justify-between items-center py-2 ${index < sortedEarners.length - 1 ? 'border-b border-gray-600/30' : ''}">
            <div class="flex items-center">
                <span class="text-${index === 0 ? 'yellow' : index === 1 ? 'gray' : index === 2 ? 'orange' : 'gray'}-400 mr-2">
                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                </span>
                <span class="text-white text-sm">${manager}</span>
            </div>
            <span class="text-green-400 font-semibold">$${earnings}</span>
        </div>
    `).join('');
    
    console.log(`💰 Populated top earners with cumulative earnings up to GW${currentGameweek}`);
}

// Populate top earners leaderboard
function populateTopEarnersLeaderboard() {
    const tbody = document.getElementById('top-earners-leaderboard');
    if (!tbody) return;

    // Calculate cumulative earnings up to the selected gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    let cumulativeEarnings = new Map();
    
    if (dataManager) {
        // Loop through all gameweeks from GW1 to selected gameweek
        for (let gw = 1; gw <= currentGameweek; gw++) {
            const gwData = dataManager.getGameweekData(gw);
            if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
                // Find the weekly winner for this gameweek
                let highestScore = 0;
                let weeklyWinner = null;
                
                gwData.finalResults.forEach(result => {
                    const homeScore = result.homeScore || 0;
                    const awayScore = result.awayScore || 0;
                    const maxScore = Math.max(homeScore, awayScore);
                    
                    if (maxScore > highestScore) {
                        highestScore = maxScore;
                        weeklyWinner = result;
                    }
                });
                
                if (weeklyWinner) {
                    const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                        weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                    
                    // Find manager name for the winning team
                    let managerName = '';
                    if (weeklyWinner.homeTeam === winnerTeam) {
                        managerName = weeklyWinner.homeManager || winnerTeam;
                    } else {
                        managerName = weeklyWinner.awayManager || winnerTeam;
                    }
                    
                    const totalManagers = dashboardData.leaderboard.length;
                    const weeklyWinnings = totalManagers - 1; // $1 from each other manager
                    
                    // Add to cumulative earnings
                    const currentEarnings = cumulativeEarnings.get(managerName) || 0;
                    cumulativeEarnings.set(managerName, currentEarnings + weeklyWinnings);
                }
            }
        }
    }
    
    if (cumulativeEarnings.size === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4 text-white">
                    <i class="fas fa-info-circle text-2xl mb-2"></i>
                    <p>No winnings recorded yet</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort managers by cumulative earnings (highest first) and take top 3
    const sortedManagers = Array.from(cumulativeEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    tbody.innerHTML = sortedManagers.map(([manager, winnings], index) => `
        <tr class="hover:bg-gray-700/30">
            <td class="text-center">
                <div class="badge ${index === 0 ? 'badge-warning' : index === 1 ? 'badge-secondary' : 'badge-accent'} gap-1">
                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} ${index + 1}
                </div>
            </td>
            <td class="text-white font-medium">${manager}</td>
            <td class="text-green-400 font-bold">$${winnings}</td>
        </tr>
    `).join('');
    
    console.log(`💰 Populated top earners leaderboard with cumulative earnings up to GW${currentGameweek}`);
}

// Populate payment debts
function populatePaymentDebts(outstandingPayments) {
    const container = document.getElementById('payment-debts-list');
    if (!container) return;

    const debtors = Array.from(outstandingPayments.entries())
        .filter(([_, payment]) => payment.status === 'debt')
        .sort((a, b) => a[1].netBalance - b[1].netBalance); // Most debt first

    if (debtors.length === 0) {
        container.innerHTML = '<p class="text-white text-sm">All payments up to date! 🎉</p>';
        return;
    }

    container.innerHTML = debtors.map(([manager, payment]) => `
        <div class="flex justify-between items-center py-2 border-b border-gray-600/30 last:border-b-0">
            <div>
                <div class="text-white text-sm font-medium">${manager}</div>
                <div class="text-gray-400 text-xs">
                    Weekly: $${payment.weeklyLosses} | Monthly: $${payment.monthlyLosses} | Earned: $${payment.totalEarned}
                </div>
            </div>
            <span class="text-red-400 font-semibold">-$${Math.abs(payment.netBalance)}</span>
        </div>
    `).join('');
}

// Populate final payouts display
function populateFinalPayouts(finalPayouts) {
    if (!finalPayouts) return;
    
    // Update 1st place
    const firstManagerEl = document.getElementById('final-first-manager');
    const firstPayoutEl = document.getElementById('final-first-payout');
    if (firstManagerEl) firstManagerEl.textContent = getManagerFromTeamName(finalPayouts.first.teamName);
    if (firstPayoutEl) firstPayoutEl.textContent = `$${finalPayouts.first.payout}`;
    
    // Update 2nd place
    const secondManagerEl = document.getElementById('final-second-manager');
    const secondPayoutEl = document.getElementById('final-second-payout');
    if (secondManagerEl) secondManagerEl.textContent = getManagerFromTeamName(finalPayouts.second.teamName);
    if (secondPayoutEl) secondPayoutEl.textContent = `$${finalPayouts.second.payout}`;
    
    // Update 3rd place
    const thirdManagerEl = document.getElementById('final-third-manager');
    const thirdPayoutEl = document.getElementById('final-third-payout');
    if (thirdManagerEl) thirdManagerEl.textContent = getManagerFromTeamName(finalPayouts.third.teamName);
    if (thirdPayoutEl) thirdPayoutEl.textContent = `$${finalPayouts.third.payout}`;
}

// Populate player movement section
function populatePlayerMovement() {
    console.log('🔄 Populating player movement...');
    
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    const selectedGameweek = dashboardData.currentGameweek || 1;
    
    // Filter transfers by selected gameweek
    const filteredFreeAgents = transferHistory.freeAgents.filter(move => parseInt(move.GW) === selectedGameweek);
    const filteredWaivers = transferHistory.waivers.filter(move => parseInt(move.GW) === selectedGameweek);
    const filteredTrades = transferHistory.trades.filter(trade => parseInt(trade.GW) === selectedGameweek);
    
    // Populate each section with filtered data
    populateFreeAgentsTable(filteredFreeAgents);
    populateWaiversTable(filteredWaivers);
    populateTradesTable(filteredTrades);
    
    // Show/hide empty message based on filtered data
    const totalMovements = filteredFreeAgents.length + filteredWaivers.length + filteredTrades.length;
    const emptyMessage = document.getElementById('no-movements-message');
    if (emptyMessage) {
        emptyMessage.classList.toggle('hidden', totalMovements > 0);
    }
    
    console.log(`✅ Populated ${totalMovements} player movements for GW${selectedGameweek}`);
}

// Populate free agents table
function populateFreeAgentsTable(freeAgents) {
    const tbody = document.getElementById('free-agents-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!freeAgents || freeAgents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-gray-400">
                    <i class="fas fa-info-circle mr-2"></i>
                    No free agent signings recorded
                </td>
            </tr>
        `;
        return;
    }
    
    freeAgents.forEach(move => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-purple-900/20 text-white';
        
        row.innerHTML = `
            <td class="font-medium">GW${move.GW}</td>
            <td class="font-medium">${move.Manager}</td>
            <td>
                <span class="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs font-medium">
                    <i class="fas fa-plus mr-1"></i>${move.In}
                </span>
            </td>
            <td>
                <span class="bg-red-600/30 text-red-300 px-2 py-1 rounded text-xs font-medium">
                    <i class="fas fa-minus mr-1"></i>${move.Out}
                </span>
            </td>
            <td class="text-sm text-gray-400">${move.Date}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Populate waivers table
function populateWaiversTable(waivers) {
    const tbody = document.getElementById('waivers-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!waivers || waivers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-gray-400">
                    <i class="fas fa-info-circle mr-2"></i>
                    No waiver claims recorded
                </td>
            </tr>
        `;
        return;
    }
    
    waivers.forEach(move => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-purple-900/20 text-white';
        
        row.innerHTML = `
            <td class="font-medium">GW${move.GW}</td>
            <td class="font-medium">${move.Manager}</td>
            <td>
                <span class="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs font-medium">
                    <i class="fas fa-plus mr-1"></i>${move.In}
                </span>
            </td>
            <td>
                <span class="bg-red-600/30 text-red-300 px-2 py-1 rounded text-xs font-medium">
                    <i class="fas fa-minus mr-1"></i>${move.Out}
                </span>
            </td>
            <td>
                <span class="badge ${move.Result === 'Success' ? 'badge-success' : 'badge-error'} badge-sm">
                    ${move.Result.includes('Denied') ? 'Denied' : move.Result}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Populate trades table
function populateTradesTable(trades) {
    const tbody = document.getElementById('trades-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!trades || trades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-gray-400">
                    <i class="fas fa-info-circle mr-2"></i>
                    No trades recorded
                </td>
            </tr>
        `;
        return;
    }
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-purple-900/20 text-white';
        
        row.innerHTML = `
            <td class="font-medium">GW${trade.GW}</td>
            <td class="font-medium">${trade['Offered By']}</td>
            <td class="font-medium">${trade['Offered To']}</td>
            <td>
                <span class="bg-blue-600/30 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                    ${trade.Offered}
                </span>
            </td>
            <td>
                <span class="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs font-medium">
                    ${trade.Requested}
                </span>
            </td>
            <td>
                <span class="badge ${trade.Result === 'Accepted' ? 'badge-success' : 'badge-error'} badge-sm">
                    ${trade.Result}
                </span>
            </td>
            <td class="text-sm text-gray-400">${trade.Date}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Calculate current team composition for a manager at a specific gameweek
function calculateCurrentTeam(teamNameOrManager, targetGameweek = null, managerName = null) {
    const draft = dashboardData.draft || null;
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    // If no target gameweek specified, use the current selected gameweek
    if (!targetGameweek) {
        targetGameweek = dashboardData.currentGameweek || 1;
    }
    
    if (!draft || !draft.teams || !Array.isArray(draft.teams)) {
        console.log(`❌ No draft data available for ${teamNameOrManager}`);
        return [];
    }
    
    // Find manager's team by exact team name match first, then fallbacks
    const managerTeam = draft.teams.find(team => 
        team.teamName === teamNameOrManager ||  // Exact team name match (priority)
        team.manager === teamNameOrManager ||   // Exact manager name match
        (team.manager && team.manager.includes(teamNameOrManager.split(' ')[0])) ||  // Partial manager match
        (team.teamName && team.teamName.toLowerCase() === teamNameOrManager.toLowerCase())  // Case-insensitive exact match
    );
    if (!managerTeam || !managerTeam.draftPicks) {
        console.log(`❌ No team found for ${teamNameOrManager}`);
        console.log(`📋 Available managers:`, draft.teams.map(team => team.manager));
        console.log(`📋 Available team names:`, draft.teams.map(team => team.teamName));
        return [];
    }
    
    // Start with initial draft picks
    let currentSquad = [...managerTeam.draftPicks];
    
    console.log(`📝 Initial squad for ${teamNameOrManager}:`, currentSquad);
    
    // Helper function to check if manager names match
    // Handles both "Harry" and "Harry Liu" formats
    function managerMatches(shortName, fullName) {
        if (!shortName || !fullName) return false;
        
        // Direct match
        if (shortName === fullName) return true;
        
        // Check if the short name is the first word of the full name
        const firstNameFromFull = fullName.trim().split(' ')[0];
        return shortName.trim().toLowerCase() === firstNameFromFull.toLowerCase();
    }
    
    // Apply transfers in the correct order: Trades → Waivers → Free Agents
    // Use the provided manager name or extract it from the team data
    const teamManagerName = managerName || managerTeam.manager || teamNameOrManager;
    console.log(`🏆 DEBUG: teamManagerName set to: "${teamManagerName}" (from managerName: "${managerName}" or managerTeam.manager: "${managerTeam.manager}" or fallback: "${teamNameOrManager}")`);
    
    // 1. Apply accepted trades FIRST (only up to target gameweek)
    console.log(`🏆 DEBUG: Processing ${transferHistory.trades.length} trade transactions for ${teamManagerName} at GW${targetGameweek}`);
    transferHistory.trades.forEach(trade => {
        const tradeGameweek = parseInt(trade.GW) || 1;
        if ((trade.Result === 'Accepted' || trade.Result === 'Processed') && tradeGameweek <= targetGameweek) {
            if (managerMatches(teamManagerName, trade['Offered By'])) {
                // This manager gave away 'Offered' and received 'Requested'
                const outIndex = currentSquad.indexOf(trade.Offered);
            if (outIndex > -1) {
                currentSquad.splice(outIndex, 1);
                    console.log(`➖ Traded away ${trade.Offered} via trade for ${teamManagerName} in GW${tradeGameweek} (matched with ${trade['Offered By']})`);
                } else {
                    console.log(`⚠️ Could not find ${trade.Offered} to remove via trade for ${teamManagerName} in GW${tradeGameweek}`);
                }
                currentSquad.push(trade.Requested);
                console.log(`➕ Received ${trade.Requested} via trade for ${teamManagerName} in GW${tradeGameweek} (matched with ${trade['Offered By']})`);
                console.log(`📊 Squad size after trade: ${currentSquad.length}`);
            } else if (managerMatches(teamManagerName, trade['Offered To'])) {
                // This manager gave away 'Requested' and received 'Offered'
                const outIndex = currentSquad.indexOf(trade.Requested);
                if (outIndex > -1) {
                    currentSquad.splice(outIndex, 1);
                    console.log(`➖ Traded away ${trade.Requested} via trade for ${teamManagerName} in GW${tradeGameweek} (matched with ${trade['Offered To']})`);
                } else {
                    console.log(`⚠️ Could not find ${trade.Requested} to remove via trade for ${teamManagerName} in GW${tradeGameweek}`);
                }
                currentSquad.push(trade.Offered);
                console.log(`➕ Received ${trade.Offered} via trade for ${teamManagerName} in GW${tradeGameweek} (matched with ${trade['Offered To']})`);
                console.log(`📊 Squad size after trade: ${currentSquad.length}`);
            }
        }
    });
    
    // 2. Apply successful waiver transactions SECOND (only up to target gameweek)
    // Note: Denied waivers (Result !== 'Accepted') are never applied to team composition
    console.log(`🏆 DEBUG: Processing ${transferHistory.waivers.length} waiver transactions for ${teamManagerName} at GW${targetGameweek}`);
    transferHistory.waivers.forEach((move, index) => {
        const moveGameweek = parseInt(move.GW) || 1;
        
        
        if (managerMatches(teamManagerName, move.Manager) && move.Result === 'Accepted' && moveGameweek <= targetGameweek) {
            // Remove player out
            const outIndex = currentSquad.indexOf(move.Out);
            if (outIndex > -1) {
                currentSquad.splice(outIndex, 1);
                console.log(`➖ Removed ${move.Out} via waiver for ${teamManagerName} in GW${moveGameweek} (matched with ${move.Manager})`);
            } else {
                console.log(`⚠️ Could not find ${move.Out} to remove via waiver for ${teamManagerName} in GW${moveGameweek}`);
            }
            // Add player in
            currentSquad.push(move.In);
            console.log(`➕ Added ${move.In} via waiver for ${teamManagerName} in GW${moveGameweek} (matched with ${move.Manager})`);
            console.log(`📊 Squad size after waiver move: ${currentSquad.length}`);
        }
    });
    
    // 3. Apply free agent transactions LAST (only up to target gameweek)
    console.log(`🏆 DEBUG: Processing ${transferHistory.freeAgents.length} free agent transactions for ${teamManagerName} at GW${targetGameweek}`);
    transferHistory.freeAgents.forEach(move => {
        const moveGameweek = parseInt(move.GW) || 1;
        if (managerMatches(teamManagerName, move.Manager) && moveGameweek <= targetGameweek) {
            // Remove player out
            const outIndex = currentSquad.indexOf(move.Out);
                if (outIndex > -1) {
                    currentSquad.splice(outIndex, 1);
                console.log(`➖ Removed ${move.Out} for ${teamManagerName} in GW${moveGameweek} (matched with ${move.Manager})`);
            } else {
                console.log(`⚠️ Could not find ${move.Out} to remove for ${teamManagerName} in GW${moveGameweek}`);
            }
            // Add player in
            currentSquad.push(move.In);
            console.log(`➕ Added ${move.In} for ${teamManagerName} in GW${moveGameweek} (matched with ${move.Manager})`);
            console.log(`📊 Squad size after free agent move: ${currentSquad.length}`);
        }
    });
    
    console.log(`✅ Final squad for ${teamManagerName} at GW${targetGameweek}:`, currentSquad);
    return currentSquad;
}

// Show/hide movement type sections
function showMovementType(type) {
    // Get section elements
    const freeAgentsSection = document.getElementById('free-agents-section');
    const waiversSection = document.getElementById('waivers-section');
    const tradesSection = document.getElementById('trades-section');
    
    // Get tab elements
    const allMovementsTab = document.getElementById('all-movements-tab');
    const freeAgentsTab = document.getElementById('free-agents-tab');
    const waiversTab = document.getElementById('waivers-tab');
    const tradesTab = document.getElementById('trades-tab');
    
    // Update tab states (with null checks)
    if (allMovementsTab) allMovementsTab.classList.remove('tab-active');
    if (freeAgentsTab) freeAgentsTab.classList.remove('tab-active');
    if (waiversTab) waiversTab.classList.remove('tab-active');
    if (tradesTab) tradesTab.classList.remove('tab-active');
    
    // Activate the correct tab
    if (type === 'all' && allMovementsTab) {
        allMovementsTab.classList.add('tab-active');
    } else if (type === 'freeAgents' && freeAgentsTab) {
        freeAgentsTab.classList.add('tab-active');
    } else if (type === 'waivers' && waiversTab) {
        waiversTab.classList.add('tab-active');
    } else if (type === 'trades' && tradesTab) {
        tradesTab.classList.add('tab-active');
    }
    
    // Show/hide sections (with null checks)
    if (type === 'all') {
        if (freeAgentsSection) freeAgentsSection.classList.remove('hidden');
        if (waiversSection) waiversSection.classList.remove('hidden');
        if (tradesSection) tradesSection.classList.remove('hidden');
    } else {
        if (freeAgentsSection) freeAgentsSection.classList.toggle('hidden', type !== 'freeAgents');
        if (waiversSection) waiversSection.classList.toggle('hidden', type !== 'waivers');
        if (tradesSection) tradesSection.classList.toggle('hidden', type !== 'trades');
    }
}

// Transfer Activity Analysis
function analyzeTransferActivity() {
    const container = document.getElementById('transfer-activity-analysis');
    if (!container) return;
    
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    // Calculate transfer metrics
    const totalTransfers = transferHistory.freeAgents.length + transferHistory.waivers.length + transferHistory.trades.length;
    const freeAgentCount = transferHistory.freeAgents.length;
    const waiverCount = transferHistory.waivers.length;
    const tradeCount = transferHistory.trades.length;
    
    // Manager activity ranking
    const managerActivity = {};
    
    // Count free agent activity
    transferHistory.freeAgents.forEach(move => {
        const manager = move.Manager;
        if (manager) {
            managerActivity[manager] = (managerActivity[manager] || 0) + 1;
        }
    });
    
    // Count waiver activity
    transferHistory.waivers.forEach(move => {
        const manager = move.Manager;
        if (manager) {
            managerActivity[manager] = (managerActivity[manager] || 0) + 1;
        }
    });
    
    // Count trade activity (both offering and receiving)
    transferHistory.trades.forEach(trade => {
        const offeredBy = trade['Offered By'];
        const offeredTo = trade['Offered To'];
        if (offeredBy) managerActivity[offeredBy] = (managerActivity[offeredBy] || 0) + 1;
        if (offeredTo) managerActivity[offeredTo] = (managerActivity[offeredTo] || 0) + 1;
    });
    
    // Find most and least active managers
    const sortedActivity = Object.entries(managerActivity)
        .sort(([,a], [,b]) => b - a);
    
    const mostActive = sortedActivity[0] || ['No activity', 0];
    const leastActive = sortedActivity[sortedActivity.length - 1] || ['No activity', 0];
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-gray-700/50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-400">${totalTransfers}</div>
                    <div class="text-xs text-white">Total Moves</div>
                </div>
                <div class="bg-gray-700/50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-400">${freeAgentCount}</div>
                    <div class="text-xs text-white">Free Agents</div>
                </div>
                <div class="bg-gray-700/50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-yellow-400">${waiverCount}</div>
                    <div class="text-xs text-white">Waivers</div>
                </div>
                <div class="bg-gray-700/50 p-3 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-400">${tradeCount}</div>
                    <div class="text-xs text-white">Trades</div>
                </div>
            </div>
            
            ${sortedActivity.length > 0 ? `
                <div class="space-y-2">
                    <div class="flex justify-between items-center p-2 bg-green-600/20 rounded">
                        <span class="text-white font-medium">Most Active:</span>
                        <span class="text-green-400">${mostActive[0]} (${mostActive[1]} moves)</span>
                    </div>
                    ${sortedActivity.length > 1 ? `
                        <div class="flex justify-between items-center p-2 bg-red-600/20 rounded">
                            <span class="text-white font-medium">Least Active:</span>
                            <span class="text-red-400">${leastActive[0]} (${leastActive[1]} moves)</span>
                        </div>
                    ` : ''}
                </div>
            ` : '<p class="text-gray-400 text-center">No transfer activity recorded</p>'}
        </div>
    `;
}

// Player Popularity Analysis  
function analyzePlayerPopularity() {
    const container = document.getElementById('player-popularity-analysis');
    if (!container) return;
    
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    // Track players coming in vs going out
    const playersIn = {};
    const playersOut = {};
    
    // Analyze free agents
    transferHistory.freeAgents.forEach(move => {
        if (move.In) playersIn[move.In] = (playersIn[move.In] || 0) + 1;
        if (move.Out) playersOut[move.Out] = (playersOut[move.Out] || 0) + 1;
    });
    
    // Analyze successful waivers
    transferHistory.waivers.forEach(move => {
        if (move.Result === 'Success' && move.In) {
            playersIn[move.In] = (playersIn[move.In] || 0) + 1;
        }
        if (move.Result === 'Success' && move.Out) {
            playersOut[move.Out] = (playersOut[move.Out] || 0) + 1;
        }
    });
    
    // Analyze trades
    transferHistory.trades.forEach(trade => {
        if (trade.Result === 'Accepted') {
            if (trade.Offered) playersIn[trade.Offered] = (playersIn[trade.Offered] || 0) + 1;
            if (trade.Requested) playersIn[trade.Requested] = (playersIn[trade.Requested] || 0) + 1;
        }
    });
    
    // Get top targets and most dropped
    const topTargets = Object.entries(playersIn)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    const mostDropped = Object.entries(playersOut)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    container.innerHTML = `
        <div class="space-y-4">
            ${topTargets.length > 0 ? `
                <div>
                    <h4 class="text-sm font-semibold text-green-400 mb-2">🎯 Most Wanted</h4>
                    <div class="space-y-1">
                        ${topTargets.map(([player, count]) => `
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-white">${player}</span>
                                <span class="bg-green-600/30 text-green-300 px-2 py-1 rounded text-xs">${count} transfer${count > 1 ? 's' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${mostDropped.length > 0 ? `
                <div>
                    <h4 class="text-sm font-semibold text-red-400 mb-2">📉 Most Dropped</h4>
                    <div class="space-y-1">
                        ${mostDropped.map(([player, count]) => `
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-white">${player}</span>
                                <span class="bg-red-600/30 text-red-300 px-2 py-1 rounded text-xs">${count} drop${count > 1 ? 's' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${topTargets.length === 0 && mostDropped.length === 0 ? 
                '<p class="text-gray-400 text-center">No transfer data available yet</p>' : ''}
        </div>
    `;
}

// Manager Behavior Analysis
function analyzeManagerBehavior() {
    const container = document.getElementById('manager-behavior-analysis');
    if (!container) return;
    
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    // Analyze manager patterns
    const managerProfiles = {};
    
    // Helper function to get short manager name
    function getShortName(fullName) {
        if (!fullName) return 'Unknown';
        return fullName.split(' ')[0];
    }
    
    // Analyze free agent behavior
    transferHistory.freeAgents.forEach(move => {
        const manager = getShortName(move.Manager);
        if (!managerProfiles[manager]) {
            managerProfiles[manager] = {
                freeAgents: 0,
                waivers: 0,
                trades: 0,
                totalMoves: 0,
                preferredMethod: 'free_agents'
            };
        }
        managerProfiles[manager].freeAgents++;
        managerProfiles[manager].totalMoves++;
    });
    
    // Analyze waiver behavior
    transferHistory.waivers.forEach(move => {
        const manager = getShortName(move.Manager);
        if (!managerProfiles[manager]) {
            managerProfiles[manager] = {
                freeAgents: 0,
                waivers: 0,
                trades: 0,
                totalMoves: 0,
                preferredMethod: 'waivers'
            };
        }
        managerProfiles[manager].waivers++;
        managerProfiles[manager].totalMoves++;
    });
    
    // Analyze trade behavior
    transferHistory.trades.forEach(trade => {
        const offeredBy = getShortName(trade['Offered By']);
        const offeredTo = getShortName(trade['Offered To']);
        
        [offeredBy, offeredTo].forEach(manager => {
            if (!managerProfiles[manager]) {
                managerProfiles[manager] = {
                    freeAgents: 0,
                    waivers: 0,
                    trades: 0,
                    totalMoves: 0,
                    preferredMethod: 'trades'
                };
            }
            managerProfiles[manager].trades++;
            managerProfiles[manager].totalMoves++;
        });
    });
    
    // Determine manager archetypes
    Object.keys(managerProfiles).forEach(manager => {
        const profile = managerProfiles[manager];
        
        // Determine preferred method
        if (profile.freeAgents >= profile.waivers && profile.freeAgents >= profile.trades) {
            profile.preferredMethod = 'free_agents';
            profile.archetype = '🆓 Free Agent Hunter';
        } else if (profile.waivers >= profile.trades) {
            profile.preferredMethod = 'waivers';
            profile.archetype = '⚡ Waiver Wire Warrior';
        } else {
            profile.preferredMethod = 'trades';
            profile.archetype = '🤝 Trade Negotiator';
        }
        
        // Activity level
        if (profile.totalMoves === 0) {
            profile.activityLevel = 'Inactive';
        } else if (profile.totalMoves <= 2) {
            profile.activityLevel = 'Conservative';
        } else if (profile.totalMoves <= 5) {
            profile.activityLevel = 'Active';
        } else {
            profile.activityLevel = 'Hyperactive';
        }
    });
    
    // Sort by total activity
    const sortedManagers = Object.entries(managerProfiles)
        .sort(([,a], [,b]) => b.totalMoves - a.totalMoves)
        .slice(0, 6);
    
    container.innerHTML = `
        <div class="space-y-3">
            ${sortedManagers.length > 0 ? 
                sortedManagers.map(([manager, profile]) => `
                    <div class="bg-gray-700/50 p-3 rounded-lg">
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-medium text-white">${manager}</span>
                            <span class="text-xs text-gray-400">${profile.activityLevel}</span>
                        </div>
                        <div class="text-sm text-purple-400 mb-2">${profile.archetype}</div>
                        <div class="grid grid-cols-3 gap-2 text-xs">
                            <div class="text-center">
                                <div class="text-blue-400 font-bold">${profile.freeAgents}</div>
                                <div class="text-gray-400">Free</div>
                            </div>
                            <div class="text-center">
                                <div class="text-yellow-400 font-bold">${profile.waivers}</div>
                                <div class="text-gray-400">Waiver</div>
                            </div>
                            <div class="text-center">
                                <div class="text-green-400 font-bold">${profile.trades}</div>
                                <div class="text-gray-400">Trade</div>
                            </div>
                        </div>
                    </div>
                `).join('') :
                '<p class="text-gray-400 text-center">No manager activity data available</p>'
            }
        </div>
    `;
}

// Make functions globally accessible for HTML onclick handlers
window.showMovementType = showMovementType;

// Initialize loading states
document.addEventListener('DOMContentLoaded', addLoadingStates);

// Calculate form from actual gameweek results in chronological order
function calculateFormFromResults(teamName) {
    if (!dataManager) return 'N/A';
    
    const results = dataManager.getResults();
    if (!results || results.length === 0) return 'N/A';
    
    // Get all results for this team and sort by gameweek
    const teamResults = results.filter(result => 
        result.homeTeam === teamName || result.awayTeam === teamName
    );
    
    // Also check for current gameweek partial results if we're in the middle of a gameweek
    const currentGameweek = dashboardData.currentGameweek || 1;
    const currentGwData = dataManager.getGameweekData(currentGameweek);
    
    if (currentGwData && currentGwData.partialResults && currentGwData.partialResults.length > 0) {
        // Find current gameweek partial result for this team
        const currentResult = currentGwData.partialResults.find(result => 
            result.homeTeam === teamName || result.awayTeam === teamName
        );
        
        if (currentResult) {
            // Add current gameweek result to the list (it will be the most recent)
            teamResults.push(currentResult);
        }
    }
    
    if (teamResults.length === 0) return 'N/A';
    
    // Build form string from actual results (most recent last)
    const formResults = [];
    teamResults.forEach(result => {
        if (result.homeTeam === teamName) {
            // Team is home
            if (result.homeScore > result.awayScore) {
                formResults.push('W');
            } else if (result.homeScore < result.awayScore) {
                formResults.push('L');
            } else {
                formResults.push('D');
            }
        } else {
            // Team is away
            if (result.awayScore > result.homeScore) {
                formResults.push('W');
            } else if (result.awayScore < result.homeScore) {
                formResults.push('L');
            } else {
                formResults.push('D');
            }
        }
    });
    
    // Take the last 5 results (most recent form) - most recent will be on the right
    const recentForm = formResults.slice(-5);
    return recentForm.length > 0 ? recentForm.join('-') : 'N/A';
}

// Track weekly winners with dates for outstanding payments
function trackWeeklyWinnerWithDate(gameweek, winnerManager, winnerGwPoints, date) {
    if (!dashboardData.weeklyWinnersWithDates) {
        dashboardData.weeklyWinnersWithDates = [];
    }
    
    // Parse the date to get month
    const month = getMonthFromDate(date);
    
    dashboardData.weeklyWinnersWithDates.push({
        gameweek,
        winner: winnerManager,
        gwPoints: winnerGwPoints,
        date,
        month
    });
}

// Get month from date string (e.g., "Gameweek 1 - Day 1" -> "August")
function getMonthFromDate(dateString) {
    // Extract gameweek number
    const match = dateString.match(/Gameweek (\d+)/);
    if (match) {
        const gw = parseInt(match[1]);
        
        // Correct Premier League 2025/26 season mapping
        if (gw <= 3) return 'August';        // GW1-3: Aug 15-31
        if (gw <= 6) return 'September';     // GW4-6: Sep 13-28
        if (gw <= 10) return 'October';      // GW7-10: Oct 4-25
        if (gw <= 14) return 'November';     // GW11-14: Nov 8-29
        if (gw <= 18) return 'December';     // GW15-18: Dec 3-27
        if (gw <= 22) return 'January';      // GW19-22: Dec 30-Jan 17
        if (gw <= 26) return 'February';     // GW23-26: Jan 24-Feb 11
        if (gw <= 30) return 'March';        // GW27-30: Feb 21-Mar 14
        if (gw <= 34) return 'April';        // GW31-34: Mar 21-Apr 25
        if (gw <= 38) return 'May';          // GW35-38: May 2-24
    }
    
    return 'Unknown Month';
}

// Get month from gameweek number
function getMonthFromGameweek(gameweek) {
    // Correct Premier League 2025/26 season mapping
    if (gameweek <= 3) return 'August';        // GW1-3: Aug 15-31
    if (gameweek <= 6) return 'September';     // GW4-6: Sep 13-28
    if (gameweek <= 10) return 'October';      // GW7-10: Oct 4-25
    if (gameweek <= 14) return 'November';     // GW11-14: Nov 8-29
    if (gameweek <= 18) return 'December';     // GW15-18: Dec 3-27
    if (gameweek <= 22) return 'January';      // GW19-22: Dec 30-Jan 17
    if (gameweek <= 26) return 'February';     // GW23-26: Jan 24-Feb 11
    if (gameweek <= 30) return 'March';        // GW27-30: Feb 21-Mar 14
    if (gameweek <= 34) return 'April';        // GW31-34: Mar 21-Apr 25
    if (gameweek <= 38) return 'May';          // GW35-38: May 2-24
    
    return 'Unknown Month';
}

// Calculate outstanding payments by month - cumulative up to selected gameweek
function calculateOutstandingPayments() {
    const currentGameweek = dashboardData.currentGameweek || 1;
    const monthlyPayments = {};
    const allManagers = getUniqueManagers();
    
    if (!dataManager) {
        return {};
    }
    
    // Loop through all gameweeks from GW1 to selected gameweek
    for (let gw = 1; gw <= currentGameweek; gw++) {
        const gwData = dataManager.getGameweekData(gw);
        if (gwData && gwData.finalResults && gwData.finalResults.length > 0) {
            // Find the weekly winner for this gameweek
            let highestScore = 0;
            let weeklyWinner = null;
            
            gwData.finalResults.forEach(result => {
                const homeScore = result.homeScore || 0;
                const awayScore = result.awayScore || 0;
                const maxScore = Math.max(homeScore, awayScore);
                
                if (maxScore > highestScore) {
                    highestScore = maxScore;
                    weeklyWinner = result;
                }
            });
            
            if (weeklyWinner) {
                const winnerTeam = weeklyWinner.homeScore > weeklyWinner.awayScore ? 
                    weeklyWinner.homeTeam : weeklyWinner.awayTeam;
                const winnerScore = Math.max(weeklyWinner.homeScore || 0, weeklyWinner.awayScore || 0);
                
                // Find manager name for the winning team
                let managerName = '';
                if (weeklyWinner.homeTeam === winnerTeam) {
                    managerName = weeklyWinner.homeManager || winnerTeam;
                } else {
                    managerName = weeklyWinner.awayManager || winnerTeam;
                }
                
                // Determine month from gameweek (simplified logic)
                let month = 'August'; // Default
                if (gw <= 4) month = 'August';
                else if (gw <= 8) month = 'September';
                else if (gw <= 12) month = 'October';
                else if (gw <= 16) month = 'November';
                else if (gw <= 20) month = 'December';
                else if (gw <= 24) month = 'January';
                else if (gw <= 28) month = 'February';
                else if (gw <= 32) month = 'March';
                else if (gw <= 36) month = 'April';
                else month = 'May';
                
                // Initialize month structure if not exists
                if (!monthlyPayments[month]) {
                    monthlyPayments[month] = {
                        winners: [],
                        debts: {}
                    };
                    // Initialize debt tracking for all managers
                    allManagers.forEach(manager => {
                        monthlyPayments[month].debts[manager] = 0;
                    });
                }
                
                // Add winner to month
                monthlyPayments[month].winners.push({
                    gameweek: gw,
                    winner: managerName,
                    gwPoints: winnerScore,
                    month: month
                });
                
                // Calculate debts: all other managers owe $1 to the winner
                allManagers.forEach(manager => {
                    if (manager !== managerName) {
                        monthlyPayments[month].debts[manager] += 1;
                    }
                });
            }
        }
    }
    
    return monthlyPayments;
}

// Get unique managers from the league
function getUniqueManagers() {
    const managers = new Set();
    
    // Add managers from weekly winners
    if (dashboardData.weeklyWinnersWithDates) {
        dashboardData.weeklyWinnersWithDates.forEach(winner => {
            managers.add(winner.winner);
        });
    }
    
    // Add managers from leaderboard if available
    if (dashboardData.leaderboard) {
        dashboardData.leaderboard.forEach(team => {
            if (team.manager) managers.add(team.manager);
        });
    }
    
    // Add managers from draft data if available
    if (dashboardData.draft && dashboardData.draft.teams) {
        dashboardData.draft.teams.forEach(team => {
            if (team.manager) managers.add(team.manager);
        });
    }
    
    return Array.from(managers);
}

// Display outstanding payments
function displayOutstandingPayments() {
    const container = document.getElementById('outstanding-payments-container');
    if (!container) return;
    
    const monthlyPayments = calculateOutstandingPayments();
    
    if (Object.keys(monthlyPayments).length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-white">
                <i class="fas fa-info-circle text-2xl mb-2"></i>
                <p>No outstanding payments yet</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Sort months chronologically
    const monthOrder = ['August', 'September', 'October', 'November', 'December', 
                       'January', 'February', 'March', 'April', 'May'];
    
    monthOrder.forEach(month => {
        if (monthlyPayments[month]) {
            const monthData = monthlyPayments[month];
            const totalDebt = Object.values(monthData.debts).reduce((sum, debt) => sum + debt, 0);
            
            if (totalDebt > 0) {
                html += `
                    <div class="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <h5 class="font-semibold text-white mb-2 flex items-center">
                            <i class="fas fa-calendar text-blue-400 mr-2"></i>
                            ${month} Payments Due
                            <span class="badge badge-warning ml-2">$${totalDebt} total</span>
                        </h5>
                        
                        <div class="mb-3">
                            <h6 class="text-sm font-medium text-blue-300 mb-2">Weekly Winners:</h6>
                            <div class="flex flex-wrap gap-2">
                                ${monthData.winners.map(winner => `
                                    <span class="badge badge-success badge-sm">
                                        GW${winner.gameweek}: ${winner.winner} (${winner.gwPoints} pts)
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="overflow-x-auto">
                            <table class="table table-zebra bg-gray-700/50 min-w-max text-xs">
                                <thead>
                                    <tr class="bg-gray-800/90 border-b border-gray-600/50">
                                        <th class="text-white">Manager</th>
                                        <th class="text-white">Owes</th>
                                        <th class="text-white">To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(monthData.debts)
                                        .filter(([manager, debt]) => debt > 0)
                                        .map(([manager, debt]) => `
                                            <tr class="hover:bg-gray-600/30">
                                                <td class="text-white font-medium">${manager}</td>
                                                <td class="text-red-400 font-bold">$${debt}</td>
                                                <td class="text-green-400">
                                                    ${monthData.winners
                                                        .filter(winner => winner.winner !== manager)
                                                        .map(winner => winner.winner)
                                                        .join(', ')}
                                                </td>
                                            </tr>
                                        `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }
        }
    });
    
    container.innerHTML = html;
}