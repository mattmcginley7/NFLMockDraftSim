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
            teamLogo: `./${team.toLowerCase().replace(/\s/g, '-')}-logo.png` // Adjusted to match your logo naming convention
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
                roundPicks.push({ pick: pick.pick, team: team.name, user: team.name === userTeam, round });
            });
        });
        roundPicks.sort((a, b) => a.pick - b.pick); // Sort picks in numerical order
        draftSequence.push(...roundPicks);
    }

    // Log the number of picks processed
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
                teamLogo: `./${team}Logo.png` // Adjusted to match your logo naming convention
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
