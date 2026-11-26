// js/admin.js
// Admin / Host view controller & Board visualizer

import { GameManager, generateRoomCode } from "./game.js";
import { ensureAuth } from "./firebase-init.js";
import { generateCardGraphic, renderPattern } from "./graphics.js";

export class AdminController {
    constructor() {
        this.game = new GameManager();
        this.roomCode = null;
        this.qrCodeInstance = null;
    }

    async init() {
        this.setupDOM();
        const user = await ensureAuth();
        this.user = user;

        // Auto-generate or restore room code from session
        this.roomCode = generateRoomCode();
        this.game.init(user, this.roomCode, true);

        this.renderRoomInfo();
        this.setupEventListeners();

        // Create default game with 16 tiles (8 pairs)
        await this.handleCreateGame();
    }

    setupDOM() {
        this.roomCodeEl = document.getElementById('admin-room-code');
        this.roomLinkEl = document.getElementById('admin-room-link');
        this.qrContainerEl = document.getElementById('admin-qrcode');
        this.playersListEl = document.getElementById('admin-players-list');
        this.playerCountEl = document.getElementById('admin-player-count');
        this.boardEl = document.getElementById('game-board');
        this.statusBadgeEl = document.getElementById('admin-status-badge');
        this.tileCountInput = document.getElementById('admin-tile-count');
        this.tileCountDisplay = document.getElementById('admin-tile-count-val');
        this.styleSelect = document.getElementById('admin-graphic-style');
        this.modeSelect = document.getElementById('admin-game-mode');
        this.btnStart = document.getElementById('btn-admin-start');
        this.btnReset = document.getElementById('btn-admin-reset');
        this.btnNewDeck = document.getElementById('btn-admin-new-deck');
        this.copyLinkBtn = document.getElementById('btn-copy-link');
        this.victoryModal = document.getElementById('victory-modal');
    }

    setupEventListeners() {
        // Tile Count change
        if (this.tileCountInput) {
            this.tileCountInput.addEventListener('input', (e) => {
                let val = parseInt(e.target.value, 10);
                if (val % 2 !== 0) val += 1;
                this.tileCountDisplay.textContent = val;
            });
        }

        // Preset tile count chips
        document.querySelectorAll('.tile-preset-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const count = parseInt(e.target.dataset.count, 10);
                this.tileCountInput.value = count;
                this.tileCountDisplay.textContent = count;
                document.querySelectorAll('.tile-preset-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

        // New Deck / Board
        if (this.btnNewDeck) {
            this.btnNewDeck.addEventListener('click', () => this.handleCreateGame());
        }

        // Start Game
        if (this.btnStart) {
            this.btnStart.addEventListener('click', () => this.game.hostStartGame());
        }

        // Reset Game
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => this.game.hostResetGame());
        }

        // Copy Join Link
        if (this.copyLinkBtn) {
            this.copyLinkBtn.addEventListener('click', () => {
                const joinUrl = this.getJoinUrl();
                navigator.clipboard.writeText(joinUrl).then(() => {
                    this.copyLinkBtn.textContent = 'Copied!';
                    setTimeout(() => this.copyLinkBtn.textContent = 'Copy Link', 2000);
                });
            });
        }

        // Subscribe to Game Events
        window.addEventListener('game:meta', (e) => this.onMetaUpdated(e.detail));
        window.addEventListener('game:players', (e) => this.onPlayersUpdated(e.detail));
        window.addEventListener('game:cards', (e) => this.onCardsUpdated(e.detail));
    }

    getJoinUrl() {
        const url = new URL(window.location.href);
        url.search = `?room=${this.roomCode}`;
        url.hash = '#player';
        return url.toString();
    }

    renderRoomInfo() {
        if (this.roomCodeEl) this.roomCodeEl.textContent = this.roomCode;
        const joinUrl = this.getJoinUrl();
        if (this.roomLinkEl) this.roomLinkEl.textContent = joinUrl;

        // Render QR Code
        if (this.qrContainerEl && window.QRCode) {
            this.qrContainerEl.innerHTML = '';
            this.qrCodeInstance = new window.QRCode(this.qrContainerEl, {
                text: joinUrl,
                width: 180,
                height: 180,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel.M
            });
        }
    }

