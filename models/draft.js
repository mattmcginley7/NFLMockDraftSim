let currentRound = 1;
const totalRounds = 7;
let draftSequence = [];
let draftInterval;
let userTeam;

function fetchPlayers() {
    fetch('http://localhost:5000/players')
        .then(response => response.json())
        .then(players => {
            const playerSelect = document.getElementById('playerSelect');
            playerSelect.innerHTML = '';
            players.forEach((player, index) => {
                let option = document.createElement('option');
                option.value = player.name;
                option.textContent = `${index + 1}. ${player.name} - ${player.position}`;
                playerSelect.appendChild(option);
            });
            document.getElementById('selectPlayer').disabled = players.length === 0;
        })
        .catch(error => console.error('Error fetching players:', error));
}

function updateDraftHistory(draftHistory) {
    const draftHistoryContainer = document.getElementById('draftHistory');
    draftHistoryContainer.innerHTML = '';
    draftHistory.forEach(pick => {
        const pickElement = document.createElement('div');
        pickElement.className = 'draft-pick';
        pickElement.innerHTML = `<strong>${pick.pick}. ${pick.team} selects ${pick.player}, ${pick.position}</strong>`;
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
        })
        .catch(error => console.error('Error simulating draft pick:', error));
}

function processDraftSequence() {
    if (draftSequence.length > 0) {
        const { team, round, user } = draftSequence[0];

        // Check if it's the user's turn to pick
        if (user) {
            clearTimeout(draftInterval); // Pause when it's the user's turn
            document.getElementById('selectPlayer').disabled = false; // Enable the select button
            return;
        }

        // Otherwise, simulate the pick for the current team
        draftSequence.shift(); // Remove the processed item from the sequence
        if (round !== currentRound) {
            currentRound = round;
        }
        simulateDraftPick(team, round);

        if (draftSequence.length > 0) {
            draftInterval = setTimeout(processDraftSequence, 1000);
        } else {
            clearTimeout(draftInterval);
        }
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
                document.getElementById('draftResults').innerHTML += `<p>Round ${currentRound}: ${selectedTeam} selects ${selectedPlayer}.</p>`;
                fetchPlayers();
                updateDraftHistory(data.draftHistory);
                document.getElementById('selectPlayer').disabled = true; // Disable the select button after pick
                processDraftSequence(); // Resume draft sequence after user makes a pick
            })
            .catch(error => {
                console.error('Failed to select player:', error);
                alert(`Error: ${error.message}`);
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
