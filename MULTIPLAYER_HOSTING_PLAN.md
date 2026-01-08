# Vanilla Blackjack - Multiplayer & Free Hosting Implementation Plan

A comprehensive guide to adding user accounts, multiplayer lobbies, and deploying everything for **$0/month**.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Free Hosting Stack](#free-hosting-stack)
3. [Phase 1: Frontend Hosting](#phase-1-frontend-hosting)
4. [Phase 2: Database & Authentication](#phase-2-database--authentication)
5. [Phase 3: Backend Server](#phase-3-backend-server)
6. [Phase 4: Multiplayer Implementation](#phase-4-multiplayer-implementation)
7. [Phase 5: Keeping It Online 24/7](#phase-5-keeping-it-online-247)
8. [Development Roadmap](#development-roadmap)
9. [Code Structure](#code-structure)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PLAYERS                                  │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐                │
│    │ Player 1 │    │ Player 2 │    │ Player 3 │                │
│    └────┬─────┘    └────┬─────┘    └────┬─────┘                │
└─────────┼───────────────┼───────────────┼───────────────────────┘
          │               │               │
          │ HTTPS         │ WebSocket     │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (GitHub Pages)                       │
│                    https://yourusername.github.io/blackjack     │
│                    - Static HTML/CSS/JS                          │
│                    - Game UI & Logic                             │
│                    - Socket.io Client                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────────┐
│   SUPABASE (Free)       │   │   RENDER.COM (Free)              │
│                         │   │                                   │
│   • User Authentication │   │   Node.js + Socket.io Server     │
│   • PostgreSQL Database │   │                                   │
│   • User profiles       │   │   • Lobby management             │
│   • Chips/stats storage │   │   • Real-time game sync          │
│   • Session management  │   │   • Player matchmaking           │
│                         │   │   • Game state management        │
└─────────────────────────┘   └─────────────────────────────────┘
```

---

## Free Hosting Stack

| Component | Service | Free Tier Limits | Monthly Cost |
|-----------|---------|------------------|--------------|
| **Frontend** | GitHub Pages | Unlimited | $0 |
| **Backend** | Render.com | 750 hrs/month | $0 |
| **Database** | Supabase | 500MB, 2 projects | $0 |
| **Auth** | Supabase Auth | 50K MAU | $0 |
| **Keep-Alive** | UptimeRobot | 50 monitors | $0 |
| **Domain** | .github.io subdomain | Unlimited | $0 |
| **TOTAL** | | | **$0** |

---

## Phase 1: Frontend Hosting

### Step 1.1: Push to GitHub

```bash
# Initialize git if not already
cd Vanilla-BlackJack-main
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/blackjack.git
git branch -M main
git push -u origin main
```

### Step 1.2: Enable GitHub Pages

1. Go to your repo on GitHub
2. **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **(root)**
5. Click **Save**

Your site will be live at: `https://YOUR_USERNAME.github.io/blackjack/`

### Step 1.3: Custom Domain (Optional, Free)

If you want a custom domain, you can get free subdomains from:
- **Freenom** - Free .tk, .ml, .ga domains
- **is-a.dev** - Free developer subdomains
- **js.org** - Free subdomains for JS projects

---

## Phase 2: Database & Authentication

### Step 2.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Click **New Project**
4. Choose a name and strong database password
5. Select the closest region
6. Wait for project to initialize (~2 minutes)

### Step 2.2: Database Schema

Create these tables in the Supabase SQL editor:

```sql
-- Users profile (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  chips BIGINT DEFAULT 10000,
  total_winnings BIGINT DEFAULT 0,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  blackjacks INT DEFAULT 0,
  biggest_win BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (for leaderboards)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'Player_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Game history (optional, for stats)
CREATE TABLE game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  result TEXT NOT NULL, -- 'win', 'lose', 'push', 'blackjack'
  bet_amount BIGINT NOT NULL,
  payout BIGINT NOT NULL,
  player_hand TEXT,
  dealer_hand TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON game_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON game_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Step 2.3: Configure Authentication

In Supabase Dashboard:

1. **Authentication** → **Providers**
2. Enable desired providers:
   - ✅ Email (enabled by default)
   - ✅ Google (optional - requires Google Cloud setup)
   - ✅ Discord (optional - good for gaming)
   - ✅ GitHub (optional)

3. **Authentication** → **URL Configuration**
   - Site URL: `https://YOUR_USERNAME.github.io/blackjack`
   - Redirect URLs: Add the same URL

### Step 2.4: Get API Keys

From **Settings** → **API**, save these:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Public anonymous key (safe for frontend)

---

## Phase 3: Backend Server

### Step 3.1: Create Server Project

Create a new folder for your server:

```
blackjack-server/
├── package.json
├── server.js
├── game/
│   ├── Deck.js
│   ├── Hand.js
│   └── GameRoom.js
├── routes/
│   └── api.js
└── .env
```

### Step 3.2: Server Code Structure

**package.json:**
```json
{
  "name": "blackjack-server",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

**server.js (core structure):**
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Store active game rooms
const rooms = new Map();

// Health check endpoint (for keep-alive pings)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Join/create lobby
  socket.on('join-room', ({ roomCode, userId, username }) => {
    // Room management logic
  });

  // Game actions
  socket.on('player-action', ({ roomCode, action, data }) => {
    // Broadcast to other players
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3.3: Deploy to Render

1. Push server code to a **separate GitHub repo** (e.g., `blackjack-server`)

2. Go to [render.com](https://render.com) and sign up with GitHub

3. Click **New** → **Web Service**

4. Connect your `blackjack-server` repo

5. Configure:
   - **Name:** `blackjack-server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

6. Add **Environment Variables:**
   ```
   FRONTEND_URL=https://YOUR_USERNAME.github.io
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-key
   ```

7. Click **Create Web Service**

Your server will be at: `https://blackjack-server.onrender.com`

---

## Phase 4: Multiplayer Implementation

### Step 4.1: Game Room Logic

Each room needs:
- Unique room code (6 characters)
- List of players (max 5-7 for blackjack)
- Game state (betting, dealing, player turns, dealer turn)
- Shared dealer hand
- Individual player hands

### Step 4.2: Multiplayer Flow

```
1. LOBBY PHASE
   - Players join room with code
   - See other players in room
   - Ready up when prepared

2. BETTING PHASE (15 sec timer)
   - All players place bets simultaneously
   - Timer countdown shown to all

3. DEAL PHASE
   - Server deals cards to all players
   - All players see their cards + dealer upcard

4. PLAYER TURNS (sequential)
   - Each player takes turn (hit/stand/double/split)
   - Other players watch in real-time
   - 30 sec timer per decision

5. DEALER PHASE
   - Dealer plays out hand
   - All players see dealer cards

6. RESULTS
   - Calculate wins/losses for each player
   - Update chip counts
   - Option to play again
```

### Step 4.3: Socket Events

**Client → Server:**
```javascript
// Join a room
socket.emit('join-room', { roomCode, token, username });

// Ready up
socket.emit('player-ready', { roomCode });

// Place bet
socket.emit('place-bet', { roomCode, amount });

// Game actions
socket.emit('hit', { roomCode });
socket.emit('stand', { roomCode });
socket.emit('double', { roomCode });
socket.emit('split', { roomCode });
```

**Server → Client:**
```javascript
// Room updates
socket.on('room-update', (roomState) => { });
socket.on('player-joined', (player) => { });
socket.on('player-left', (playerId) => { });

// Game flow
socket.on('betting-start', (timeLimit) => { });
socket.on('cards-dealt', (gameState) => { });
socket.on('turn-change', (currentPlayerId) => { });
socket.on('player-action', (action) => { });
socket.on('dealer-play', (dealerCards) => { });
socket.on('round-end', (results) => { });
```

---

## Phase 5: Keeping It Online 24/7

### The Problem

Render's free tier spins down after 15 minutes of inactivity. When a user tries to connect, there's a ~30 second cold start.

### The Solution

Use **UptimeRobot** to ping your server every 5 minutes:

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create free account
3. **Add New Monitor:**
   - Monitor Type: HTTP(s)
   - Friendly Name: Blackjack Server
   - URL: `https://blackjack-server.onrender.com/health`
   - Monitoring Interval: 5 minutes

This keeps your server awake 24/7 for free.

### Alternative: Cron-job.org

1. Go to [cron-job.org](https://cron-job.org)
2. Create account
3. Add cron job:
   - URL: `https://blackjack-server.onrender.com/health`
   - Schedule: Every 5 minutes

---

## Development Roadmap

### Week 1: Foundation
- [ ] Set up GitHub repo and Pages hosting
- [ ] Create Supabase project and database schema
- [ ] Implement basic auth UI (login/signup modals)
- [ ] Connect frontend to Supabase auth

### Week 2: User System
- [ ] User profile page
- [ ] Chips persistence (save to Supabase)
- [ ] Stats tracking
- [ ] Basic leaderboard

### Week 3: Backend Server
- [ ] Set up Node.js server
- [ ] Deploy to Render
- [ ] Implement Socket.io connection
- [ ] Basic room creation/joining

### Week 4: Multiplayer Game Logic
- [ ] Multi-player game state management
- [ ] Turn-based system
- [ ] Betting synchronization
- [ ] Real-time card dealing

### Week 5: Polish & Testing
- [ ] UI for multiplayer features
- [ ] Error handling
- [ ] Reconnection logic
- [ ] Testing with multiple users
- [ ] Set up UptimeRobot keep-alive

---

## Code Structure

### Frontend Changes Needed

```
Vanilla-BlackJack-main/
├── index.html           # Add auth modals, lobby UI
├── css/
│   └── styles.css       # Add auth & lobby styles
├── js/
│   ├── game.js          # Modify for multiplayer state
│   ├── ui.js            # Add auth & lobby UI handlers
│   ├── sounds.js        # No changes needed
│   ├── deck.js          # No changes needed
│   ├── auth.js          # NEW: Supabase auth integration
│   ├── socket.js        # NEW: Socket.io client
│   └── lobby.js         # NEW: Lobby management
└── config.js            # NEW: API URLs and keys
```

### New Files to Create

**js/config.js:**
```javascript
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  SERVER_URL: 'https://blackjack-server.onrender.com'
};
```

**js/auth.js:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Auth functions
async function signUp(email, password, username) { }
async function signIn(email, password) { }
async function signOut() { }
async function getUser() { }
async function updateChips(amount) { }
```

**js/socket.js:**
```javascript
import { io } from 'socket.io-client';

const socket = io(CONFIG.SERVER_URL);

// Connection management
// Room management
// Game event handlers
```

---

## Quick Start Checklist

When you're ready to begin, follow these steps in order:

1. ☐ Create GitHub repo and enable Pages
2. ☐ Create Supabase project
3. ☐ Run SQL to create database tables
4. ☐ Enable email auth in Supabase
5. ☐ Add Supabase JS client to your frontend
6. ☐ Create auth UI (login/signup modals)
7. ☐ Test auth flow locally
8. ☐ Create server repo and deploy to Render
9. ☐ Set up Socket.io connection
10. ☐ Implement lobby system
11. ☐ Add multiplayer game logic
12. ☐ Set up UptimeRobot keep-alive
13. ☐ Test with friends!

---

## Estimated Timeline

| Phase | Time Estimate | Complexity |
|-------|---------------|------------|
| Phase 1: Frontend Hosting | 30 minutes | Easy |
| Phase 2: Database & Auth | 2-3 hours | Medium |
| Phase 3: Backend Server | 3-4 hours | Medium |
| Phase 4: Multiplayer Logic | 8-12 hours | High |
| Phase 5: Keep-Alive Setup | 15 minutes | Easy |

**Total: ~15-20 hours of development**

---

## Questions?

When you're ready to start implementing, let me know which phase you'd like to tackle first and I can provide more detailed code and guidance!
