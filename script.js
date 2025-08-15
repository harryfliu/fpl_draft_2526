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
    
    // Get current gameweek data
    const currentData = dataManager.getCurrentGameweekData();
    console.log('🔧 DEBUG: currentData from data manager:', currentData);
    if (currentData) {
        // Update dashboard data
        dashboardData.leaderboard = currentData.draft?.teams || [];
        dashboardData.draft = currentData.draft || null; // Add this line to fix draft picks
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
        
        console.log('📊 Data loaded from data manager');
        console.log('📅 Fixtures data:', currentData.fixtures);
        console.log('📊 Dashboard fixtures:', dashboardData.upcomingFixtures);
    } else {
        console.log('📊 No data available for current gameweek');
    }
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

// Populate leaderboard with DaisyUI styling
function populateLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';
    
    if (dashboardData.leaderboard.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
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
    
    dashboardData.leaderboard.forEach(team => {
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
                        <div class="text-sm text-white">${team.teamName}</div>
                    </div>
                </div>
            </td>
            <td class="text-white">${team.teamName}</td>
            <td>
                <div class="font-bold text-lg text-white">${team.points || 0}</div>
            </td>
            <td>
                <div class="badge badge-outline badge-sm">${team.gwPoints || 0}</div>
            </td>
            <td>
                <div class="flex gap-1">
                    ${(team.form || 'L-L-L-L-L').split('-').map(result => 
                        `<div class="w-2 h-2 rounded-full ${result === 'W' ? 'bg-success' : 'bg-error'}"></div>`
                    ).join('')}
                </div>
            </td>
            <td>
                <div class="badge ${(team.totalWinnings || 0) > 0 ? 'badge-success' : 'badge-ghost'} gap-1">
                    <i class="fas fa-dollar-sign text-xs"></i>
                    ${team.totalWinnings || 0}
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
        html += `
            <div class="card bg-base-200 shadow-sm">
                <div class="card-body p-4">
                    <h3 class="card-title text-lg font-semibold mb-2">${team.teamName}</h3>
                    <p class="text-sm text-white mb-3">${team.manager || 'Unknown Manager'}</p>
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
        1: '<div class="badge badge-warning badge-sm">🥇</div>',
        2: '<div class="badge badge-secondary badge-sm">🥈</div>',
        3: '<div class="badge badge-accent badge-sm">🥉</div>'
    };
    return badges[position] || '';
}

// Helper function to get manager name from team name
function getManagerFromTeamName(teamName) {
    console.log('🔍 Looking up manager for team:', teamName);
    console.log('📊 Leaderboard data:', dashboardData.leaderboard);
    
    if (!dashboardData.leaderboard || dashboardData.leaderboard.length === 0) {
        console.log('❌ No leaderboard data available');
        return 'Unknown Manager';
    }
    
    const team = dashboardData.leaderboard.find(team => team.teamName === teamName);
    console.log('🎯 Found team:', team);
    
    return team ? team.manager : 'Unknown Manager';
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
    
    // Create monthly standings from leaderboard
    dashboardData.monthlyStandings = dashboardData.leaderboard.map(team => ({
        position: team.position,
        manager: team.manager,
        points: team.points || 0,
        winnings: team.totalWinnings || 0
    }));
    
    dashboardData.monthlyStandings.forEach(standing => {
        const standingElement = document.createElement('div');
        standingElement.className = 'card bg-gray-900/90 border border-gray-700/50 text-center shadow-2xl backdrop-blur-sm hover:shadow-purple-500/20 transition-all duration-300';
        
        standingElement.innerHTML = `
            <div class="card-body p-6">
                <div class="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">${standing.position}</div>
                <div class="font-semibold text-white mb-2">${standing.manager}</div>
                <div class="text-sm text-white mb-3">${standing.points} pts</div>
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

    // Get current gameweek's Premier League fixtures
    const currentData = dataManager?.getCurrentGameweekData();
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
                    <p class="text-sm text-white">Add pl_gw${dashboardData.currentGameweek}.csv to display fixtures</p>
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
}

// Update overview stats (Current Month and Weekly Winner)
function updateOverviewStats() {
    // Update Current Month display
    const currentMonthElement = document.getElementById('current-month-display');
    if (currentMonthElement) {
        currentMonthElement.textContent = dashboardData.currentMonth;
        console.log(`📅 Updated Current Month display to: ${dashboardData.currentMonth}`);
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
    
    // Find the selected team
    const selectedTeam = dashboardData.leaderboard.find(team => team.teamName === selectedTeamName);
    if (selectedTeam) {
        displayTeamDetails(selectedTeam);
    }
}

// Display team details
function displayTeamDetails(team) {
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
    
    // Update team stats
    const teamTotalPoints = document.getElementById('team-total-points');
    const teamGWPoints = document.getElementById('team-gw-points');
    const teamForm = document.getElementById('team-form');
    const teamWinnings = document.getElementById('team-winnings');
    
    if (teamTotalPoints) teamTotalPoints.textContent = team.points || 0;
    if (teamGWPoints) teamGWPoints.textContent = team.gwPoints || 0;
    if (teamForm) teamForm.textContent = team.form || 'L-L-L-L-L';
    if (teamWinnings) teamWinnings.textContent = `$${team.totalWinnings || 0}`;
    
    // Update team performance (get from results data)
    const teamStandings = dashboardData.recentStandings.find(standing => standing.teamName === team.teamName);
    const teamWins = document.getElementById('team-wins');
    const teamDraws = document.getElementById('team-draws');
    const teamLosses = document.getElementById('team-losses');
    const teamRank = document.getElementById('team-rank');
    
    if (teamWins) teamWins.textContent = teamStandings?.wins || 0;
    if (teamDraws) teamDraws.textContent = teamStandings?.draws || 0;
    if (teamLosses) teamLosses.textContent = teamStandings?.losses || 0;
    if (teamRank) teamRank.textContent = teamStandings ? `#${teamStandings.rank || team.position}` : `#${team.position}`;
    
    // Update current squad
    displayTeamCurrentSquad(team);
    
    // Update draft picks
    displayTeamDraftPicks(team);
}

// Display team current squad (draft picks + transfers)
function displayTeamCurrentSquad(team) {
    const container = document.getElementById('team-current-squad');
    const emptyMessage = document.getElementById('team-current-squad-empty');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Calculate current squad
    const currentSquad = calculateCurrentTeam(team.manager);
    
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
            option.textContent = `${team.position}. ${team.teamName} (${team.manager})`;
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
}

// Head-to-Head Analysis
function analyzeHeadToHead() {
    const container = document.getElementById('h2h-analysis');
    if (!container) return;
    
    // Since we don't have actual match results yet, we'll analyze potential matchups from fixtures
    const fixtures = dashboardData.upcomingFixtures || [];
    const teams = dashboardData.leaderboard || [];
    
    if (teams.length === 0) {
        container.innerHTML = '<p class="text-white">No team data available</p>';
        return;
    }
    
    // Analyze upcoming rivalries based on current standings
    const topTeam = teams[0];
    const bottomTeam = teams[teams.length - 1];
    const midTableTeams = teams.slice(1, teams.length - 1);
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                    <div class="font-semibold text-green-800">👑 League Leader</div>
                    <div class="text-sm text-green-600">${topTeam.manager} (${topTeam.teamName})</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-green-800">${topTeam.points} pts</div>
                    <div class="text-xs text-green-600">Form: ${topTeam.form || 'W-W-W-W-W'}</div>
                </div>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                    <div class="font-semibold text-red-800">📉 Last Place</div>
                    <div class="text-sm text-red-600">${bottomTeam.manager} (${bottomTeam.teamName})</div>
                </div>
                <div class="text-right">
                    <div class="font-bold text-red-800">${bottomTeam.points} pts</div>
                    <div class="text-xs text-red-600">Gap: -${topTeam.points - bottomTeam.points} pts</div>
                </div>
            </div>
            
            <div class="text-xs text-white mt-2">
                ${teams.length} managers • Point gap: ${topTeam.points - bottomTeam.points} points
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
    
    const teams = dashboardData.leaderboard || [];
    
    if (!Array.isArray(teams) || teams.length === 0) {
        container.innerHTML = '<p class="text-white">No team data available</p>';
        return;
    }
    
    // Analyze form strings to determine consistency
    const consistencyRankings = teams.map(team => {
        const form = team.form || 'W-W-W-W-W';
        const formArray = form.split('-');
        
        // Calculate consistency score (more varied = less consistent)
        const unique = [...new Set(formArray)].length;
        const consistencyScore = 5 - unique; // Higher = more consistent
        
        return {
            manager: team.manager,
            teamName: team.teamName,
            form: form,
            consistencyScore: consistencyScore,
            points: team.points
        };
    }).sort((a, b) => b.consistencyScore - a.consistencyScore);
    
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
                                <div class="text-xs text-green-600">Form: ${team.form}</div>
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
    
    const teams = dashboardData.leaderboard || [];
    
    if (!Array.isArray(teams) || teams.length === 0) {
        container.innerHTML = '<p class="text-white">No team data available</p>';
        return;
    }
    
    // Simulate weekly winner frequency based on current standings and winnings
    const topEarner = teams.reduce((max, team) => 
        (team.totalWinnings || 0) > (max.totalWinnings || 0) ? team : max, teams[0]);
    
    const avgWinnings = teams.reduce((sum, team) => sum + (team.totalWinnings || 0), 0) / teams.length;
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="font-semibold text-yellow-800">💰 Top Earner</div>
                <div class="text-sm text-yellow-700">${topEarner.manager}</div>
                <div class="font-bold text-yellow-800">$${topEarner.totalWinnings || 0} earned</div>
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-center">
                <div class="p-2 bg-blue-50 rounded border border-blue-200">
                    <div class="font-bold text-blue-800">$${avgWinnings.toFixed(0)}</div>
                    <div class="text-xs text-blue-600">Avg Winnings</div>
                </div>
                <div class="p-2 bg-purple-50 rounded border border-purple-200">
                    <div class="font-bold text-purple-800">${dashboardData.currentGameweek || 1}</div>
                    <div class="text-xs text-purple-600">Weeks Played</div>
                </div>
            </div>
            
            <div class="text-xs text-white">
                💡 Weekly winner earns $${teams.length - 1} from other managers
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
    
    // Create team lookup for quick access to stats
    const teamLookup = {};
    teams.forEach((team, index) => {
        teamLookup[team.teamName] = {
            ...team,
            position: index + 1,
            points: parseInt(team.points) || 0,
            gwPoints: parseInt(team.gwPoints) || 0,
            form: team.form || 'N/A'
        };
    });
    
    // Analyze upcoming fixtures and score them for "marquee" potential
    const currentGW = dashboardData.currentGameweek || 1;
    const nextFixtures = fixtures.filter(f => f.gameweek > currentGW && f.gameweek <= currentGW + 5);
    
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
        if (fixture.gameweek === currentGW + 1) {
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
    
    const insights = [];
    
    // === LEAGUE STANDING INSIGHTS === //
    
    // League competitiveness analysis
    const topPoints = teams[0]?.points || 0;
    const bottomPoints = teams[teams.length - 1]?.points || 0;
    const pointsGap = topPoints - bottomPoints;
    const midTablePoints = teams[Math.floor(teams.length / 2)]?.points || 0;
    
    if (pointsGap === 0) {
        insights.push({
            icon: '🏁',
            text: 'Perfect tie! All managers have identical points - anyone can win!',
            type: 'extreme'
        });
    } else if (pointsGap < 20) {
        insights.push({
            icon: '🔥',
            text: `Incredibly tight! Only ${pointsGap} points separate 1st and last place.`,
            type: 'competitive'
        });
    } else if (pointsGap < 50) {
        insights.push({
            icon: '⚔️',
            text: `Competitive league with ${pointsGap} point gap between top and bottom.`,
            type: 'competitive'
        });
    } else if (pointsGap > 200) {
        insights.push({
            icon: '👑',
            text: `${teams[0]?.manager} is absolutely dominating with a ${pointsGap} point lead!`,
            type: 'dominant'
        });
    } else if (pointsGap > 100) {
        insights.push({
            icon: '🏆',
            text: `${teams[0]?.manager} has built a commanding ${pointsGap} point advantage.`,
            type: 'leading'
        });
    }
    
    // Top 3 analysis
    const topThreeGap = (teams[0]?.points || 0) - (teams[2]?.points || 0);
    if (teams.length >= 3 && topThreeGap < 10) {
        insights.push({
            icon: '🥇',
            text: 'Three-way title race! Top 3 managers separated by less than 10 points.',
            type: 'title_race'
        });
    }
    
    // Bottom 3 analysis
    if (teams.length >= 3) {
        const bottomThreeGap = (teams[teams.length - 3]?.points || 0) - (teams[teams.length - 1]?.points || 0);
        if (bottomThreeGap < 15) {
            insights.push({
                icon: '⚠️',
                text: 'Relegation battle! Bottom 3 managers within 15 points of each other.',
                type: 'danger'
            });
        }
    }
    
    // Middle pack competitiveness
    if (teams.length >= 6) {
        const midStart = Math.floor(teams.length * 0.3);
        const midEnd = Math.floor(teams.length * 0.7);
        const midPackGap = (teams[midStart]?.points || 0) - (teams[midEnd]?.points || 0);
        if (midPackGap < 25) {
            insights.push({
                icon: '🌊',
                text: 'Crowded midfield! Several managers battling in a tight points cluster.',
                type: 'competitive'
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
    
    // GW Points analysis
    const highestGWPoints = Math.max(...teams.map(team => parseInt(team.gwPoints) || 0));
    const lowestGWPoints = Math.min(...teams.filter(team => (team.gwPoints || 0) > 0).map(team => parseInt(team.gwPoints) || 0));
    const gwPointsGap = highestGWPoints - lowestGWPoints;
    
    if (highestGWPoints > 100) {
        const topGWManager = teams.find(team => parseInt(team.gwPoints) === highestGWPoints);
        insights.push({
            icon: '💥',
            text: `${topGWManager?.manager} had an explosive gameweek with ${highestGWPoints} points!`,
            type: 'performance'
        });
    } else if (highestGWPoints > 80) {
        const topGWManager = teams.find(team => parseInt(team.gwPoints) === highestGWPoints);
        insights.push({
            icon: '⭐',
            text: `${topGWManager?.manager} dominated the gameweek with ${highestGWPoints} points.`,
            type: 'performance'
        });
    }
    
    if (lowestGWPoints < 20 && lowestGWPoints > 0) {
        const lowGWManager = teams.find(team => parseInt(team.gwPoints) === lowestGWPoints);
        insights.push({
            icon: '📉',
            text: `Tough gameweek for ${lowGWManager?.manager} with only ${lowestGWPoints} points.`,
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
    [...transferHistory.freeAgents, ...transferHistory.waivers].forEach(move => {
        const manager = move.Manager?.split(' ')[0]; // Get first name
        if (manager) managerActivity[manager] = (managerActivity[manager] || 0) + 1;
    });
    
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
    const allManagers = teams.map(team => team.manager);
    const inactiveManagers = allManagers.filter(manager => !activeManagers.has(manager));
    
    if (inactiveManagers.length >= teams.length / 2) {
        insights.push({
            icon: '🧘',
            text: `${inactiveManagers.length} managers haven't made any transfers - trusting their draft!`,
            type: 'conservative'
        });
    }
    
    // === FINANCIAL INSIGHTS === //
    
    const totalWinnings = teams.reduce((sum, team) => sum + (parseInt(team.totalWinnings) || 0), 0);
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
    const topEarner = teams.reduce((max, team) => {
        const maxEarnings = parseInt(max.totalWinnings) || 0;
        const teamEarnings = parseInt(team.totalWinnings) || 0;
        return teamEarnings > maxEarnings ? team : max;
    }, teams[0]);
    
    if (topEarner && (parseInt(topEarner.totalWinnings) || 0) > 30) {
        insights.push({
            icon: '🤑',
            text: `${topEarner.manager} is banking serious cash with $${topEarner.totalWinnings} earned!`,
            type: 'financial'
        });
    }
    
    // === SEASONAL INSIGHTS === //
    
    if (fixtures.length > 0) {
        insights.push({
            icon: '📅',
            text: `${fixtures.length} fixtures still to be played this season.`,
            type: 'schedule'
        });
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
            
            months.push({
                name: monthNames[monthIndex],
                startGW: currentGW,
                endGW: endGW
            });
            
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
                payout: Math.round(leaguePot * this.finalPayoutPercentages.first) 
            },
            second: { 
                manager: sortedLeaderboard[1]?.manager || sortedLeaderboard[1]?.teamName || 'TBD', 
                payout: Math.round(leaguePot * this.finalPayoutPercentages.second) 
            },
            third: { 
                manager: sortedLeaderboard[2]?.manager || sortedLeaderboard[2]?.teamName || 'TBD', 
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
    const earnings = prizePoolManager.calculateEarningsUpToGameweek(targetGameweek);
    
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
    if (weeklyPoolElement) weeklyPoolElement.textContent = `$${earnings.totalWeeklyPayout}`;
    if (monthlyPoolElement) monthlyPoolElement.textContent = `$${earnings.totalMonthlyPayout}`;
    if (totalIndicator) totalIndicator.textContent = `$${earnings.totalPool}`;

    // Calculate total paid out amounts
    const totalWeeklyPaid = earnings.weeklyWinners.reduce((sum, winner) => sum + (winner.payout || 0), 0);
    const totalMonthlyPaid = earnings.monthlyWinners.reduce((sum, winner) => sum + (winner.payout || 0), 0);
    const totalPaidOut = totalWeeklyPaid + totalMonthlyPaid;

    // Update total paid out section
    const totalPaidOutElement = document.getElementById('total-paid-out');
    const totalWeeklyPaidElement = document.getElementById('total-weekly-paid');
    const totalMonthlyPaidElement = document.getElementById('total-monthly-paid');

    if (totalPaidOutElement) totalPaidOutElement.textContent = `$${totalPaidOut}`;
    if (totalWeeklyPaidElement) totalWeeklyPaidElement.textContent = `$${totalWeeklyPaid}`;
    if (totalMonthlyPaidElement) totalMonthlyPaidElement.textContent = `$${totalMonthlyPaid}`;

    // Breakdown descriptions
    const poolBreakdown = document.getElementById('pool-breakdown');
    const weeklyBreakdown = document.getElementById('weekly-breakdown');
    const monthlyBreakdown = document.getElementById('monthly-breakdown');

    if (poolBreakdown) poolBreakdown.textContent = `Through GW${targetGameweek}`;
    if (weeklyBreakdown) weeklyBreakdown.textContent = `${earnings.weeklyWinners.length} weeks`;
    if (monthlyBreakdown) monthlyBreakdown.textContent = `${earnings.monthlyWinners.length} months`;
}

// Populate weekly winners table
function populateWeeklyWinnersTable(weeklyWinners) {
    const tbody = document.getElementById('weekly-winners-table');
    if (!tbody) return;

    if (weeklyWinners.length === 0) {
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

    tbody.innerHTML = weeklyWinners.map(winner => `
        <tr class="hover:bg-gray-700/30">
            <td class="text-white font-medium">GW${winner.gameweek}</td>
            <td class="text-white">${winner.manager}</td>
            <td class="text-purple-300 font-semibold">${winner.points} pts</td>
            <td class="text-green-400 font-bold">$${winner.winnings}</td>
        </tr>
    `).join('');
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

    const sortedEarners = Array.from(managerEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedEarners.length === 0) {
        container.innerHTML = '<p class="text-white text-sm">No earnings recorded yet</p>';
        return;
    }

    container.innerHTML = sortedEarners.map(([manager, earnings], index) => `
        <div class="flex justify-between items-center py-2 ${index < sortedEarners.length - 1 ? 'border-b border-gray-600/30' : ''}">
            <div class="flex items-center">
                <span class="text-${index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}-400 mr-2">
                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                </span>
                <span class="text-white text-sm">${manager}</span>
            </div>
            <span class="text-green-400 font-semibold">$${earnings}</span>
        </div>
    `).join('');
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
    if (firstManagerEl) firstManagerEl.textContent = finalPayouts.first.manager;
    if (firstPayoutEl) firstPayoutEl.textContent = `$${finalPayouts.first.payout}`;
    
    // Update 2nd place
    const secondManagerEl = document.getElementById('final-second-manager');
    const secondPayoutEl = document.getElementById('final-second-payout');
    if (secondManagerEl) secondManagerEl.textContent = finalPayouts.second.manager;
    if (secondPayoutEl) secondPayoutEl.textContent = `$${finalPayouts.second.payout}`;
    
    // Update 3rd place
    const thirdManagerEl = document.getElementById('final-third-manager');
    const thirdPayoutEl = document.getElementById('final-third-payout');
    if (thirdManagerEl) thirdManagerEl.textContent = finalPayouts.third.manager;
    if (thirdPayoutEl) thirdPayoutEl.textContent = `$${finalPayouts.third.payout}`;
}

// Populate player movement section
function populatePlayerMovement() {
    console.log('🔄 Populating player movement...');
    
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    // Populate each section
    populateFreeAgentsTable(transferHistory.freeAgents);
    populateWaiversTable(transferHistory.waivers);
    populateTradesTable(transferHistory.trades);
    
    // Show/hide empty message
    const totalMovements = transferHistory.freeAgents.length + transferHistory.waivers.length + transferHistory.trades.length;
    const emptyMessage = document.getElementById('no-movements-message');
    if (emptyMessage) {
        emptyMessage.classList.toggle('hidden', totalMovements > 0);
    }
    
    console.log(`✅ Populated ${totalMovements} total player movements`);
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
                    ${move.Result}
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

// Calculate current team composition for a manager
function calculateCurrentTeam(managerName) {
    const draft = dashboardData.draft || null;
    const transferHistory = dashboardData.transferHistory || { waivers: [], freeAgents: [], trades: [] };
    
    if (!draft || !draft.teams || !Array.isArray(draft.teams)) {
        console.log(`❌ No draft data available for ${managerName}`);
        return [];
    }
    
    // Find manager's team by manager name
    const managerTeam = draft.teams.find(team => team.manager === managerName);
    if (!managerTeam || !managerTeam.draftPicks) {
        console.log(`❌ No team found for manager ${managerName}`);
        console.log(`📋 Available managers:`, draft.teams.map(team => team.manager));
        return [];
    }
    
    // Start with initial draft picks
    let currentSquad = [...managerTeam.draftPicks];
    
    console.log(`📝 Initial squad for ${managerName}:`, currentSquad);
    
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
    
    // Apply free agent transactions
    transferHistory.freeAgents.forEach(move => {
        if (managerMatches(managerName, move.Manager)) {
            // Remove player out
            const outIndex = currentSquad.indexOf(move.Out);
            if (outIndex > -1) {
                currentSquad.splice(outIndex, 1);
                console.log(`➖ Removed ${move.Out} for ${managerName} (matched with ${move.Manager})`);
            }
            // Add player in
            currentSquad.push(move.In);
            console.log(`➕ Added ${move.In} for ${managerName} (matched with ${move.Manager})`);
        }
    });
    
    // Apply successful waiver transactions
    transferHistory.waivers.forEach(move => {
        if (managerMatches(managerName, move.Manager) && move.Result === 'Success') {
            // Remove player out
            const outIndex = currentSquad.indexOf(move.Out);
            if (outIndex > -1) {
                currentSquad.splice(outIndex, 1);
                console.log(`➖ Removed ${move.Out} via waiver for ${managerName} (matched with ${move.Manager})`);
            }
            // Add player in
            currentSquad.push(move.In);
            console.log(`➕ Added ${move.In} via waiver for ${managerName} (matched with ${move.Manager})`);
        }
    });
    
    // Apply accepted trades
    transferHistory.trades.forEach(trade => {
        if (trade.Result === 'Accepted') {
            if (managerMatches(managerName, trade['Offered By'])) {
                // This manager gave away 'Offered' and received 'Requested'
                const outIndex = currentSquad.indexOf(trade.Offered);
                if (outIndex > -1) {
                    currentSquad.splice(outIndex, 1);
                    console.log(`➖ Traded away ${trade.Offered} for ${managerName} (matched with ${trade['Offered By']})`);
                }
                currentSquad.push(trade.Requested);
                console.log(`➕ Received ${trade.Requested} via trade for ${managerName} (matched with ${trade['Offered By']})`);
            } else if (managerMatches(managerName, trade['Offered To'])) {
                // This manager gave away 'Requested' and received 'Offered'
                const outIndex = currentSquad.indexOf(trade.Requested);
                if (outIndex > -1) {
                    currentSquad.splice(outIndex, 1);
                    console.log(`➖ Traded away ${trade.Requested} for ${managerName} (matched with ${trade['Offered To']})`);
                }
                currentSquad.push(trade.Offered);
                console.log(`➕ Received ${trade.Offered} via trade for ${managerName} (matched with ${trade['Offered To']})`);
            }
        }
    });
    
    console.log(`✅ Final squad for ${managerName}:`, currentSquad);
    return currentSquad;
}

// Show/hide movement type sections
function showMovementType(type) {
    const allSection = document.getElementById('free-agents-section');
    const freeAgentsSection = document.getElementById('free-agents-section');
    const waiversSection = document.getElementById('waivers-section');
    const tradesSection = document.getElementById('trades-section');
    
    // Update tab states
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('tab-active'));
    document.getElementById(`${type === 'all' ? 'all-movements' : type}-tab`).classList.add('tab-active');
    
    // Show/hide sections
    if (type === 'all') {
        freeAgentsSection.classList.remove('hidden');
        waiversSection.classList.remove('hidden');
        tradesSection.classList.remove('hidden');
    } else {
        freeAgentsSection.classList.toggle('hidden', type !== 'freeAgents');
        waiversSection.classList.toggle('hidden', type !== 'waivers');
        tradesSection.classList.toggle('hidden', type !== 'trades');
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