const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const players = require('./players.json');


const app = express();

app.use(cors());
app.use(bodyParser.json());

let draftState = {
    currentRound: 1,
    totalRounds: 7,
    draftHistory: [],
    teamPicks: {},
    availablePlayers: [...players] // Initialized with players from your JSON file
};

// Endpoint to serve the players data
app.get('/players', (req, res) => {
    res.json(draftState.availablePlayers); // Send available players
});

// Endpoint to start the draft
app.post('/startDraft', (req, res) => {
    draftState.currentRound = 1;
    draftState.draftHistory = [];
    draftState.teamPicks = {};
    res.json({ message: 'Draft started', currentRound: draftState.currentRound });
});

// Endpoint to handle player selection
app.post('/selectPlayer', (req, res) => {
    const { player, team } = req.body;
    const playerIndex = players.findIndex(p => p.name === player);

    if (playerIndex === -1) {
        return res.status(400).json({ message: 'Player not found or already drafted' });
    }

    const selectedPlayer = players.splice(playerIndex, 1)[0];

    if (!draftState.teamPicks[team]) {
        draftState.teamPicks[team] = [];
    }

    draftState.teamPicks[team].push(selectedPlayer);
    draftState.draftHistory.push({
        round: draftState.currentRound,
        team,
        player: selectedPlayer.name
    });

    res.json({ message: `${team} selects ${selectedPlayer.name}`, selectedPlayer });
});

// Endpoint to prepare the next round
app.post('/prepareNextRound', (req, res) => {
    if (draftState.currentRound < draftState.totalRounds) {
        draftState.currentRound++;
        res.json({ message: 'Preparing next round', currentRound: draftState.currentRound });
    } else {
        res.json({ message: 'Draft completed', currentRound: draftState.currentRound });
    }
});

// Endpoint to finish the draft
app.post('/finishDraft', (req, res) => {
    res.json({ message: 'Draft finished', draftResults: draftState.draftHistory });
});

// Endpoint to get team picks
app.get('/teamPicks/:teamName', (req, res) => {
    const teamName = req.params.teamName;
    const teamPicks = draftState.teamPicks[teamName] || [];
    res.json({ team: teamName, picks: teamPicks.map(player => player.name) });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
