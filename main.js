// Complete list of NFL teams
const nflTeams = [
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills",
    "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns",
    "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs",
    "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants",
    "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers",
    "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders"
];

// Function to populate team selection dropdown
function populateTeamSelection() {
    const teamSelect = document.getElementById("teamSelect");
    nflTeams.forEach(team => {
        let option = document.createElement("option");
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });
}

// Function to start the draft
function startDraft() {
    const selectedTeam = document.getElementById("teamSelect").value;
    // Draft logic to be implemented
    // Placeholder for demonstration: randomly select a player (more complex logic can be added)
    const randomPlayer = "Player " + Math.floor(Math.random() * 100 + 1); // Replace with actual player selection logic
    displayDraftResult(selectedTeam, randomPlayer);
}

// Function to display draft results
function displayDraftResult(team, player) {
    const resultsDiv = document.getElementById("draftResults");
    resultsDiv.innerHTML += `Team ${team} selects ${player}<br>`;
}

// Event listener for the Start Draft button
document.getElementById("startDraft").addEventListener("click", startDraft);

// Initialize the team selection dropdown on page load
window.onload = populateTeamSelection;
