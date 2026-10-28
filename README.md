# 🏷️ BIDZONE — Campus Auction Marketplace

A full-stack campus auction platform where students can **buy and sell second-hand items** through a real-time bidding system. Built with the MERN stack.

---

## 🚀 Features & What's Built

### ✅ Phase 1: Authentication & Security Foundation
- 📝 **Student Signup & Login** with password strength validation
- 🔐 Passwords hashed using **bcrypt (12 rounds)**, hidden from all API queries
- 🍪 **Server-managed sessions** in MongoDB Atlas with `httpOnly`, `sameSite`, and session regeneration
- 🛡️ Security hardened with **Helmet**, rate limiting, and credentialed CORS
- 👤 `/api/auth/me` profile determination on page load & across browser refreshes

### ✅ Phase 2: Full Marketplace & Auction Engine
- 📦 **Auction Listings**:
  - Categories: *Cycles, Calculators, Books, Electronics, Others*
  - Condition grades: *Brand New, Like New, Good, Fair, Poor*
  - Multiple photo uploads using **Multer** (stored in `server/uploads/`)
  - Configurable starting prices, minimum increments, and closing deadlines
- 🔍 **Explore & Search Catalog**:
  - Live search by title & description
  - Category filter pills & condition selectors
  - Sort by: *Ending Soonest, Recently Listed, Price Low-to-High, Price High-to-Low*
- ⏱️ **Live Countdown Timer**:
  - Client-side countdown ticking in real-time
  - Server-enforced closing times — client clock cannot bypass bidding deadlines
- 🤖 **Automated Background Auction Closer**:
  - Scans for expired auctions every 30 seconds
  - If 0 bids $\rightarrow$ marks item as `unsold`
  - If bids exist $\rightarrow$ transitions item to `pending_seller_decision` and notifies both seller and top bidder

### ✅ Phase 3: Bidding & Real-Time Updates
- 💰 **Bidding Engine**:
  - Validates bid amounts ($ \ge $ starting price for first bid; $ \ge $ current bid + increment for subsequent bids)
  - Prevents sellers from bidding on their own listings
  - Optimistic concurrency protection
  - Safe public bid history displaying student names and timestamps without exposing private IDs or emails
- ⚡ **Real-Time WebSockets with Socket.IO**:
  - Live bid broadcast to all active viewers of an auction without manual page refresh

### ✅ Phase 4: Seller Decision & Campus Handover
- 🤝 **Dual-Party Campus Handover Workflow**:
  - Seller approves or rejects the winning bid after the auction closes
  - Status progression: `active` $\rightarrow$ `pending_seller_decision` $\rightarrow$ `handover_pending` $\rightarrow$ `completed`
  - Both buyer and seller independently confirm physical item handover on campus
- 📊 **Buyer & Seller Dashboards**:
  - **Buyer**: Active leading bids, outbid alerts with quick re-bid, won items awaiting decision, and handovers in progress
  - **Seller**: Active listings with cancellation, auctions requiring price approval/rejection, items awaiting handover, and completed sales history
- 🔔 **In-App Notification Center**:
  - Real-time notifications for outbid alerts, won auctions, seller decisions, and handover updates
  - Browser notification permission opt-in

---

## 📁 Project Structure

```
BIDZONE/
├── client/                      # React + Vite frontend
│   └── src/
│       ├── api/api.js           # Central API fetch wrapper with credentials
│       ├── components/
│       │   ├── Navbar.jsx       # Header with search, nav links, notification badge
│       │   ├── AppShell.jsx     # Consistent layout wrapper
│       │   ├── AuctionCard.jsx  # Card with photos, price, countdown, and status
│       │   ├── CountdownTimer.jsx # Live ticking timer component
│       │   ├── StatusBadge.jsx  # Color-coded auction state badge
│       │   └── ProtectedRoute.jsx
│       ├── context/
│       │   └── AuthContext.jsx  # Global user state & session hydration
│       └── pages/
│           ├── ExplorePage.jsx        # Marketplace homepage with search/filter/sort
│           ├── AuctionDetailPage.jsx  # Gallery, live bidding box, and bid history
│           ├── SellPage.jsx           # Listing creation form with image previews
│           ├── BuyerDashboard.jsx     # My Bids & outbid recovery
│           ├── SellerDashboard.jsx    # My Listings & price approvals
│           ├── SalesHandoverPage.jsx  # Physical campus handover tracker
│           ├── NotificationsPage.jsx  # In-app alerts & browser push opt-in
│           ├── ProfilePage.jsx        # Student profile & account info
│           ├── LoginPage.jsx
│           └── SignupPage.jsx
├── server/                      # Node.js + Express backend
│   └── src/
│       ├── config/
│       │   ├── db.js            # MongoDB Atlas connection
│       │   └── upload.js        # Multer disk storage configuration
│       ├── models/
│       │   ├── User.js          # Student user model (bcrypt)
│       │   ├── Auction.js       # Auction listing model
│       │   ├── Bid.js           # Bid model with isLeading flag
│       │   └── Notification.js  # Notification event model
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── auctionController.js
│       │   └── notificationController.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── auctionRoutes.js
│       │   ├── dashboardRoutes.js
│       │   └── notificationRoutes.js
│       ├── services/
│       │   └── auctionCloser.js # Background recurring job
│       ├── middleware/
│       │   ├── requireAuth.js
│       │   └── errorHandler.js
│       ├── app.js               # Express application setup
│       └── server.js            # HTTP + Socket.IO server listener
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router 7, Socket.io-client, CSS Modules |
| **Backend** | Node.js, Express 5, Socket.IO, Multer, Mongoose |
| **Database** | MongoDB Atlas |
| **Authentication** | express-session, connect-mongo, bcrypt |
| **Security** | Helmet, express-rate-limit, express-validator, strict CORS |

---

## ⚙️ Running Locally

### 1. Start the Backend:
```bash
cd server
npm run dev
```

### 2. Start the Frontend:
```bash
cd client
npm run dev
```

Open your browser at **http://localhost:5173**.

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
