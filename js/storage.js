// js/storage.js
// Firebase Cloud Storage service for card graphic assets and session snapshots

import { storage, sRef, uploadBytes, getDownloadURL } from "./firebase-init.js";

/**
 * Uploads a card graphic Blob to Firebase Cloud Storage.
 * @param {string} roomCode - 6-character room code.
 * @param {number} pairId - Identifier for the card pair.
 * @param {Blob} imageBlob - PNG blob of the generated card graphic.
 * @returns {Promise<string>} Download URL of the stored card graphic or fallback.
 */
export async function uploadCardToStorage(roomCode, pairId, imageBlob) {
    if (!storage || !imageBlob) return null;

    try {
        const path = `pairing_games/${roomCode}/cards/pair_${pairId}.png`;
        const cardRef = sRef(storage, path);
        const metadata = {
            contentType: 'image/png',
            customMetadata: {
                roomCode,
                pairId: String(pairId),
                uploadedAt: new Date().toISOString()
            }
        };

        const snapshot = await uploadBytes(cardRef, imageBlob, metadata);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
    } catch (err) {
        console.warn(`[Firebase Storage] Could not upload card ${pairId} (falling back to generated canvas):`, err.message);
        return null;
    }
}

/**
 * Batch uploads all generated card pair blobs to Firebase Storage in parallel.
 * @param {string} roomCode 
 * @param {Array<{ pairId: number, getBlob: Function, dataUrl: string }>} generatedGraphics 
 * @returns {Promise<Map<number, string>>} Map of pairId to public storage URL.
 */
export async function uploadAllCardGraphics(roomCode, generatedGraphics) {
    const urlMap = new Map();

    const uploadPromises = generatedGraphics.map(async (g) => {
        try {
            const blob = await g.getBlob();
            const url = await uploadCardToStorage(roomCode, g.pairId, blob);
            if (url) {
                urlMap.set(g.pairId, url);
            }
        } catch (e) {
            console.warn(`Failed uploading pair ${g.pairId}:`, e);
        }
    });

    await Promise.allSettled(uploadPromises);
    return urlMap;
}
