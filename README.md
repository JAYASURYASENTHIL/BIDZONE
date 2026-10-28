# 🏷️ BIDZONE — Campus Bidding Marketplace

A full-stack campus auction platform where students can **buy and sell items** through a bidding system. Built with the MERN stack.

---

## 🚀 What's Built So Far

### ✅ Phase 1 — Backend Authentication Foundation (Complete)

A production-grade authentication system for student accounts.

**Features:**
- 📝 Student **Signup** with input validation and password strength checks
- 🔐 **Login / Logout** with secure server-side session management
- 👤 **Authenticated profile** (`/me` endpoint)
- 🍪 Session stored in **MongoDB Atlas** — survives server restarts
- 🛡️ Security hardened:
  - Passwords hashed with **bcrypt (12 rounds)** — never stored in plain text
  - **httpOnly** session cookies — JavaScript can't steal them
  - **Rate limiting** — max 10 login attempts per 15 minutes
  - **Helmet** security headers on every response
  - **Credentialed CORS** — exact frontend origin only
  - Generic error messages — never reveals if an email exists

**API Endpoints:**

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `GET` | `/` | ❌ | Health check |
| `POST` | `/api/auth/signup` | ❌ | Register student account |
| `POST` | `/api/auth/login` | ❌ | Log in |
| `POST` | `/api/auth/logout` | ✅ | Log out and destroy session |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

---

## 📁 Project Structure

```
BIDZONE/
├── client/                    # React + Vite frontend
│   └── src/
├── server/                    # Node.js + Express backend
│   └── src/
│       ├── config/
│       │   └── db.js          # MongoDB Atlas connection
│       ├── models/
│       │   └── User.js        # Student user model
│       ├── middleware/
│       │   ├── requireAuth.js # Route protection
│       │   └── errorHandler.js
│       ├── routes/
│       │   └── authRoutes.js
│       ├── controllers/
│       │   └── authController.js
│       ├── app.js             # Express app (session, CORS, security)
│       └── server.js          # Entry point
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Auth | express-session + connect-mongo |
| Security | bcrypt, helmet, express-rate-limit |
| Validation | express-validator |

---

## ⚙️ Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/JAYASURYASENTHIL/BIDZONE.git
cd BIDZONE
```

### 2. Server setup
```bash
cd server
cp .env.example .env
# Fill in your MongoDB Atlas URI and a strong SESSION_SECRET
npm install
npm run dev
```

### 3. Client setup
```bash
cd client
npm install
npm run dev
```

### 4. Environment variables (`server/.env`)
```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/bidding
SESSION_SECRET=<random 64-char hex string>
SESSION_COOKIE_NAME=campus.sid
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🗺️ Roadmap

- [x] Backend authentication (signup, login, logout, session)
- [ ] Auction item listings (create, browse, search)
- [ ] Bidding system (place bid, track highest bid)
- [ ] Auction countdown timer
- [ ] Buyer & Seller dashboards (React frontend)
- [ ] Real-time bid updates (Socket.io)
- [ ] Image uploads for items

---

## 👨‍💻 Author

**JAYASURYASENTHIL** — jayasuryas.23aim@kongu.edu



## Phase 2 — Authentication UI

### Overview
Built the initial React authentication interface for BIDZONE, a campus auction marketplace. This phase connects the frontend authentication experience to the existing Express backend.

### Features
Document only features that are actually implemented and verified, such as:
- Student signup page
- Student login page
- Form validation and error feedback
- Loading and success states
- Session-cookie-based authentication
- Persistent login state after page refresh
- Logout functionality
- Protected frontend routes
- Responsive authentication layouts
- Integration with existing backend authentication endpoints

Inspect the code before marking each feature as completed. If a feature is incomplete or unverified, mark it as pending instead of claiming it works.

### Tech Stack
- React
- Vite
- JavaScript
- React Router, if used
- Existing Node.js and Express authentication API
- MongoDB Atlas and Mongoose on the backend

### Authentication Flow
Explain the actual implemented flow:
1. Student registers or logs in.
2. Frontend sends the request to the backend.
3. Backend validates credentials and manages the session.
4. Frontend retrieves the authenticated user's profile.
5. Authenticated users can access protected routes.
6. Logout invalidates the session and updates the UI.

Correct this description to match the actual implementation if needed.

### Project Structure
Show the actual relevant frontend file structure discovered in the repository. Do not invent filenames or directories.

### Running Locally
Document the commands needed to run the backend and frontend in separate terminals, using the actual scripts in the project's package.json files.

Explain any required environment variables using their names only. Never include secrets, database credentials, or actual session secrets.

### Verification
Include a checklist for signup, login, page refresh, logout, invalid credentials, and protected-route access. Mark tests as passed only if there is evidence that they were executed successfully.

### Development Roadmap
Add the following upcoming milestones:
- Phase 3: Marketplace UI and auction listings
- Phase 4: Bidding engine and public bid history
- Phase 5: Auction closing, seller decisions, and handover
- Phase 6: Buyer and seller dashboards connected to real data
- Phase 7: Notifications and final UI polish

These are planned features, not completed features.

Keep the README concise, polished, accurate, and suitable for a public GitHub repository. Inspect the current codebase, update the README, and summarize the changes made. Do not commit or push anything to GitHub unless explicitly asked.
