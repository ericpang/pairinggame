// js/player.js
// Mobile Player client controller & touch-optimized interface

import { GameManager } from "./game.js";
import { ensureAuth, db, ref, get, set, serverTimestamp, onDisconnect } from "./firebase-init.js";
import { renderPattern } from "./graphics.js";

export class PlayerController {
    constructor() {
        this.game = new GameManager();
        this.roomCode = null;
        this.user = null;
        this.playerName = localStorage.getItem('pairing_player_name') || '';
    }

    async init() {
        this.setupDOM();
        this.user = await ensureAuth();

        // Check URL parameters for room code
        const params = new URLSearchParams(window.location.search);
        const urlRoom = params.get('room');
        if (urlRoom) {
            this.roomCode = urlRoom.toUpperCase().trim();
            if (this.inputRoomCode) this.inputRoomCode.value = this.roomCode;
        }

        if (this.inputPlayerName && this.playerName) {
            this.inputPlayerName.value = this.playerName;
        }

        this.setupEventListeners();
    }

    setupDOM() {
        this.joinSection = document.getElementById('player-join-section');
        this.gameSection = document.getElementById('player-game-section');
        this.inputPlayerName = document.getElementById('player-name-input');
        this.inputRoomCode = document.getElementById('player-room-input');
        this.btnJoin = document.getElementById('btn-player-join');
        this.mobileBoardEl = document.getElementById('player-mobile-board');
        this.myScoreEl = document.getElementById('player-my-score');
        this.myMatchesEl = document.getElementById('player-my-matches');
        this.playerStatusBanner = document.getElementById('player-status-banner');
        this.roomBadgeEl = document.getElementById('player-room-badge');
    }

    setupEventListeners() {
        if (this.btnJoin) {
            this.btnJoin.addEventListener('click', () => this.handleJoinRoom());
        }

        window.addEventListener('game:meta', (e) => this.onMetaUpdated(e.detail));
        window.addEventListener('game:cards', (e) => this.onCardsUpdated(e.detail));
        window.addEventListener('game:players', (e) => this.onPlayersUpdated(e.detail));
    }

    async handleJoinRoom() {
        const name = (this.inputPlayerName.value || '').trim();
        const code = (this.inputRoomCode.value || '').toUpperCase().trim();

        if (!name) {
            alert('Please enter your nickname');
            return;
        }
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-character room code');
            return;
        }

        this.playerName = name;
        this.roomCode = code;
        localStorage.setItem('pairing_player_name', name);

        this.btnJoin.disabled = true;
        this.btnJoin.textContent = 'Joining Room...';

        try {
            // 1. Ensure user is authenticated
            if (!this.user) {
                this.user = await ensureAuth();
            }

            // 2. Verify room exists and is joinable
            const metaRef = ref(db, `pairs/${this.roomCode}/meta`);
            const metaSnap = await get(metaRef);

            if (!metaSnap.exists()) {
                throw new Error(`Room "${this.roomCode}" was not found. Please make sure the Host has opened the game board.`);
            }

            const meta = metaSnap.val();
            if (meta.open === false && meta.status !== 'lobby') {
                throw new Error(`Room "${this.roomCode}" is currently in-progress or closed.`);
            }

            // 3. Register player profile in Firebase Realtime Database
            const playerRef = ref(db, `pairs/${this.roomCode}/players/${this.user.uid}`);
            await set(playerRef, {
                name: this.playerName,
                on: true,
                score: 0,
                matches: 0,
                ts: serverTimestamp()
            });

            // 4. Safely set disconnect handler
            try {
                onDisconnect(playerRef).update({ on: false });
            } catch (discErr) {
                console.warn('onDisconnect registration warning:', discErr);
            }

            // 5. Initialize game engine as player
            this.game.init(this.user, this.roomCode, false);

            // 6. Switch to game section
            if (this.joinSection) this.joinSection.style.display = 'none';
            if (this.gameSection) this.gameSection.style.display = 'block';
            if (this.roomBadgeEl) this.roomBadgeEl.textContent = `Room: ${this.roomCode}`;

        } catch (err) {
            console.error('Failed to join game:', err);
            let detailedMsg = err.message || 'Unknown error';
            if (err.code === 'PERMISSION_DENIED' || detailedMsg.includes('Permission denied')) {
                detailedMsg = 'Permission Denied: Please check database rules or connection.';
            }
            alert(`Could not join room ${code}:\n${detailedMsg}`);
            this.btnJoin.disabled = false;
            this.btnJoin.textContent = 'Join Game';
        }
    }

    onMetaUpdated(meta) {
        if (!meta || !this.playerStatusBanner) return;

        if (meta.status === 'lobby') {
            this.playerStatusBanner.textContent = '⏳ Waiting for host to start...';
            this.playerStatusBanner.className = 'status-banner status-waiting';
        } else if (meta.status === 'playing') {
            this.playerStatusBanner.textContent = '🎮 Find and tap matching pairs!';
            this.playerStatusBanner.className = 'status-banner status-playing';
        } else if (meta.status === 'completed') {
            this.playerStatusBanner.textContent = '🎉 Game Over! Well played!';
            this.playerStatusBanner.className = 'status-banner status-completed';
        }
    }

    onPlayersUpdated(players) {
        if (!players || !this.user) return;
        const me = players[this.user.uid];
        if (me) {
            if (this.myScoreEl) this.myScoreEl.textContent = me.score || 0;
            if (this.myMatchesEl) this.myMatchesEl.textContent = me.matches || 0;
        }
    }

    onCardsUpdated(cards) {
        if (!this.mobileBoardEl) return;

        const count = cards.length;
        let cols = 4;
        if (count <= 8) cols = 2;
        else if (count <= 16) cols = 4;
        else if (count <= 24) cols = 4;
        else cols = 6;

        this.mobileBoardEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        this.mobileBoardEl.innerHTML = '';

        cards.forEach((card) => {
            const cardEl = document.createElement('div');
            cardEl.className = `memory-card mobile-card ${card.revealed || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`;
            cardEl.dataset.id = card.id;

            const inner = document.createElement('div');
            inner.className = 'card-inner';

            // Back
            const back = document.createElement('div');
            back.className = 'card-face card-back';
            back.innerHTML = `<span class="card-number">${card.id + 1}</span>`;

            // Front
            const front = document.createElement('div');
            front.className = 'card-face card-front';

            const canvas = document.createElement('canvas');
            canvas.width = 140;
            canvas.height = 140;
            canvas.className = 'card-canvas';
            front.appendChild(canvas);

            // Draw graphic
            if (card.graphic) {
                if (card.graphic.storageUrl) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = card.graphic.storageUrl;
                } else {
                    const ctx = canvas.getContext('2d');
                    renderPattern(ctx, card.graphic.type, {
                        range: (min, max) => min + (max - min) * 0.5,
                        int: (min, max) => min,
                        choice: (arr) => arr[0]
                    }, card.graphic.colors || ['#6366f1', '#ec4899', '#38bdf8'], canvas.width);
                }
            }

            inner.appendChild(back);
            inner.appendChild(front);
            cardEl.appendChild(inner);

            // Tap flip on mobile
            cardEl.addEventListener('click', () => {
                this.game.requestFlip(card.id);
            });

            this.mobileBoardEl.appendChild(cardEl);
        });
    }
}
