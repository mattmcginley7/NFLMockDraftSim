let currentRound = 1;
const totalRounds = 7;

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

function initializeDraftControls() {
    const selectPlayerButton = document.getElementById('selectPlayer');

    selectPlayerButton.addEventListener('click', function () {
        const selectedPlayer = document.getElementById('playerSelect').value;
        const selectedTeam = localStorage.getItem('selectedTeam');
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
                if (currentRound < totalRounds) {
                    currentRound++;
                    fetchPlayers();
                } else {
                    document.getElementById('draftResults').innerHTML += `<br>Draft Completed. Review the results.`;
                    document.getElementById('selectPlayer').disabled = true;
                }
                updateDraftHistory(data.draftHistory);
            })
            .catch(error => {
                console.error('Failed to select player:', error);
                alert(`Error: ${error.message}`);
            });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const selectedTeam = localStorage.getItem('selectedTeam');
    const selectedTeamLogo = localStorage.getItem('selectedTeamLogo');

    if (!selectedTeam || !selectedTeamLogo) {
        alert('No team data found. Returning to selection page.');
        window.location.href = 'index.html';
        return;
    }

    const teamLogoImg = document.getElementById('teamLogo');
    teamLogoImg.src = selectedTeamLogo;
    teamLogoImg.alt = `${selectedTeam} Logo`;
    document.getElementById('teamName').textContent = `Drafting for: ${selectedTeam}`;

    fetchPlayers();
    initializeDraftControls();

    // Fetch and display the draft history
    fetch('http://localhost:5000/draftHistory')
        .then(response => response.json())
        .then(draftHistory => {
            updateDraftHistory(draftHistory);
        })
        .catch(error => console.error('Error fetching draft history:', error));
});
