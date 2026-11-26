// js/game.js
// Memory Card Game State & Core Engine

import { 
    db, 
    ref, 
    set, 
    get, 
    update, 
    onValue, 
    remove, 
    serverTimestamp,
    push
} from "./firebase-init.js";
import { generateCardGraphic } from "./graphics.js";
import { uploadAllCardGraphics } from "./storage.js";
import { playFlipSound, playMatchSound, playMismatchSound, playVictorySound } from "./sound.js";

// Crockford-style 6-character room code alphabet (excludes I, L, O, 0, 1)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
}

export class GameManager {
    constructor() {
        this.roomCode = null;
        this.isHost = false;
        this.user = null;
        this.meta = null;
        this.cards = [];
        this.players = {};
        this.activeFlip = null;
        this.cachedGraphics = new Map();
        this.listeners = [];
        this.processingMatch = false;
    }

    init(user, roomCode, isHost = false) {
        this.user = user;
        this.roomCode = roomCode;
        this.isHost = isHost;
        this.setupSubscriptions();
    }

    cleanup() {
        this.listeners.forEach(unsub => unsub());
        this.listeners = [];
    }

    // Subscribe to Firebase Realtime Database updates
    setupSubscriptions() {
        if (!this.roomCode) return;

        // 1. Meta subscription
        const metaRef = ref(db, `pairs/${this.roomCode}/meta`);
        const unsubMeta = onValue(metaRef, (snapshot) => {
            this.meta = snapshot.val();
            window.dispatchEvent(new CustomEvent('game:meta', { detail: this.meta }));
        });
        this.listeners.push(unsubMeta);

        // 2. Cards subscription
        const cardsRef = ref(db, `pairs/${this.roomCode}/cards`);
        const unsubCards = onValue(cardsRef, (snapshot) => {
            const data = snapshot.val();
            this.cards = data ? Object.values(data) : [];
            window.dispatchEvent(new CustomEvent('game:cards', { detail: this.cards }));
        });
        this.listeners.push(unsubCards);

        // 3. Players subscription
        const playersRef = ref(db, `pairs/${this.roomCode}/players`);
        const unsubPlayers = onValue(playersRef, (snapshot) => {
            this.players = snapshot.val() || {};
            window.dispatchEvent(new CustomEvent('game:players', { detail: this.players }));
        });
        this.listeners.push(unsubPlayers);

        // 4. Flips subscription (Host handles match logic from flips)
        const flipsRef = ref(db, `pairs/${this.roomCode}/flips`);
        const unsubFlips = onValue(flipsRef, async (snapshot) => {
            const flipData = snapshot.val();
            this.activeFlip = flipData;
            window.dispatchEvent(new CustomEvent('game:flips', { detail: flipData }));

            if (this.isHost && flipData && flipData.c1 !== undefined && flipData.c2 !== undefined) {
                await this.handleHostMatchResolution(flipData);
            }
        });
        this.listeners.push(unsubFlips);
    }

    // Host: Generate tiles, upload graphics to Firebase Storage, and create game
    async hostCreateGame(tileCount = 16, style = 'all', mode = 'free', title = 'Memory Match') {
        if (!this.isHost || !this.user) return;

        tileCount = Math.max(4, Math.min(64, tileCount));
        if (tileCount % 2 !== 0) tileCount += 1;

        const pairsCount = tileCount / 2;
        const generatedList = [];

        // 1. Procedurally generate random graphics for each pair
        for (let p = 0; p < pairsCount; p++) {
            const graphic = generateCardGraphic(p, style);
            generatedList.push(graphic);
            this.cachedGraphics.set(p, graphic.dataUrl);
        }

        // 2. Upload to Firebase Storage in parallel (with graceful fallback)
        const storageUrls = await uploadAllCardGraphics(this.roomCode, generatedList);

        // 3. Create paired deck and shuffle
        const deck = [];
        for (let p = 0; p < pairsCount; p++) {
            const gen = generatedList[p];
            const storageUrl = storageUrls.get(p) || '';

            const cardTemplate = {
                pairId: p,
                graphic: {
                    seed: gen.seed,
                    type: gen.type,
                    colors: gen.colors,
                    storageUrl: storageUrl
                },
                revealed: false,
                matched: false,
                matchedBy: ''
            };

            // Two identical cards per pair
            deck.push({ ...cardTemplate, id: 0 });
            deck.push({ ...cardTemplate, id: 0 });
        }

        // Fisher-Yates Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        deck.forEach((c, index) => c.id = index);

        // 4. Save to Firebase Database
        const cardsObj = {};
        deck.forEach(c => cardsObj[c.id] = c);

        const metaObj = {
            owner: this.user.uid,
            title: title,
            tileCount: tileCount,
            status: 'lobby',
            open: true,
            mode: mode,
            flipDelay: 1000,
            graphicStyle: style,
            createdAt: serverTimestamp()
        };

        await set(ref(db, `pairs/${this.roomCode}/meta`), metaObj);
        await set(ref(db, `pairs/${this.roomCode}/cards`), cardsObj);
        await remove(ref(db, `pairs/${this.roomCode}/flips`));
        await remove(ref(db, `pairs/${this.roomCode}/moves`));
    }

