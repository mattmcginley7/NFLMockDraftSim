const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const playersFilePath = path.join(__dirname, 'players.json');
const teamsFilePath = path.join(__dirname, 'teams.json');

let draftState;
let tradeOffers = []; // Initialize tradeOffers array

// Function to initialize draft state
const initializeDraftState = () => {
    try {
        const players = JSON.parse(fs.readFileSync(playersFilePath, 'utf-8'));
        const teams = JSON.parse(fs.readFileSync(teamsFilePath, 'utf-8'));

        console.log("Players initialized:", players.length);
        console.log("Teams initialized:", teams.teams.length);

        return {
            currentRound: 1,
            totalRounds: 7,
            draftHistory: [],
            teamPicks: teams.teams.reduce((acc, team) => {
                acc[team.name] = team.picks.map(pick => ({ ...pick, player: null }));
                return acc;
            }, {}),
            availablePlayers: players // Reset available players to the initial list
        };
    } catch (error) {
        console.error("Error initializing draft state:", error);
        throw error;
    }
};

// Initialize draft state
draftState = initializeDraftState();

app.get('/teams', (req, res) => {
    const teams = JSON.parse(fs.readFileSync(teamsFilePath, 'utf-8'));
    res.json(teams.teams);
});

app.get('/players', (req, res) => {
    res.json(draftState.availablePlayers);
});

app.get('/draftHistory', (req, res) => {
    res.json(draftState.draftHistory);
});

app.get('/draftState', (req, res) => {
    res.json(draftState);
});

app.post('/startDraft', (req, res) => {
    const { teamId } = req.body;
    if (!teamId) return res.status(400).json({ message: 'Team ID is required' });

    // Reset draft state
    draftState = initializeDraftState();

    console.log("Draft state after reset:", draftState);

    res.json({
        message: 'Draft started',
        currentRound: draftState.currentRound,
        teamPicks: draftState.teamPicks[teamId],
        availablePlayers: draftState.availablePlayers
    });
});

// New function to get a random player with bias based on round
const getRandomPlayerWithBias = (availablePlayers, round) => {
    const biasRange = [10, 20, 30, 35, 35, 35, 35]; // Bias ranges for rounds 1-7
    const range = biasRange[round - 1];
    const eligiblePlayers = availablePlayers.slice(0, Math.min(range, availablePlayers.length));
    const randomIndex = Math.floor(Math.random() * eligiblePlayers.length);
    return availablePlayers.splice(availablePlayers.indexOf(eligiblePlayers[randomIndex]), 1)[0];
};

const simulateDraftPick = (team, round) => {
    if (draftState.availablePlayers.length === 0) {
        console.error('No available players to pick');
        return;
    }

    const selectedPlayer = getRandomPlayerWithBias(draftState.availablePlayers, round);
    const pickIndex = draftState.teamPicks[team].findIndex(pick => pick.player === null);

    if (!selectedPlayer) {
        console.error('Selected player is undefined');
        return;
    }

    if (pickIndex !== -1) {
        draftState.teamPicks[team][pickIndex].player = selectedPlayer;
        draftState.draftHistory.push({
            pick: draftState.teamPicks[team][pickIndex].pick,
            team,
            player: selectedPlayer.name,
            position: selectedPlayer.position,
            college: selectedPlayer.team,
            teamLogo: `./${team.toLowerCase().replace(/\s/g, '-')}-logo.png`
        });
        console.log(`Player ${selectedPlayer.name} selected by ${team} at pick ${draftState.teamPicks[team][pickIndex].pick}`);
    } else {
        console.error(`No available pick slot for ${team} in round ${round}`);
    }
};



app.post('/simulateDraft', (req, res) => {
    const { userTeam } = req.body;
    const draftSequence = [];

    const teams = JSON.parse(fs.readFileSync(teamsFilePath, 'utf-8')).teams;

    const roundRanges = [
        [1, 32],    // Round 1
        [33, 64],   // Round 2
        [65, 100],  // Round 3
        [101, 135], // Round 4
        [136, 176], // Round 5
        [177, 220], // Round 6
        [221, 257]  // Round 7
    ];

    for (let round = 1; round <= draftState.totalRounds; round++) {
        const [start, end] = roundRanges[round - 1];
        const roundPicks = [];
        teams.forEach(team => {
            const picksForRound = team.picks.filter(pick => pick.pick >= start && pick.pick <= end);
            picksForRound.forEach(pick => {
                roundPicks.push({
                    pick: pick.pick,
                    team: team.name,
                    user: team.name === userTeam,
                    round,
                    value: pick.value
                });
            });
        });
        roundPicks.sort((a, b) => a.pick - b.pick); // Sort picks in numerical order
        draftSequence.push(...roundPicks);
    }

    console.log(`Total picks processed: ${draftSequence.length}`);

    res.json({
        message: 'Draft simulation sequence generated',
        draftSequence
    });
});

app.post('/simulateDraftPick', (req, res) => {
    const { team, round } = req.body;
    simulateDraftPick(team, round);
    res.json({
        message: `Simulated draft pick for ${team}`,
        draftHistory: draftState.draftHistory,
        availablePlayers: draftState.availablePlayers
    });
});

