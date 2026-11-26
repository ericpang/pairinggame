// js/app.js
// Main application router and coordinator

import { AdminController } from "./admin.js";
import { PlayerController } from "./player.js";
import { toggleSound, isSoundEnabled } from "./sound.js";

class App {
    constructor() {
        this.admin = new AdminController();
        this.player = new PlayerController();
        this.activeRole = 'admin'; // 'admin' | 'player'
    }

    async init() {
        this.setupNavigation();
        this.setupSoundButton();

        // Detect role from URL query or hash
        const params = new URLSearchParams(window.location.search);
        const hasRoomParam = params.has('room');
        const isPlayerHash = window.location.hash === '#player';

        if (hasRoomParam || isPlayerHash || this.isMobileDevice()) {
            this.switchRole('player');
        } else {
            this.switchRole('admin');
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    setupNavigation() {
        const tabAdmin = document.getElementById('tab-admin');
        const tabPlayer = document.getElementById('tab-player');

        if (tabAdmin) {
            tabAdmin.addEventListener('click', () => this.switchRole('admin'));
        }
        if (tabPlayer) {
            tabPlayer.addEventListener('click', () => this.switchRole('player'));
        }
    }

    switchRole(role) {
        this.activeRole = role;
        const viewAdmin = document.getElementById('view-admin');
        const viewPlayer = document.getElementById('view-player');
        const tabAdmin = document.getElementById('tab-admin');
        const tabPlayer = document.getElementById('tab-player');

        if (role === 'admin') {
            if (viewAdmin) viewAdmin.style.display = 'grid';
            if (viewPlayer) viewPlayer.style.display = 'none';
            if (tabAdmin) tabAdmin.classList.add('active');
            if (tabPlayer) tabPlayer.classList.remove('active');
            this.admin.init();
        } else {
            if (viewAdmin) viewAdmin.style.display = 'none';
            if (viewPlayer) viewPlayer.style.display = 'block';
            if (tabAdmin) tabAdmin.classList.remove('active');
            if (tabPlayer) tabPlayer.classList.add('active');
            this.player.init();
        }
    }

    setupSoundButton() {
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const enabled = toggleSound();
                soundBtn.textContent = enabled ? '🔊' : '🔇';
                soundBtn.title = enabled ? 'Mute sound' : 'Unmute sound';
            });
        }
    }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