    // Host starts playing
    async hostStartGame() {
        if (!this.isHost || !this.roomCode) return;
        await update(ref(db, `pairs/${this.roomCode}/meta`), {
            status: 'playing',
            open: false
        });
    }

    // Host resets board
    async hostResetGame() {
        if (!this.isHost || !this.roomCode || !this.meta) return;
        await this.hostCreateGame(this.meta.tileCount, this.meta.graphicStyle, this.meta.mode, this.meta.title);
    }

    // Player or Host requests to flip a card index
    async requestFlip(tileIndex) {
        if (!this.roomCode || !this.user || !this.meta || this.meta.status !== 'playing') return;
        if (this.processingMatch) return;

        const card = this.cards[tileIndex];
        if (!card || card.matched || card.revealed) return;

        const flipsRef = ref(db, `pairs/${this.roomCode}/flips`);
        const snapshot = await get(flipsRef);
        const curFlips = snapshot.val();

        if (!curFlips || curFlips.c1 === undefined) {
            // First card flip
            playFlipSound();
            await set(flipsRef, {
                c1: tileIndex,
                by: this.user.uid,
                ts: serverTimestamp()
            });

            // If Host, update revealed directly
            if (this.isHost) {
                await update(ref(db, `pairs/${this.roomCode}/cards/${tileIndex}`), { revealed: true });
            }
        } else if (curFlips.c1 !== tileIndex && curFlips.c2 === undefined) {
            // Second card flip
            playFlipSound();
            await update(flipsRef, {
                c2: tileIndex,
                by: this.user.uid,
                ts: serverTimestamp()
            });

            // If Host, update revealed directly
            if (this.isHost) {
                await update(ref(db, `pairs/${this.roomCode}/cards/${tileIndex}`), { revealed: true });
            }
        }
    }

    // Authoritative Host evaluates match when 2 cards are flipped
    async handleHostMatchResolution(flipData) {
        if (!this.isHost || this.processingMatch) return;
        this.processingMatch = true;

        const { c1, c2, by } = flipData;
        const card1 = this.cards[c1];
        const card2 = this.cards[c2];

        // Ensure both are revealed visually
        await update(ref(db, `pairs/${this.roomCode}/cards/${c1}`), { revealed: true });
        await update(ref(db, `pairs/${this.roomCode}/cards/${c2}`), { revealed: true });

        const isMatch = card1 && card2 && (card1.pairId === card2.pairId);

        if (isMatch) {
            playMatchSound();
            // Mark both matched
            const updates = {};
            updates[`cards/${c1}/matched`] = true;
            updates[`cards/${c1}/matchedBy`] = by;
            updates[`cards/${c2}/matched`] = true;
            updates[`cards/${c2}/matchedBy`] = by;
            await update(ref(db, `pairs/${this.roomCode}`), updates);

            // Update player score & stats
            const pRef = ref(db, `pairs/${this.roomCode}/players/${by}`);
            const pSnap = await get(pRef);
            if (pSnap.exists()) {
                const curScore = pSnap.val().score || 0;
                const curMatches = pSnap.val().matches || 0;
                await update(pRef, {
                    score: curScore + 10,
                    matches: curMatches + 1,
                    ts: serverTimestamp()
                });
            }

            // Log move
            await push(ref(db, `pairs/${this.roomCode}/moves`), {
                uid: by,
                c1,
                c2,
                match: true,
                ts: serverTimestamp()
            });

            // Clear flips
            await remove(ref(db, `pairs/${this.roomCode}/flips`));
            this.processingMatch = false;

            // Check if all cards matched -> Game Over!
            const remaining = this.cards.filter(c => !c.matched && c.id !== c1 && c.id !== c2);
            if (remaining.length === 0) {
                playVictorySound();
                await update(ref(db, `pairs/${this.roomCode}/meta`), {
                    status: 'completed'
                });
            }
        } else {
            // Mismatch
            playMismatchSound();

            // Log move
            await push(ref(db, `pairs/${this.roomCode}/moves`), {
                uid: by,
                c1,
                c2,
                match: false,
                ts: serverTimestamp()
            });

            const delay = this.meta ? (this.meta.flipDelay || 1000) : 1000;
            setTimeout(async () => {
                // Flip both back
                const unreveals = {};
                unreveals[`cards/${c1}/revealed`] = false;
                unreveals[`cards/${c2}/revealed`] = false;
                await update(ref(db, `pairs/${this.roomCode}`), unreveals);
                await remove(ref(db, `pairs/${this.roomCode}/flips`));
                this.processingMatch = false;
            }, delay);
        }
    }
}
