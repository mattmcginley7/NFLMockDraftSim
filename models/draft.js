const TOTAL_ROUNDS = 7

document.addEventListener('DOMContentLoaded', function () {
    // Element references
    const teamSelect = document.getElementById('teamSelect');
    const playerSelect = document.getElementById('playerSelect');
    const startDraftButton = document.getElementById('startDraft');
    const selectPlayerButton = document.getElementById('selectPlayer');
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');
    const draftResults = document.getElementById('draftResults');

    // Initially, no draft actions can be taken
    selectPlayerButton.disabled = true;
    nextRoundButton.disabled = true;
    finishDraftButton.disabled = true;

    // Populate dropdowns and set up event listeners
    populateTeams();
    fetchPlayers();
    startDraftButton.addEventListener('click', startDraft);
    selectPlayerButton.addEventListener('click', selectPlayer);
    nextRoundButton.addEventListener('click', prepareNextRound);
    finishDraftButton.addEventListener('click', finishDraft);
});

function populateTeams() {
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

    const teamSelect = document.getElementById('teamSelect');
    nflTeams.forEach(team => {
        let option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });
}

function fetchPlayers() {
    fetch('http://localhost:5000/players')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(players => {
            console.log("Received players:", players); // Check if players are received
            populatePlayers(players);
        })
        .catch(error => console.error('Error fetching players:', error));
}

function populatePlayers(players) {
    console.log("Populating players dropdown with:", players);
    const playerSelect = document.getElementById('playerSelect');
    playerSelect.innerHTML = ''; // Clear the dropdown before adding new options
    players.forEach(player => {
        let option = document.createElement('option');
        option.value = player.name;
        option.textContent = `${player.name} - ${player.position}`;
        playerSelect.appendChild(option);
    });
}

function startDraft() {
    const selectPlayerButton = document.getElementById('selectPlayer'); // Ensure this line is present
    const nextRoundButton = document.getElementById('nextRound');
    const draftResults = document.getElementById('draftResults');

    // Initial setup for starting the draft
    fetch('http://localhost:5000/startDraft', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Enable the select player button and prepare UI for round 1
            selectPlayerButton.disabled = false;
            draftResults.innerHTML = `Draft started - Round 1`;
            nextRoundButton.setAttribute('data-current-round', 1); // Initialize the nextRoundButton with round 1
            document.getElementById('startDraft').disabled = true; // Disable the start draft button to prevent re-starting the draft
            // Do not modify the 'data-current-round' attribute here
        })
        .catch(error => {
            console.error('Error starting draft:', error);
            draftResults.innerHTML = 'Error starting the draft. Check the console for errors.';
        });
}



function draftRound() {
    const playerSelect = document.getElementById('playerSelect');
    const teamSelect = document.getElementById('teamSelect');
    const draftResults = document.getElementById('draftResults');
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');
    const selectedPlayer = playerSelect.value;
    const selectedTeam = teamSelect.value;

    // Disable the next round button to prevent multiple submissions
    nextRoundButton.disabled = true

    fetch('http://localhost:5000/draftRound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: selectedPlayer, team: selectedTeam })
    })
        .then(response => response.json())
        .then(data => {
            // Display the result of the current draft round
            draftResults.innerHTML += `<br>Round ${data.currentRound}: ${selectedTeam} selects ${selectedPlayer}`;
            // Update the team's picks
            updateTeamPicks(selectedTeam);

            // If the current round is less than the total rounds, prepare for the next round
            if (data.currentRound < data.totalRounds) {
                nextRoundButton.innerText = `Next Round (${data.currentRound + 1})`;
                nextRoundButton.disabled = false; // Enable the button for the next round
                nextRoundButton.style.display = 'block'; // Ensure the next round button is visible
            }
            if (data.currentRound === data.totalRounds - 1) { // Check if the next round is the last round
                finishDraftButton.style.display = 'block';
                finishDraftButton.disabled = false;
                // Do not hide the next round button until the last round is reached
            }
        })
        .catch(error => {
            console.error('Error in round:', error);
            draftResults.innerHTML += '<br>Error processing the round. Check console for errors.';
            // Re-enable the next round button to allow retrying
            nextRoundButton.disabled = false;
        });
}

function proceedToNextRound(currentRound, totalRounds) {
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');

    if (currentRound < totalRounds) {
        nextRoundButton.disabled = false;
        nextRoundButton.innerText = `Next Round (${currentRound + 1})`;
        finishDraftButton.disabled = true; // Keep the finish button disabled until the last round
    } else {
        nextRoundButton.disabled = true;
        finishDraftButton.disabled = false;
        finishDraftButton.style.display = 'block';
    }
}

function finishDraft() {
    const draftResults = document.getElementById('draftResults');
    const startDraftButton = document.getElementById('startDraft');
    const selectPlayerButton = document.getElementById('selectPlayer');
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');

    fetch('http://localhost:5000/finishDraft', { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Append a summary of the draft results to the draftResults element
            draftResults.innerHTML += `<br><strong>Draft Finished. Results:</strong>`;
            data.draftResults.forEach(result => {
                draftResults.innerHTML += `<br>Round ${result.round}: ${result.team} selects ${result.player}`;
            });

            // Disable all action buttons as the draft is finished
            startDraftButton.disabled = true;
            selectPlayerButton.disabled = true;
            nextRoundButton.disabled = true;
            finishDraftButton.disabled = true;

            // Optionally, change the display of the buttons
            startDraftButton.style.display = 'none';
            selectPlayerButton.style.display = 'none';
            nextRoundButton.style.display = 'none';
            finishDraftButton.style.display = 'none';
        })
        .catch(error => {
            console.error('Error finishing draft:', error);
            draftResults.innerHTML += `<br>Error finishing the draft. Check console for errors.`;
        });
}


