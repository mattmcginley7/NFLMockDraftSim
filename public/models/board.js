const apiUrl = window.location.origin;
const tokenKey = 'draftBoardToken';
const userKey = 'draftBoardUser';
const localBoardKey = 'draftBoard2027Local';

const state = {
    players: [],
    prospects: [],
    token: localStorage.getItem(tokenKey),
    user: JSON.parse(localStorage.getItem(userKey) || 'null'),
    authMode: 'login',
    draggedPlayerId: '',
    saveTimer: null,
    remote: false
};

const elements = {};

function cacheElements() {
    elements.authForm = document.getElementById('authForm');
    elements.authTitle = document.getElementById('authTitle');
    elements.authModeToggle = document.getElementById('authModeToggle');
    elements.authSubmit = document.getElementById('authSubmit');
    elements.signOut = document.getElementById('signOut');
    elements.username = document.getElementById('username');
    elements.password = document.getElementById('password');
    elements.authMessage = document.getElementById('authMessage');
    elements.boardStatus = document.getElementById('boardStatus');
    elements.boardSearch = document.getElementById('boardSearch');
    elements.positionFilter = document.getElementById('positionFilter');
    elements.statusFilter = document.getElementById('statusFilter');
    elements.resetBoard = document.getElementById('resetBoard');
    elements.boardList = document.getElementById('boardList');
    elements.boardCount = document.getElementById('boardCount');
    elements.saveState = document.getElementById('saveState');
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function toBoardPlayers(players) {
    return players
        .slice()
        .sort((a, b) => Number(a.rank || a.rating) - Number(b.rank || b.rating))
        .map((player, index) => ({
            playerId: player.playerId || `${slugify(player.name)}-${slugify(player.team)}`,
            name: player.name,
            position: player.position,
            team: player.team,
            stats: player.stats || {},
            scoutingReport: player.scoutingReport || '',
            originalRating: player.originalRating || player.rating || index + 1,
            draftClass: player.draftClass || 2027,
            rank: index + 1,
            notes: player.notes || '',
            tier: player.tier || '',
            status: player.status || 'watch'
        }));
}

function rerankPlayers() {
    state.players.forEach((player, index) => {
        player.rank = index + 1;
    });
}

async function fetchJson(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

function setBoardStatus(message) {
    elements.boardStatus.textContent = message;
}

function setSaveState(message) {
    elements.saveState.textContent = message;
}

function getLocalBoard() {
    try {
        const localBoard = JSON.parse(localStorage.getItem(localBoardKey) || 'null');
        return Array.isArray(localBoard) ? localBoard : null;
    } catch (error) {
        return null;
    }
}

function saveLocalBoard() {
    localStorage.setItem(localBoardKey, JSON.stringify(state.players));
}

function clearSession() {
    state.token = '';
    state.user = null;
    state.remote = false;
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
}

function storeSession(data) {
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(data.user));
}

function renderAuth() {
    const signedIn = Boolean(state.user);
    elements.authTitle.textContent = signedIn ? `Signed in as ${state.user.username}` : (state.authMode === 'login' ? 'Sign in' : 'Create account');
    elements.authModeToggle.hidden = signedIn;
    elements.authModeToggle.textContent = state.authMode === 'login' ? 'Create account' : 'Sign in';
    elements.authSubmit.hidden = signedIn;
    elements.authSubmit.textContent = state.authMode === 'login' ? 'Sign in' : 'Create account';
    elements.signOut.hidden = !signedIn;
    elements.username.parentElement.hidden = signedIn;
    elements.password.parentElement.hidden = signedIn;
}

function getFilteredPlayers() {
    const query = elements.boardSearch.value.trim().toLowerCase();
    const position = elements.positionFilter.value;
    const status = elements.statusFilter.value;

    return state.players.filter((player) => {
        const matchesQuery = !query ||
            player.name.toLowerCase().includes(query) ||
            player.team.toLowerCase().includes(query);
        const matchesPosition = !position || player.position === position;
        const matchesStatus = !status || player.status === status;
        return matchesQuery && matchesPosition && matchesStatus;
    });
}

function createButton(label, title, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.className = className;
    button.addEventListener('click', onClick);
    return button;
}

function createStatusSelect(player) {
    const select = document.createElement('select');
    select.className = 'status-select';
    select.title = 'Player status';

    [
        ['watch', 'Watch'],
        ['target', 'Target'],
        ['fade', 'Fade']
    ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = player.status === value;
        select.appendChild(option);
    });

    select.addEventListener('change', () => {
        player.status = select.value;
        scheduleSave();
        renderBoard();
    });

    return select;
}

