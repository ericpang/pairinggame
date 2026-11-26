// js/firebase-init.js
// Firebase initialization and service exports using Firebase v10 Modular SDK

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    onValue, 
    push, 
    child, 
    remove, 
    serverTimestamp,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    getStorage, 
    ref as sRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { firebaseConfig } from "./config.js";

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Authentication helper
export async function ensureAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                resolve(user);
            } else {
                try {
                    const cred = await signInAnonymously(auth);
                    resolve(cred.user);
                } catch (err) {
                    console.error("Firebase Anonymous Auth failed:", err);
                    reject(err);
                }
            }
        });
    });
}

export {
    ref,
    set,
    get,
    update,
    onValue,
    push,
    child,
    remove,
    serverTimestamp,
    onDisconnect,
    sRef,
    uploadBytes,
    getDownloadURL
};
