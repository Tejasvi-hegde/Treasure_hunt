# 🏴‍☠️ Treasure Hunt Competition — Full Stack

A secure, production-ready treasure hunt website with:
- **8-question** sequential hunt for **~30 teams**
- **Server-side answer validation** — answers never reach the browser
- **Case-insensitive** answer matching
- **Rate limiting** to prevent brute-force guessing
- **Per-question timer** tracking (time per clue + total time)
- **Live leaderboard** (auto-refreshes every 15 seconds)
- **Admin dashboard** with full attempt monitoring
- **JWT authentication** per team

---

## 📁 Project Structure

```
treasure-hunt/
├── backend/
│   ├── server.js          ← Express app entry point
│   ├── db.js              ← SQLite setup
│   ├── questions.js       ← ⚠️ SECRET — answers live here only
│   ├── package.json
│   ├── .env.example       ← Copy to .env and fill in
│   ├── .gitignore
│   ├── middleware/
│   │   └── auth.js        ← JWT + Admin key verification
│   └── routes/
│       ├── auth.js        ← Register / Login
│       ├── game.js        ← Get question / Submit answer
│       └── admin.js       ← Leaderboard + monitoring
└── frontend/
    ├── index.html         ← Login / Register page
    ├── game.html          ← The actual game
    ├── leaderboard.html   ← Public live leaderboard
    └── admin.html         ← Admin dashboard
```

---

## ⚙️ Local Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set JWT_SECRET, ADMIN_KEY, FRONTEND_URL
node server.js
# Running on http://localhost:3001
```

**Generate a strong JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Frontend

Open the `frontend/` folder with any static server:
```bash
# Option A: VS Code Live Server (just right-click index.html)

# Option B: Python
cd frontend && python3 -m http.server 5500

# Option C: npx serve
cd frontend && npx serve .
```

Then open `http://localhost:5500`.

### 3. Set your API URL

In **each** frontend HTML file, find this line near the bottom:
```js
const API = "http://localhost:3001";
```
Change it to your deployed backend URL before deploying the frontend.

---

## 🔒 Security Overview

| Threat | Mitigation |
|---|---|
| Answers visible in DevTools | Answers only exist in `questions.js` on the server. The API never sends them. |
| Brute-force guessing | Rate limited: 5 submissions/minute per team |
| Login attacks | 20 login attempts per 15 min per IP |
| Stolen tokens | JWT expires in 24h; logged out on page close (sessionStorage) |
| Team impersonation | bcrypt-hashed passwords (cost 12) + constant-time comparison |
| SQL injection | All queries use parameterized statements (better-sqlite3) |
| XSS | Helmet.js headers; frontend escapes all server-returned strings |
| CORS | Configured to only allow your frontend URL |

---

## 📝 Customising Your Questions

Edit `backend/questions.js`:

```js
{
  id: 1,
  text: "Your question text here",
  hint: "A helpful hint",
  answer: "theanswer",          // case-insensitive, trimmed automatically
  imageUrl: "https://..."       // optional image URL, or null
}
```

Add/remove questions freely — just keep `id` sequential. The system automatically detects the total number of questions.

---

## 🌐 Free Hosting (with GitHub Education Pack)

### Backend → **Render.com** (recommended, free tier)
1. Push `backend/` to a GitHub repo (private is fine)
2. Go to https://render.com → New → Web Service
3. Connect your repo; set:
   - Build command: `npm install`
   - Start command: `node server.js`
4. Add environment variables from `.env` in the Render dashboard
5. Your backend URL will be: `https://your-app.onrender.com`

> ⚠️ Render free tier **spins down after 15 min of inactivity**.
> For a live competition, use the "Always On" feature (paid) OR ping the health endpoint every 14 min with a free cron service (e.g. https://cron-job.org → ping `https://your-app.onrender.com/health`).

**Alternative: Railway.app** — GitHub Education Pack includes Railway credits.
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Add environment variables
3. Railway does NOT spin down — better for competitions!

### Frontend → **Vercel** (best option)
1. Push `frontend/` to a GitHub repo
2. Go to https://vercel.com → Import project
3. No build step needed (plain HTML)
4. Your frontend URL will be: `https://your-app.vercel.app`

**Alternative: Netlify or GitHub Pages** both work identically for plain HTML.

### Database
- SQLite is file-based — it lives **on the server** automatically.
- No external database needed for 30 teams.
- If you use Render, the DB persists as long as the disk isn't cleared.
  For extra safety, download the `.db` file from Render's shell after the event.

---

## 🎮 Competition Day Checklist

**Before the event:**
- [ ] Fill in your actual questions in `backend/questions.js`
- [ ] Set `REGISTRATION_OPEN=true` in `.env`
- [ ] Deploy backend → update `API` URL in all frontend HTML files
- [ ] Deploy frontend
- [ ] Test registration + all 8 questions end-to-end
- [ ] Share `index.html` URL with teams (and `leaderboard.html` for screens)
- [ ] Keep `admin.html` URL + ADMIN_KEY private

**During the event:**
- [ ] Open `admin.html` to monitor all teams in real time
- [ ] Project `leaderboard.html` on a screen for spectators
- [ ] After all teams register, set `REGISTRATION_OPEN=false` in env vars

**After the event:**
- [ ] Download/backup `treasure_hunt.db` from the server shell

---

## 🔗 API Endpoints Reference

### Public
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new team |
| POST | `/api/auth/login` | Login |
| POST | `/api/game/start` | Start timer, get Q1 |
| GET  | `/api/game/question` | Get current question |
| POST | `/api/game/submit` | Submit an answer |
| GET  | `/api/admin/public-leaderboard` | Public leaderboard |

### Admin (requires `X-Admin-Key` header)
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/admin/leaderboard` | Full leaderboard with all data |
| GET  | `/api/admin/team/:id` | Team detail + all attempts |
| GET  | `/api/admin/attempts` | Last 300 attempts across all teams |
| POST | `/api/admin/reset-competition` | Reset all progress |