function renderBoard() {
    const filteredPlayers = getFilteredPlayers();
    elements.boardList.innerHTML = '';
    elements.boardCount.textContent = `${filteredPlayers.length} player${filteredPlayers.length === 1 ? '' : 's'}`;

    if (!filteredPlayers.length) {
        const empty = document.createElement('div');
        empty.className = 'board-empty';
        empty.textContent = 'No players match the current filters.';
        elements.boardList.appendChild(empty);
        return;
    }

    filteredPlayers.forEach((player) => {
        const index = state.players.findIndex(item => item.playerId === player.playerId);
        const card = document.createElement('article');
        card.className = 'board-player';
        card.draggable = true;
        card.dataset.playerId = player.playerId;

        card.addEventListener('dragstart', () => {
            state.draggedPlayerId = player.playerId;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            state.draggedPlayerId = '';
            card.classList.remove('dragging');
        });

        card.addEventListener('dragover', (event) => {
            event.preventDefault();
        });

        card.addEventListener('drop', (event) => {
            event.preventDefault();
            movePlayerBefore(state.draggedPlayerId, player.playerId);
        });

        const rank = document.createElement('div');
        rank.className = 'board-rank';
        rank.textContent = player.rank;

        const summary = document.createElement('div');
        summary.className = 'board-player__summary';

        const titleRow = document.createElement('div');
        titleRow.className = 'board-player__title';

        const name = document.createElement('strong');
        name.textContent = player.name;

        const position = document.createElement('span');
        position.className = 'position-chip';
        position.textContent = player.position;

        titleRow.appendChild(name);
        titleRow.appendChild(position);

        const meta = document.createElement('p');
        meta.className = 'board-player__meta';
        const height = player.stats?.height || 'N/A';
        const weight = player.stats?.weight || 'N/A';
        meta.textContent = `${player.team} | ${height}, ${weight} lbs | Source rank ${player.originalRating}`;

        const notes = document.createElement('textarea');
        notes.className = 'player-notes';
        notes.placeholder = 'Notes';
        notes.value = player.notes || '';
        notes.rows = 3;
        notes.addEventListener('input', () => {
            player.notes = notes.value;
            scheduleSave();
        });

        summary.appendChild(titleRow);
        summary.appendChild(meta);
        summary.appendChild(notes);

        const actions = document.createElement('div');
        actions.className = 'board-player__actions';
        actions.appendChild(createButton('↑', 'Move up', 'icon-action', () => movePlayer(player.playerId, -1)));
        actions.appendChild(createButton('↓', 'Move down', 'icon-action', () => movePlayer(player.playerId, 1)));
        actions.appendChild(createStatusSelect(player));

        if (index === 0) {
            actions.firstChild.disabled = true;
        }

        if (index === state.players.length - 1) {
            actions.children[1].disabled = true;
        }

        card.appendChild(rank);
        card.appendChild(summary);
        card.appendChild(actions);
        elements.boardList.appendChild(card);
    });
}

function movePlayer(playerId, offset) {
    const fromIndex = state.players.findIndex(player => player.playerId === playerId);
    const toIndex = fromIndex + offset;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= state.players.length) {
        return;
    }

    const [player] = state.players.splice(fromIndex, 1);
    state.players.splice(toIndex, 0, player);
    rerankPlayers();
    scheduleSave();
    renderBoard();
}

