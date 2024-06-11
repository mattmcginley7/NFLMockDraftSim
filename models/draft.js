let currentRound = 1;
const totalRounds = 7;
let draftSequence = [];
let draftInterval;
let userTeam;
let allPlayers = []; // Store all players to enable filtering

function fetchPlayers() {
    fetch('http://localhost:5000/players')
        .then(response => response.json())
        .then(players => {
            console.log("Players fetched:", players);
            allPlayers = players;
            populatePlayerDropdown(players);
        })
        .catch(error => console.error('Error fetching players:', error));
}

function populatePlayerDropdown(players) {
    const playerSelect = document.getElementById('playerSelect');
    playerSelect.innerHTML = '';
    players.forEach((player) => {
        let option = document.createElement('option');
        option.value = player.name;
        option.textContent = `${player.rating}. ${player.name} - ${player.position}`;
        playerSelect.appendChild(option);
    });
    document.getElementById('selectPlayer').disabled = players.length === 0;
}

function filterPlayers(criteria) {
    let filteredPlayers = allPlayers;
    if (criteria === 'offense') {
        filteredPlayers = allPlayers.filter(player => ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL'].includes(player.position));
    } else if (criteria === 'defense') {
        filteredPlayers = allPlayers.filter(player => ['EDGE', 'DL', 'LB', 'CB', 'S'].includes(player.position));
    } else if (criteria !== 'all') {
        filteredPlayers = allPlayers.filter(player => player.position === criteria);
    }
    populatePlayerDropdown(filteredPlayers);
}

function updateDraftHistory(draftHistory) {
    const draftHistoryContainer = document.getElementById('draftHistory');
    draftHistoryContainer.innerHTML = '';
    (draftHistory || []).forEach(pick => {
        const teamLogo = `./${pick.team.toLowerCase().replace(/\s/g, '-')}-logo.png`;
        const pickElement = document.createElement('div');
        pickElement.className = 'draft-pick-item';
        pickElement.innerHTML = `
            <img src="${teamLogo}" alt="${pick.team} Logo" class="team-logo-small">
            <strong>${pick.pick}. ${pick.player}</strong>, ${pick.position}, ${pick.college}`;
        draftHistoryContainer.appendChild(pickElement);
    });
}


function simulateDraftPick(team, round) {
    fetch('http://localhost:5000/simulateDraftPick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, round })
    })
        .then(response => response.json())
        .then(data => {
            updateDraftHistory(data.draftHistory);
            fetchPlayers();
            if (draftSequence.length > 0) {
                draftInterval = setTimeout(processDraftSequence, 1000); // Continue processing draft sequence
            }
        })
        .catch(error => console.error('Error simulating draft pick:', error));
}

function processDraftSequence() {
    if (draftSequence.length > 0) {
        const { team, round, user } = draftSequence.shift(); // Remove the processed item from the sequence

        // Check if it's the user's turn to pick
        if (user) {
            clearTimeout(draftInterval); // Pause when it's the user's turn
            document.getElementById('selectPlayer').disabled = false; // Enable the select button
            return;
        }

        // Otherwise, simulate the pick for the current team
        if (round !== currentRound) {
            currentRound = round;
        }
        simulateDraftPick(team, round);
    } else {
        clearTimeout(draftInterval);
        checkRoundEnd();
    }
}

function checkRoundEnd() {
    const currentRoundPicks = draftSequence.filter(seq => seq.round === currentRound).length;
    if (currentRoundPicks === 0 && currentRound <= totalRounds) {
        currentRound++;
        simulateDraft(); // Automatically proceed to the next round
    }
}

function initializeDraftControls() {
    const selectPlayerButton = document.getElementById('selectPlayer');

    selectPlayerButton.addEventListener('click', function () {
        const selectedPlayer = document.getElementById('playerSelect').value;
        const selectedTeam = userTeam;
        console.log(`Selected Team: ${selectedTeam}`);

        fetch('http://localhost:5000/selectPlayer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: selectedPlayer, team: selectedTeam })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message);
                    });
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('draftResults').innerHTML += `<p>${selectedTeam} selects ${selectedPlayer}.</p>`;
                fetchPlayers();
                updateDraftHistory(data.draftHistory);
                document.getElementById('selectPlayer').disabled = true; // Disable the select button after pick
                setTimeout(processDraftSequence, 1000); // Resume draft sequence after user makes a pick
            })
            .catch(error => {
                console.error('Failed to select player:', error);
                alert(`Error: ${error.message}`);
            });
    });

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            document.querySelector('.filter-btn.active').classList.remove('active');
            button.classList.add('active');
            filterPlayers(button.id.replace('filter-', ''));
        });
    });
}

function simulateDraft() {
    fetch('http://localhost:5000/simulateDraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userTeam })
    })
        .then(response => response.json())
        .then(data => {
            console.log("Draft sequence:", data.draftSequence);
            draftSequence = data.draftSequence;
            processDraftSequence();
        })
        .catch(error => console.error('Error simulating draft:', error));
}

document.addEventListener('DOMContentLoaded', function () {
    userTeam = localStorage.getItem('selectedTeam');
    const selectedTeamLogo = localStorage.getItem('selectedTeamLogo');

    if (!userTeam || !selectedTeamLogo) {
        alert('No team data found. Returning to selection page.');
        window.location.href = 'index.html';
        return;
    }

    const teamLogoImg = document.getElementById('teamLogo');
    teamLogoImg.src = selectedTeamLogo;
    teamLogoImg.alt = `${userTeam} Logo`;
    document.getElementById('teamName').textContent = `Drafting for: ${userTeam}`;

    fetchPlayers();
    initializeDraftControls();

    // Simulate the draft when the page loads
    simulateDraft();
});