function updateTeamPicks(teamName) {
    fetch(`http://localhost:5000/teamPicks/${teamName}`)
        .then(response => response.json())
        .then(data => {
            const picksList = data.picks.map(player => `<li>${player}</li>`).join('');
            draftResults.innerHTML += `<h3>${teamName} Picks:</h3><ul>${picksList}</ul>`;
        })
        .catch(error => console.error('Error fetching team picks:', error));
}

function resetDraftUI() {
    const draftResults = document.getElementById('draftResults');
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');

    draftResults.innerHTML = ''; // Clear previous draft results
    nextRoundButton.innerText = 'Next Round (2)'; // Reset the button text for the next round
    nextRoundButton.disabled = true; // Disable the button until the draft starts
    finishDraftButton.disabled = true; // Disable the finish button until the draft ends
}

// ...[other parts of the script]...

function selectPlayer() {
    const playerSelect = document.getElementById('playerSelect');
    const teamSelect = document.getElementById('teamSelect');
    const draftResults = document.getElementById('draftResults');
    const nextRoundButton = document.getElementById('nextRound');
    const selectedPlayer = playerSelect.value;
    const selectedTeam = teamSelect.value;
    const totalRounds = 7; // Assuming there are 7 total rounds

    // Send the selected player to the server
    fetch('http://localhost:5000/selectPlayer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: selectedPlayer, team: selectedTeam })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update the UI with the selection results
            draftResults.innerHTML += `<br>${data.message}`;

            // Enable the next round button if we are not in the last round
            let currentRound = parseInt(nextRoundButton.getAttribute('data-current-round'), 10) || 1;
            if (currentRound < TOTAL_ROUNDS) {
                nextRoundButton.disabled = false;
                nextRoundButton.style.display = 'block';
                nextRoundButton.setAttribute('data-current-round', currentRound + 1);
                nextRoundButton.innerText = `Next Round (${currentRound + 1})`;
            } else {
                // If the current round is the last round, show the finish draft button
                finishDraftButton.style.display = 'block';
                finishDraftButton.disabled = false;
                nextRoundButton.style.display = 'none'; // Hide the next round button
            }

            // Update the team's picks display
            updateTeamPicks(selectedTeam);
        })
        .catch(error => {
            console.error('Error selecting player:', error);
            draftResults.innerHTML += '<br>Error selecting player. Check console for errors.';
            // Re-enable the select button to allow retrying
            document.getElementById('selectPlayer').disabled = false;
        });
}

// ...[other parts of the script]...


function prepareNextRound() {
    const nextRoundButton = document.getElementById('nextRound');
    const finishDraftButton = document.getElementById('finishDraft');
    const draftResults = document.getElementById('draftResults');
    const selectPlayerButton = document.getElementById('selectPlayer'); // Ensure this button exists in your HTML

    // Retrieve the current round number, assuming it's stored on the button's data attribute
    let currentRound = parseInt(nextRoundButton.getAttribute('data-current-round'), 10) || 1;

    // Check if there are more rounds left
    if (currentRound < TOTAL_ROUNDS) {
        currentRound++; // Increment the round number for the next round
        nextRoundButton.setAttribute('data-current-round', currentRound);
        nextRoundButton.innerText = `Next Round (${currentRound})`;
        selectPlayerButton.disabled = false; // Enable the selectPlayerButton for the next round
        finishDraftButton.style.display = 'none'; // Ensure the finish button is hidden unless it's the last round
        nextRoundButton.disabled = false; // Re-enable the next round button for the next round
    } else {
        // If it's the last round
        nextRoundButton.disabled = true; // Disable the next round button
        finishDraftButton.disabled = false; // Enable the finish draft button
        finishDraftButton.style.display = 'block'; // Display the finish draft button
        nextRoundButton.style.display = 'none'; // Hide the next round button
        selectPlayerButton.disabled = true; // Disable the select player button
    }

    draftResults.innerHTML += `<br>Round ${currentRound} prepared. Select a player.`;
}





function disableDraftActions() {
    document.getElementById('startDraft').disabled = true;
    document.getElementById('selectPlayer').disabled = true;
    document.getElementById('nextRound').disabled = true;
    document.getElementById('finishDraft').disabled = true;
}

function updateTeamDraftPicks(teamName) {
    const draftResults = document.getElementById('draftResults');

    fetch(`http://localhost:5000/teamPicks/${teamName}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Create a list of picks to display
            const picksList = data.picks.map(pick => `<li>${pick}</li>`).join('');
            draftResults.innerHTML += `<h3>${teamName} Picks:</h3><ul>${picksList}</ul>`;
        })
        .catch(error => {
            console.error('Error fetching team picks:', error);
            draftResults.innerHTML += `<br>Error fetching picks for ${teamName}. Check console for errors.`;
        });
}