function movePlayerBefore(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) {
        return;
    }

    const fromIndex = state.players.findIndex(player => player.playerId === sourceId);
    const toIndex = state.players.findIndex(player => player.playerId === targetId);

    if (fromIndex < 0 || toIndex < 0) {
        return;
    }

    const [player] = state.players.splice(fromIndex, 1);
    state.players.splice(toIndex, 0, player);
    rerankPlayers();
    scheduleSave();
    renderBoard();
}

function scheduleSave() {
    saveLocalBoard();
    setSaveState('Saving...');

    if (state.saveTimer) {
        clearTimeout(state.saveTimer);
    }

    state.saveTimer = setTimeout(saveBoardNow, 500);
}

async function saveBoardNow() {
    saveLocalBoard();

    if (!state.token) {
        setSaveState('Saved on this device');
        return;
    }

    try {
        await fetchJson('/api/board', {
            method: 'PUT',
            body: JSON.stringify({ players: state.players })
        });
        state.remote = true;
        setSaveState('Saved');
    } catch (error) {
        setSaveState('Saved on this device');

        if (error.message.toLowerCase().includes('session')) {
            clearSession();
            renderAuth();
        }
    }
}

async function loadProspects() {
    const prospects = await fetchJson('/api/allPlayers');
    state.prospects = prospects;
    return toBoardPlayers(prospects);
}

async function loadBoard() {
    setBoardStatus('Loading board...');

    try {
        const defaultBoard = await loadProspects();
        const localBoard = getLocalBoard();

        if (state.token) {
            try {
                const remoteBoard = await fetchJson('/api/board');
                state.players = toBoardPlayers(remoteBoard.players || defaultBoard);
                state.remote = true;
                setBoardStatus('Signed in board');
                setSaveState('Saved');
            } catch (error) {
                state.players = localBoard || defaultBoard;
                state.remote = false;
                setBoardStatus('Local board');
                setSaveState('Saved on this device');
            }
        } else {
            state.players = localBoard || defaultBoard;
            setBoardStatus('Local board');
            setSaveState('Saved on this device');
        }

        rerankPlayers();
        renderBoard();
        saveLocalBoard();
    } catch (error) {
        setBoardStatus('Could not load prospects.');
        elements.boardList.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'board-empty';
        empty.textContent = error.message;
        elements.boardList.appendChild(empty);
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    elements.authMessage.textContent = '';

    const username = elements.username.value.trim();
    const password = elements.password.value;
    const endpoint = state.authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
        const data = await fetchJson(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        storeSession(data);
        renderAuth();

        if (state.authMode === 'register' && state.players.length) {
            await saveBoardNow();
            setBoardStatus('Signed in board');
        } else {
            await loadBoard();
        }

        elements.authMessage.textContent = state.authMode === 'login' ? 'Signed in.' : 'Account created.';
    } catch (error) {
        elements.authMessage.textContent = error.message;
    }
}

function initializeEvents() {
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    elements.authModeToggle.addEventListener('click', () => {
        state.authMode = state.authMode === 'login' ? 'register' : 'login';
        elements.password.autocomplete = state.authMode === 'login' ? 'current-password' : 'new-password';
        elements.authMessage.textContent = '';
        renderAuth();
    });
    elements.signOut.addEventListener('click', () => {
        clearSession();
        renderAuth();
        loadBoard();
    });
    elements.boardSearch.addEventListener('input', renderBoard);
    elements.positionFilter.addEventListener('change', renderBoard);
    elements.statusFilter.addEventListener('change', renderBoard);
    elements.resetBoard.addEventListener('click', async () => {
        if (!confirm('Reset your board to the source rankings?')) {
            return;
        }

        state.players = toBoardPlayers(state.prospects.length ? state.prospects : await loadProspects());
        rerankPlayers();
        scheduleSave();
        renderBoard();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    renderAuth();
    initializeEvents();
    loadBoard();
});
