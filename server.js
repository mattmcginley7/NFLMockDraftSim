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
    const players = JSON.parse(fs.readFileSync(playersFilePath, 'utf-8'));
    const teams = JSON.parse(fs.readFileSync(teamsFilePath, 'utf-8'));

    return {
        currentRound: 1,
        totalRounds: 7,
        draftHistory: [],
        teamPicks: teams.teams.reduce((acc, team) => {
            acc[team.name] = team.picks.map(pick => ({ pick, player: null }));
            return acc;
        }, {}),
        availablePlayers: players
    };
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

    res.json({
        message: 'Draft started',
        currentRound: draftState.currentRound,
        teamPicks: draftState.teamPicks[teamId]
    });
});

const simulateDraftPick = (team, round) => {
    const playerIndex = Math.floor(Math.random() * draftState.availablePlayers.length);
    const selectedPlayer = draftState.availablePlayers.splice(playerIndex, 1)[0];
    const pickIndex = draftState.teamPicks[team].findIndex(pick => pick.player === null);

    if (pickIndex !== -1) {
        draftState.teamPicks[team][pickIndex].player = selectedPlayer;
        draftState.draftHistory.push({ round, pick: draftState.teamPicks[team][pickIndex].pick, team, player: selectedPlayer.name, position: selectedPlayer.position });
        console.log(`Player ${selectedPlayer.name} selected by ${team}`);
    }
};

app.post('/simulateDraft', (req, res) => {
    const { userTeam } = req.body;
    const draftSequence = [];

    for (let round = 1; round <= draftState.totalRounds; round++) {
        draftState.currentRound = round;
        for (let pick = 1; pick <= 32; pick++) { // Assuming 32 teams
            const team = Object.keys(draftState.teamPicks).find(teamName =>
                draftState.teamPicks[teamName].some(pickObj => pickObj.pick === pick && pickObj.player === null)
            );
            if (team) {
                if (team !== userTeam || round !== draftState.currentRound) {
                    draftSequence.push({ team, round, pick });
                } else {
                    draftSequence.push({ team, round, pick, user: true });
                }
            }
        }
    }

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
            draftState.draftHistory.push({ round: draftState.currentRound, pick: draftState.teamPicks[team][pickIndex].pick, team, player: selectedPlayer.name, position: selectedPlayer.position });
            console.log(`Player ${selectedPlayer.name} selected by ${team}`);
            res.json({ message: `${team} selects ${selectedPlayer.name}`, selectedPlayer, draftHistory: draftState.draftHistory });
        } else {
            console.error('No available picks for the team');
            return res.status(400).json({ message: 'No available picks for the team' });
        }

        // Save updated draft state to files
        fs.writeFileSync(playersFilePath, JSON.stringify(draftState.availablePlayers, null, 2));
    } catch (error) {
        console.error('Error during selectPlayer:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/prepareNextRound', (req, res) => {
    if (draftState.currentRound < draftState.totalRounds) {
        draftState.currentRound++;
        res.json({ message: 'Preparing next round', currentRound: draftState.currentRound });
    } else {
        res.json({ message: 'Draft completed', currentRound: draftState.currentRound });
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
