# 🎴 Card Pairing Game (Memory Match)

A lightweight, multiplayer-ready card pairing (memory match) game built with **vanilla HTML, CSS, and JavaScript**, powered by **Firebase** for cloud storage, real-time synchronization, and session persistence. Players can scan a QR code from their mobile devices to join the game, while the host/admin configures the board size and game settings. Each game dynamically generates unique, randomized card graphics on the fly!

---

## 🌟 Key Features

1. **Pure Vanilla Web Stack**
   - Built exclusively with standard **HTML5**, **CSS3**, and **modern JavaScript (ES6+)**.
   - No heavy frameworks (No React, Angular, or Vue) — ultra-fast load times and zero build steps required.

2. **🔥 Firebase Storage & Cloud Persistence**
   - **Firebase Storage**: Persists and serves generated card artwork blobs, game session snapshots, and custom card deck assets.
   - **Real-Time Synchronization (Firestore / Realtime Database)**: Keeps game state, mobile player join events, card flips, and scores instantly synced between the admin screen and mobile devices.
   - Integrated easily via official Firebase client SDK scripts (CDN).

3. **📱 QR Code Mobile Access**
   - Seamless onboarding: Displays a dynamic QR code on the host screen.
   - Mobile users can instantly scan with their phone camera to join the session without installing any app.
   - Fully responsive, touch-optimized card flipping and mobile controller UI.

4. **🛠️ Admin Game Configuration**
   - The host/admin can easily configure the total number of tiles/cards per game (e.g., 8, 12, 16, 24, 36 tiles).
   - Dynamic grid layout adjustment (`CSS Grid`) that automatically scales to fit any screen size or tile count.
   - Controls for game reset, timer options, and difficulty settings stored directly to Firebase.

5. **🎨 Procedural & Randomized Card Graphics**
   - No static icon sets or repetitive images!
   - Card face graphics are generated **algorithmically** at runtime using HTML5 `<canvas>` / SVG procedural rendering.
   - Generates unique geometric patterns, harmonious color palettes, and distinct shapes for each pair in every session.
   - Generated graphics can optionally be exported and cached in **Firebase Storage** for persistent replay and sharing.

---

## 🏗️ Architecture & How It Works

```
                       +-------------------+
                       |    Host Screen    |
                       |  (Admin Controls  |
                       |    & Game Board)  |
                       +---------+---------+
                                 |
                        Displays QR Code
                        (Contains Room ID)
                                 |
                                 v
                       +-------------------+
                       |   Mobile Device   |
                       | (Player Controller|
                       |   / Card View)    |
                       +---------+---------+
                                 |
                                 v
             +---------------------------------------+
             |            Firebase Cloud             |
             |                                       |
             |  • Cloud Storage: Card graphic images |
             |    & session asset caching            |
             |  • Firestore / RTDB: Real-time room   |
             |    state, tile configs, & turn sync   |
             +---------------------------------------+
```

### 1. Networking & Joining
* **Session Discovery**: The host creates a unique Game Room ID in Firebase.
* **QR Code Generation**: The room's join URL (e.g., `https://your-domain.web.app/?room=ROOM_ID`) is rendered as a QR code directly in the browser using a lightweight vanilla library (such as `qrcode.js`).
* **Real-Time Data Flow**: Mobile devices listen to room state updates (card flips, matches, admin tile settings) via Firebase real-time listeners (`onSnapshot` / `onValue`).

### 2. Firebase Storage Integration
* **Card Asset Persistence**: When procedural graphics are generated on the HTML5 Canvas, they can be converted to image blobs (`canvas.toBlob()`) and uploaded to Firebase Storage under `/sessions/{roomId}/cards/{cardId}.png`.
* **State & Score Archives**: Match history, high scores, and game statistics are stored in Firestore for future reference and leaderboards.

### 3. Procedural Graphic Generator
* Each pair of matching cards is assigned an algorithmically generated design:
  - **Color Palette**: Selected using randomized HSL color harmonies (triadic, complementary, or split-complementary).
  - **Shapes & Patterns**: Rendered via HTML5 Canvas using geometric primitives (polygons, starbursts, nested concentric rings, tessellations, or radial symmetries).
  - Each unique seed produces two identical matching cards, shuffled into the deck.

### 4. Responsive Tile Board
* Utilizes CSS Grid with `auto-fit` and `minmax()`:
  - Automatically calculates optimal column/row distributions based on admin-selected tile counts (e.g., 2×4 for 8 tiles, 4×4 for 16 tiles, 6×6 for 36 tiles).
  - Smooth 3D card-flip animations using CSS `perspective`, `transform-style: preserve-3d`, and `transform: rotateY(180deg)`.

---

## 📁 Project Structure

