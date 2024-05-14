const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const players = require('./players.json');
const teams = require('./teams.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

let draftState = {
    currentRound: 1,
    totalRounds: 7,
    draftHistory: [],
    teamPicks: {},
    availablePlayers: [...players]
};

// Initialize team picks if not present
draftState.teamPicks = teams.teams.reduce((acc, team) => {
    acc[team.name] = acc[team.name] || team.picks.map(pick => ({ pick, player: null }));
    return acc;
}, draftState.teamPicks);

app.get('/teams', (req, res) => {
    console.log('Fetching teams');
    res.json(teams.teams);
});

app.get('/players', (req, res) => {
    console.log('Fetching available players');
    res.json(draftState.availablePlayers);
});

app.post('/startDraft', (req, res) => {
    const { teamId } = req.body;
    if (!teamId) {
        console.error('Team ID required');
        return res.status(400).json({ message: 'Team ID is required' });
    }
    console.log(`Starting draft for team ID: ${teamId}`);
    draftState.currentRound = 1;
    draftState.draftHistory = [];
    draftState.teamPicks[teamId] = draftState.teamPicks[teamId] || [];

    res.json({
        message: 'Draft started',
        currentRound: draftState.currentRound,
        teamPicks: draftState.teamPicks[teamId]
    });
});

app.post('/selectPlayer', (req, res) => {
    const { player, team } = req.body;
    console.log(`Selecting player ${player} for team ${team}`);
    const playerIndex = draftState.availablePlayers.findIndex(p => p.name === player);
    if (playerIndex === -1) {
        console.error('Player not found or already drafted');
        return res.status(400).json({ message: 'Player not found or already drafted' });
    }
    const selectedPlayer = draftState.availablePlayers.splice(playerIndex, 1)[0];
    const pickIndex = draftState.teamPicks[team].findIndex(pick => pick.player === null);
    if (pickIndex !== -1) {
        draftState.teamPicks[team][pickIndex].player = selectedPlayer;
        res.json({ message: `${team} selects ${selectedPlayer.name}`, selectedPlayer });
    } else {
        console.error('No available picks for the team');
        res.status(400).json({ message: 'No available picks for the team' });
    }
});

app.post('/prepareNextRound', (req, res) => {
    console.log('Preparing next round');
    if (draftState.currentRound < draftState.totalRounds) {
        draftState.currentRound++;
        res.json({ message: 'Preparing next round', currentRound: draftState.currentRound });
    } else {
        console.log('Draft completed');
        res.json({ message: 'Draft completed', currentRound: draftState.currentRound });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