    async handleCreateGame() {
        const count = parseInt(this.tileCountInput.value, 10) || 16;
        const style = this.styleSelect ? this.styleSelect.value : 'all';
        const mode = this.modeSelect ? this.modeSelect.value : 'free';

        if (this.btnNewDeck) {
            this.btnNewDeck.disabled = true;
            this.btnNewDeck.textContent = 'Generating Deck...';
        }

        try {
            await this.game.hostCreateGame(count, style, mode);
        } catch (err) {
            console.error('Failed to create game:', err);
            alert(`Failed to create game board:\n${err.message}`);
        } finally {
            if (this.btnNewDeck) {
                this.btnNewDeck.disabled = false;
                this.btnNewDeck.textContent = '🎲 Generate New Deck';
            }
        }
    }

    onMetaUpdated(meta) {
        if (!meta) return;
        if (this.statusBadgeEl) {
            this.statusBadgeEl.textContent = meta.status.toUpperCase();
            this.statusBadgeEl.className = `status-badge status-${meta.status}`;
        }

        if (this.btnStart) {
            this.btnStart.disabled = (meta.status === 'playing');
        }

        if (meta.status === 'completed') {
            this.showVictoryModal();
        } else if (this.victoryModal) {
            this.victoryModal.classList.remove('active');
        }
    }

    onPlayersUpdated(players) {
        const playerList = Object.entries(players || {});
        if (this.playerCountEl) {
            this.playerCountEl.textContent = `${playerList.length} Connected`;
        }

        if (!this.playersListEl) return;
        this.playersListEl.innerHTML = '';

        if (playerList.length === 0) {
            this.playersListEl.innerHTML = '<div class="empty-roster">Waiting for players to scan QR code...</div>';
            return;
        }

        playerList.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));

        playerList.forEach(([uid, p], idx) => {
            const card = document.createElement('div');
            card.className = `player-roster-item ${p.on ? 'online' : 'offline'}`;
            card.innerHTML = `
                <div class="player-rank">#${idx + 1}</div>
                <div class="player-info">
                    <span class="player-name">${escapeHTML(p.name || 'Anonymous')}</span>
                    <span class="player-stats">${p.matches || 0} matches · ${p.score || 0} pts</span>
                </div>
            `;
            this.playersListEl.appendChild(card);
        });
    }

    onCardsUpdated(cards) {
        if (!this.boardEl) return;

        // Auto-configure CSS grid columns based on tile count
        const count = cards.length;
        let cols = 4;
        if (count <= 8) cols = 4;
        else if (count <= 12) cols = 4;
        else if (count <= 16) cols = 4;
        else if (count <= 24) cols = 6;
        else if (count <= 36) cols = 6;
        else cols = 8;

        this.boardEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        this.boardEl.innerHTML = '';

        cards.forEach((card) => {
            const cardEl = document.createElement('div');
            cardEl.className = `memory-card ${card.revealed || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`;
            cardEl.dataset.id = card.id;

            // Card Inner 3D Container
            const inner = document.createElement('div');
            inner.className = 'card-inner';

            // Card Back (Face Down)
            const back = document.createElement('div');
            back.className = 'card-face card-back';
            back.innerHTML = `
                <div class="card-back-pattern">
                    <span class="card-back-icon">🎴</span>
                    <span class="card-number">${card.id + 1}</span>
                </div>
            `;

            // Card Front (Face Up - Random Graphic)
            const front = document.createElement('div');
            front.className = 'card-face card-front';

            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 180;
            canvas.className = 'card-canvas';
            front.appendChild(canvas);

            // Render procedural pattern into front canvas
            if (card.graphic) {
                // If we have cached dataURL, use image or render directly
                const cachedUrl = this.game.cachedGraphics.get(card.pairId) || card.graphic.storageUrl;
                if (cachedUrl) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = cachedUrl;
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

            // Host can also click to flip on the main board!
            cardEl.addEventListener('click', () => {
                this.game.requestFlip(card.id);
            });

            this.boardEl.appendChild(cardEl);
        });
    }

    showVictoryModal() {
        if (!this.victoryModal) return;
        this.victoryModal.classList.add('active');

        const leaderboardEl = document.getElementById('victory-leaderboard');
        if (leaderboardEl) {
            const playerList = Object.entries(this.game.players || {});
            playerList.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));

            leaderboardEl.innerHTML = playerList.map(([uid, p], idx) => `
                <div class="leaderboard-item rank-${idx + 1}">
                    <span class="rank-badge">${idx === 0 ? '👑' : `#${idx + 1}`}</span>
                    <span class="name">${escapeHTML(p.name || 'Anonymous')}</span>
                    <span class="score">${p.score || 0} pts (${p.matches || 0} pairs)</span>
                </div>
            `).join('');
        }
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}