```
PairingGame/
│
├── index.html              # Main application markup (Host & Player views)
├── css/
│   ├── style.css           # Core styling, layout, and mobile-responsive queries
│   └── card-flip.css       # 3D card flip transitions and animations
├── js/
│   ├── config.js           # Firebase configuration export (apiKey, databaseURL, storageBucket, etc.)
│   ├── firebase-init.js    # Firebase SDK initialization & service exports (db, storage, auth)
│   ├── storage.js          # Firebase Storage helpers (upload/download card blobs)
│   ├── app.js              # Main entry point & session orchestration
│   ├── admin.js            # Admin configuration panel & board setup logic
│   ├── game.js             # Core memory game rules (match detection, score, turns)
│   ├── graphics.js         # Procedural graphic & canvas pattern generator
│   └── qr-manager.js       # QR code generation and mobile join link handler
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Google Chrome, Firefox, Safari, Microsoft Edge).
- A free [Firebase Account](https://firebase.google.com/).
- Optional: A lightweight local web server (e.g., Python `http.server`, Node `serve`, or the VS Code Live Server extension).

---

### 1. Setting Up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. In the project dashboard:
   - Click **Add app** and select **Web** (`</>`).
   - Register your app and copy the `firebaseConfig` object.
3. Enable **Cloud Storage**:
   - Navigate to **Build > Storage** in the sidebar.
   - Click **Get Started** and choose either test mode or production mode with rules configured.
4. Enable **Firebase Realtime Database** (or Firestore):
   - Navigate to **Build > Realtime Database**.
   - Create the database and deploy the security rules defined in [firebase.rules.json](file:///c:/Projects/Gemini/PairingGame/firebase.rules.json) (which contains the `pairs/$code` rules along with your other app modules).
5. Your Firebase credentials are in `js/config.js`, which can be imported to initialize Firebase:

```javascript
// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getDatabase(app);
export const auth = getAuth(app);
```

#### Example Firebase Storage Security Rules

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sessions/{sessionId}/{allPaths=**} {
      allow read, write: if true; // Restrict in production according to auth requirements
    }
  }
}
```

---

### 2. Running Locally

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/your-username/pairing-game.git
   cd pairing-game
   ```

2. **Start a Local HTTP Server:**
   *Using Python:*
   ```bash
   # Python 3
   python -m http.server 8080
   ```
   *Using Node.js (`npx`):*
   ```bash
   npx serve .
   ```

3. **Open the Game:**
   - On the host computer, navigate to:
     ```
     http://localhost:8080
     ```
   - Connect your mobile device to the same network.
   - Scan the on-screen QR code with your phone camera to join the session.

---

### 🌐 Deploying to GitHub Pages

The repository includes a automated GitHub Actions workflow (`.github/workflows/deploy.yml`) that publishes the game to GitHub Pages on every push to `main` or `master`.

#### One-Time Setup in GitHub:
1. Push your repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages** (under "Code and automation" in the left sidebar).
3. Under **Build and deployment**:
   - For **Source**, select **GitHub Actions**.
4. Push any commit to `main` (or trigger manually under the **Actions** tab by selecting **Deploy to GitHub Pages** > **Run workflow**).
5. Once complete, your game will be live at `https://<your-username>.github.io/<repo-name>/`!

---

## 🎮 How to Play

1. **Setup (Admin View)**:
   - Select the number of tiles for the round (e.g., 8, 16, 24, or 32 cards).
   - Click **Generate Game**. The game state and card configurations are saved to Firebase, and cards render face down.
2. **Join via QR Code**:
   - The host displays a QR code containing the room link.
   - Players scan the code to load the synced mobile controller view.
3. **Gameplay**:
   - Players take turns tapping two cards to flip them face-up.
   - Flip events sync in real-time across devices via Firebase.
   - If the randomly generated patterns match, the pair remains face-up and points are recorded.
   - If they do not match, the cards flip back after a brief pause.
   - The game concludes once all pairs have been matched!

---

## ⚙️ Configuration & Customization

| Setting | Default | Description |
| :--- | :--- | :--- |
| `Tile Count` | `16` (8 pairs) | Number of total cards on the board (must be an even number). |
| `Flip Timeout` | `1000ms` | Duration cards stay revealed before auto-flipping back upon a mismatch. |
| `Graphic Style` | `Geometric Canvas` | Procedural mode (`Geometric`, `Concentric Rings`, or `Symmetric Mandala`). |
| `Firebase Sync` | `Enabled` | Syncs card states and stores generated canvas blobs to Firebase Storage. |
| `Animation Speed` | `0.6s` | Duration of the 3D CSS flip animation. |

---

## 📜 License

This project is licensed under the MIT License - feel free to modify and build upon it!