app.post('/selectPlayer', (req, res) => {
    try {
        const { player, team } = req.body;
        console.log(`Request to select player: ${player} for team: ${team}`);
        console.log(`Available teams: ${Object.keys(draftState.teamPicks)}`);

        if (!draftState.teamPicks[team]) {
            console.error('Invalid team name:', team);
            return res.status(400).json({ message: 'Invalid team name' });
        }

        const playerIndex = draftState.availablePlayers.findIndex(p => p.name === player);
        if (playerIndex === -1) {
            console.error('Player not found or already drafted');
            return res.status(400).json({ message: 'Player not found or already drafted' });
        }

        const selectedPlayer = draftState.availablePlayers.splice(playerIndex, 1)[0];
        const pickIndex = draftState.teamPicks[team].findIndex(pick => pick.player === null);

        if (pickIndex !== -1) {
            draftState.teamPicks[team][pickIndex].player = selectedPlayer;
            draftState.draftHistory.push({
                pick: draftState.teamPicks[team][pickIndex].pick,
                team,
                player: selectedPlayer.name,
                position: selectedPlayer.position,
                college: selectedPlayer.team,
                teamLogo: `./${team.toLowerCase().replace(/\s/g, '-')}-logo.png` // Adjusted to match your logo naming convention
            });
            console.log(`Player ${selectedPlayer.name} selected by ${team}`);
            res.json({ message: `${team} selects ${selectedPlayer.name}`, selectedPlayer, draftHistory: draftState.draftHistory });
        } else {
            console.error('No available picks for the team');
            return res.status(400).json({ message: 'No available picks for the team' });
        }
    } catch (error) {
        console.error('Error during selectPlayer:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/makeTrade', (req, res) => {
    const { offer, userTeam, currentRound } = req.body;
    console.log('Received trade offer:', offer);

    if (!offer) {
        return res.status(400).json({ message: 'Invalid trade offer' });
    }

    const { fromTeam, fromPicks, toTeam, toPick } = offer;

    try {
        // Update the draft state
        draftState = updateDraftState(draftState, fromTeam, fromPicks, toTeam, toPick);

        // Regenerate the draft sequence based on the updated draft state
        const draftSequence = generateDraftSequence(draftState, userTeam);

        // Filter out picks that have already been made
        const currentDraftPick = draftState.draftHistory.length ? draftState.draftHistory[draftState.draftHistory.length - 1].pick : 0;
        const filteredDraftSequence = draftSequence.filter(pick => pick.pick > currentDraftPick);

        res.json({
            message: 'Trade accepted',
            draftState,
            draftSequence: filteredDraftSequence,
            currentRound
        });
    } catch (error) {
        console.error('Error processing trade:', error);
        res.status(500).json({ message: 'Error processing trade', error: error.message });
    }
});



function updateDraftState(state, fromTeam, fromPicks, toTeam, toPick) {
    const newState = JSON.parse(JSON.stringify(state)); // Deep copy

    // Update fromTeam picks
    newState.teamPicks[fromTeam] = newState.teamPicks[fromTeam].filter(pick => !fromPicks.some(fp => fp.pick === pick.pick));
    newState.teamPicks[fromTeam].push({ ...toPick, player: null });

    // Update toTeam picks
    newState.teamPicks[toTeam] = newState.teamPicks[toTeam].filter(pick => pick.pick !== toPick.pick);
    newState.teamPicks[toTeam].push(...fromPicks.map(pick => ({ ...pick, player: null })));

    // Sort picks for both teams
    newState.teamPicks[fromTeam].sort((a, b) => a.pick - b.pick);
    newState.teamPicks[toTeam].sort((a, b) => a.pick - b.pick);

    return newState;
}


// Function to update draft state after a trade
function updateDraftSequence(sequence, fromTeam, fromPicks, toTeam, toPick) {
    // Update the picks in the draft sequence
    sequence = sequence.map(pick => {
        if (pick.team === fromTeam && fromPicks.some(fp => fp.pick === pick.pick)) {
            return { ...pick, team: toTeam };
        }
        if (pick.team === toTeam && pick.pick === toPick.pick) {
            return { ...pick, team: fromTeam };
        }
        return pick;
    });

    // Sort the updated sequence
    return sequence.sort((a, b) => a.pick - b.pick);
}

function generateDraftSequence(state, userTeam) {
    const sequence = [];
    let currentRound = 1;

    for (const [team, picks] of Object.entries(state.teamPicks)) {
        picks.forEach(pick => {
            sequence.push({
                pick: pick.pick,
                team,
                user: team === userTeam,
                round: getRoundFromPick(pick.pick),
                value: pick.value
            });
        });
    }

    // Sort picks in numerical order to maintain the correct sequence
    sequence.sort((a, b) => a.pick - b.pick);

    return sequence;
}


// Function to get the round from a pick number
function getRoundFromPick(pick) {
    if (pick >= 1 && pick <= 32) return 1;
    if (pick >= 33 && pick <= 64) return 2;
    if (pick >= 65 && pick <= 100) return 3;
    if (pick >= 101 && pick <= 135) return 4;
    if (pick >= 136 && pick <= 176) return 5;
    if (pick >= 177 && pick <= 220) return 6;
    if (pick >= 221 && pick <= 257) return 7;
    return -1; // Invalid pick number
}

// 404 Error Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// General Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));