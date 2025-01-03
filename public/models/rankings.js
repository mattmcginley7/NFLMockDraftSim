const apiUrl = "http://localhost:5000";

let players = [];

// Fetch player rankings
async function fetchPlayerRankings() {
    try {
        const response = await fetch(`${apiUrl}/api/playerRankings`);
        players = await response.json();
        displayPlayers(players);
    } catch (error) {
        console.error('Error fetching player rankings:', error);
    }
}

function displayPlayers(players) {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';

    players.forEach(player => {
        playerList.innerHTML += `
            <div class="player-card">
                <div class="player-details">
                    <strong>${player.rating}. ${player.name} - ${player.position}</strong>
                    <span class="player-stats">Team: ${player.team}</span>
                    <span class="player-stats">Height: ${player.stats.height}, Weight: ${player.stats.weight}, 40 Time: ${player.stats['40Time']}</span>
                </div>
                <div>
                    <button class="scouting-btn" onclick="showScoutingReport('${player.name}', '${player.scoutingReport}')">
                        Scouting Report
                    </button>
                </div>
            </div>
        `;
    });
}

// Show Scouting Report Modal
function showScoutingReport(playerName, scoutingReport) {
    const modal = document.getElementById('scoutingModal');
    const playerNameElement = document.getElementById('scoutingPlayerName');
    const playerReportElement = document.getElementById('scoutingPlayerReport');

    playerNameElement.textContent = playerName;
    playerReportElement.textContent = scoutingReport || 'No scouting report available.';
    modal.style.display = 'block';
}

// Close Scouting Report Modal
function closeScoutingReport() {
    document.getElementById('scoutingModal').style.display = 'none';
}


// Apply filters
function applyFilters() {
    const searchQuery = document.getElementById('searchPlayer').value.toLowerCase();
    const positionFilter = document.getElementById('filterPosition').value;

    let filteredPlayers = players;

    if (searchQuery) {
        filteredPlayers = filteredPlayers.filter(player =>
            player.name.toLowerCase().includes(searchQuery) ||
            player.team.toLowerCase().includes(searchQuery)
        );
    }

    if (positionFilter) {
        filteredPlayers = filteredPlayers.filter(player => player.position === positionFilter);
    }

    // Sort by rating (ascending)
    filteredPlayers.sort((a, b) => a.rating - b.rating);

    displayPlayers(filteredPlayers);
}


// Initialize
document.addEventListener('DOMContentLoaded', fetchPlayerRankings);
