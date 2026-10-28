# 🏷️ BIDZONE — Campus Auction Marketplace

A full-stack campus auction platform where university students can **buy and sell second-hand items** (cycles, calculators, textbooks, gadgets, and campus gear) through a secure, real-time bidding system. Built with the MERN stack.

---

## 🛠️ Tech Stack

| Layer | Technologies & Libraries |
|---|---|
| **Frontend** | React 19, Vite, React Router 7, Socket.io-client, CSS Modules |
| **Backend** | Node.js, Express 5, Socket.IO, Multer, Mongoose |
| **Database** | MongoDB Atlas |
| **Authentication & Sessions** | `express-session`, `connect-mongo`, `bcrypt` |
| **Security & Validation** | Helmet, `express-rate-limit`, `express-validator`, credentialed CORS |
| **Job Scheduling** | Server-side scheduled intervals (`setInterval` background worker) |

---

## 📁 Project Structure

```
BIDZONE/
├── client/                      # React + Vite frontend application
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js           # Central API client (credentials: include)
│   │   ├── components/
│   │   │   ├── AppShell.jsx     # Global layout shell with navigation & footer
│   │   │   ├── AuctionCard.jsx  # Card with photos, price, countdown, and status
│   │   │   ├── CountdownTimer.jsx # Live ticking countdown timer component
│   │   │   ├── Navbar.jsx       # Header with search, nav links, notification badge
│   │   │   ├── ProtectedRoute.jsx # Client route guard for authenticated views
│   │   │   └── StatusBadge.jsx  # Color-coded auction state badge
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication provider & session persistence
│   │   ├── pages/
│   │   │   ├── AuctionDetailPage.jsx # Gallery, live bidding box, and bid history
│   │   │   ├── BuyerDashboard.jsx    # My Bids & outbid recovery dashboard
│   │   │   ├── ExplorePage.jsx       # Marketplace catalog with search/filter/sort
│   │   │   ├── LoginPage.jsx         # Student sign-in form
│   │   │   ├── NotificationsPage.jsx # In-app notification center & push opt-in
│   │   │   ├── ProfilePage.jsx       # Student profile & verification status
│   │   │   ├── SalesHandoverPage.jsx # Physical campus handover coordinator
│   │   │   ├── SellPage.jsx          # Listing creation form with image previews
│   │   │   ├── SellerDashboard.jsx   # My Listings & price approval dashboard
│   │   │   └── SignupPage.jsx        # Student registration form
│   │   ├── App.jsx              # Route definitions & router configuration
│   │   ├── index.css            # Global CSS variables, reset & design tokens
│   │   └── main.jsx             # React DOM entrypoint
│   ├── package.json
│   └── vite.config.js           # Vite config with /api and /uploads proxy
├── server/                      # Node.js + Express backend application
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB Atlas connection handler
│   │   │   └── upload.js        # Multer disk storage configuration
│   │   ├── controllers/
│   │   │   ├── auctionController.js      # Marketplace, bidding & handover logic
│   │   │   ├── authController.js         # Signup, login, logout, session /me
│   │   │   └── notificationController.js # Notification retrieval and read-state
│   │   ├── middleware/
│   │   │   ├── errorHandler.js  # Centralized error handler
│   │   │   └── requireAuth.js   # Session authentication middleware
│   │   ├── models/
│   │   │   ├── Auction.js       # Auction listing schema
│   │   │   ├── Bid.js           # Bid schema with isLeading tracking
│   │   │   ├── Notification.js  # In-app notification event schema
│   │   │   └── User.js          # Student user schema with hashed passwords
│   │   ├── routes/
│   │   │   ├── auctionRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   └── notificationRoutes.js
│   │   ├── services/
│   │   │   └── auctionCloser.js # Background recurring worker for expired auctions
│   │   ├── app.js               # Express app factory (helmet, CORS, session, static routes)
│   │   └── server.js            # HTTP + Socket.IO server initialization
│   ├── uploads/                 # Local directory for uploaded listing photos
│   ├── .env.example             # Safe placeholder template for environment variables
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🔐 Phase 1 & 2 — Authentication & Security Architecture

The authentication foundation implements a unified student identity where every account can act as both buyer and seller.

- **Student Registration & Login**: Validated and normalized inputs (`name`, `email`, `password`). Passwords hashed with `bcrypt` (12 rounds) and never returned in API payloads (`select: false` on schema, explicit whitelist via `toSafeObject()`).
- **Server-Managed Sessions**: Powered by `express-session` and `connect-mongo`. Sessions persist inside the `bidding.sessions` collection in MongoDB Atlas, surviving server restarts.
- **Cookie Security**: Cookies configured with `httpOnly: true`, `sameSite: 'lax'` in development (`'strict'` in production), and `secure: true` in production environments.
- **Session Rehydration**: On application load, the frontend queries `GET /api/auth/me` to restore the active user session without storing authentication tokens in `localStorage`.
- **Session Regeneration & Invalidation**: Session IDs regenerate upon successful login to prevent fixation attacks; `POST /api/auth/logout` destroys the session server-side and clears the cookie.
- **Defense in Depth**: Security headers via Helmet, login rate limiting (10 attempts / 15 minutes in production), and strict credentialed CORS tied exclusively to the frontend origin.

---

## 🚀 Phase 3 — Core Marketplace & Auction Lifecycle

This phase implements the complete marketplace, real-time bidding, seller decision workflows, and campus handover tracking.

### 1. Marketplace & Listing Creation
- **Auction Creation (`/sell`)**: A dedicated listing interface enabling students to create auctions with:
  - Item title (up to 120 characters)
  - Category selection (*cycles*, *calculators*, *books*, *electronics*, *others*)
  - Condition assessment (*new*, *like-new*, *good*, *fair*, *poor*)
  - Description (up to 2,000 characters)
  - Starting price (₹), maximum buyout ceiling cap (₹), and minimum bid increment (₹)
  - Future closing date and time picker
  - Enforced price validation (maximum price must strictly exceed starting price)
- **Photo Uploads**: Multi-image file input supporting up to 5 photos with live thumbnail previews and removal controls prior to submission.
- **Storage & Static Serving**: Handled via Multer disk storage in `server/src/config/upload.js`, saving files with unique timestamps into `server/uploads/` and serving them at `/uploads/*`.
- **Development Proxy**: `client/vite.config.js` proxies both `/api` and `/uploads` requests to `http://localhost:5000` to ensure seamless local media rendering.

### 2. Auction Discovery & Real-Time Bidding
- **Explore Catalog (`/explore`)**:
  - Live full-text search across item titles and descriptions.
  - Interactive category selector tabs and condition filters.
  - Dynamic sorting by ending soonest, newly listed, price low-to-high, and price high-to-low.
  - Auction cards featuring item images, condition badges, live countdown timers, current leading price / starting price, and bid counters.
- **Auction Detail (`/auction/:id`)**:
  - Multi-image gallery with interactive thumbnail selection.
  - Detailed item specifications and seller details.
  - Live ticking countdown timer component (`CountdownTimer.jsx`) calculating remaining days, hours, minutes, and seconds.
  - Bidding action box that dynamically calculates the required next minimum bid ($ \ge $ starting price for initial bids; $ \ge $ current leading bid + increment for subsequent bids).
  - Public bid history displaying student bidder names and formatted timestamps without exposing private account IDs or emails.
- **Bidding Rules & Concurrency**:
  - Validates positive numerical amounts.
  - Prevents sellers from bidding on their own listings.
  - Enforces closing deadlines on the server clock (browser clocks cannot bypass closing times).
  - Emits real-time Socket.IO events (`bid:update` and `auction:status`) to update bid amounts and bid history for all connected viewers without page reloads.

### 3. Auction Closing, Early Close & Sale Workflow
- **Background Auction Closer**: A recurring service (`server/src/services/auctionCloser.js`) running every 30 seconds to check for active auctions whose `closingAt` timestamp has naturally elapsed:
  - Auctions with zero bids transition to `unsold`.
  - Auctions with valid bids transition to `pending_seller_decision`, assigning the top bidder as the provisional winner (`winnerSelectionMethod: 'automatic_highest'`) and notifying both parties.
- **Immutable Listing Details After First Accepted Bid**:
  - Before any accepted bid exists, the seller may edit or cancel the listing.
  - Once the first valid bid is placed and accepted, listing terms (`title`, `category`, `description`, `condition`, `images`, `startingPrice`, `minIncrement`, and `closingAt`) are permanently locked.
  - Enforced via backend middleware (`PATCH /api/auctions/:id` and `DELETE /api/auctions/:id` strictly reject modifications with HTTP 400).
  - The frontend displays clear lock badges (`🔒 Listing Terms Permanently Locked`) and guides the seller to early close if they wish to end the listing early.
- **Seller-Controlled Early Closing (`POST /api/auctions/:id/close-early`)**:
  - The listing owner can close their active auction early at any point before its scheduled deadline.
  - Requires explicit confirmation explaining that closing is irreversible and stops bidding immediately.
  - If 0 bids exist: marks the item as `unsold`.
  - If bids exist: the seller selects an eligible winner strictly from students who placed accepted bids on that listing (showing each bidder's highest bid and bid timestamp). Non-bidders and arbitrary IDs are rejected.
  - If the seller selects a bidder other than the highest bidder, the interface clearly discloses that this overrides normal highest-bid rules, and the auction records `winnerSelectionMethod: 'seller_selected'` with full audit details (`closedEarlyAt`, `closedEarlyBy`, and `selectedWinningAmount`).
  - Rejects all subsequent bids (including concurrent requests).
  - Broadcasts `auction:status` and `auction:closed_early` via Socket.IO for live multi-client updates.
- **Seller Price Decision**: The seller reviews the final bid and selects **Accept Winning Price** or **Reject Price**:
  - Rejection transitions the auction to `rejected`.
  - Approval transitions the auction to `handover_pending`.
- **Maximum Price (Buy-It-Now Cap) & Instant Completion**:
  - The seller configures a `maxPrice` ceiling upon listing.
  - Bids cannot exceed the seller's maximum price (rejected with HTTP 400).
  - When any bidder places a bid matching the maximum price:
    - Bidding completes immediately, stopping further bids.
    - The buyer and seller are automatically matched.
    - The auction transitions directly into `handover_pending`.
    - Live updates broadcast via Socket.IO (`auction:max_price_hit` and `auction:status`).
- **Matched Student Mobile Number Exchange Pop-up (`POST /api/auctions/:id/contact-phone`)**:
  - Once buyer and seller are matched, both participants receive an interactive pop-up modal prompting them to enter their 10-digit mobile number.
  - Exchanged contact details are securely revealed only to the matched buyer and seller (redacted for all third-party viewers).
  - Quick action communication buttons:
    - 📞 **One-touch Phone Calling** (`tel:+91...`)
    - 💬 **Direct WhatsApp Chat** (`https://wa.me/91...`) with pre-filled auction details for seamless campus meetup coordination.
- **Dual-Party Campus Handover (`/purchases`)**:
  - Handover tracking for physical on-campus exchange.
  - Both buyer (`handover.buyerConfirmed`) and seller (`handover.sellerConfirmed`) must confirm receipt.
  - Only when both parties confirm does the auction mark as `completed`.

### 4. Dashboards & Notifications
- **Buyer Dashboard (`/my-bids`)**:
  - Categorized views: *Active Leading Bids*, *Outbid (Action Needed)* with 1-click re-bid navigation, *Awaiting Seller Approval*, *Handover Pending*, and *Completed Purchases*.
- **Seller Dashboard (`/seller-dashboard`)**:
  - Management tables: *Active Listings* (with cancellation capability), *Action Needed: Concluded Auctions Awaiting Your Approval*, *Items Awaiting Campus Handover*, and *Completed Sales*.
- **In-App Notification Center (`/notifications`)**:
  - Notifications for outbid events, auction closures, seller approval/rejection, and handover confirmations.
  - Mark single notification or all notifications as read.
  - Browser Notification API integration allowing students to opt into local browser notification popups via an explicit user button.
- **Student Profile (`/profile`)**:
  - Account ID, registration date, student campus privilege status, quick navigation shortcuts, and sign-out controls.

### 5. Smart Campus Auction Assistant (BidBot)
- **Global Floating Assistant (`ChatBot.jsx`)**: Available across all marketplace pages to assist both buyers and sellers in real time.
- **Smart Natural Language Search for Buyers**:
  - Automatically parses intent, keywords, categories, and natural budget constraints (e.g. *"select me phone within 5k"*, *"cycles under 3000"*, *"engineering books under 500"*).
  - Queries active auctions in MongoDB and renders interactive product mini-cards inside the chat bubble with live prices, buyout caps, and 1-click bid navigation.
- **Seller Insights & Bidder History**:
  - Sellers can ask *"who were bidding for my products?"* or *"bids on my listings"*.
  - Analyzes the seller's active auctions and provides a natural-language breakdown of leading bids, leading student names, top prices, and bid counts.
- **Buyer Bid Tracking**:
  - Buyers can ask *"what am I winning?"* or *"did anyone outbid me?"* to get an instant recap of their active leads and outbid items.
- **Rule FAQs & Help**:
  - Instantly explains platform rules including buyout caps, early closing, contact exchange privacy, and campus handovers.

---

## 📊 Current Project Status & Milestones

### Milestone Checklist
- [x] **Phase 1: Backend Authentication & Security** (Endpoints, session storage, bcrypt, rate limiting, error handling)
- [x] **Phase 2: Authentication Frontend** (Login & signup interfaces, client validation, session rehydration, route guards)
- [x] **Phase 3: Core Marketplace & Auction Lifecycle** (Explore catalog, listing creation with starting & buyout cap prices, image upload, bidding engine with max-price instant match, Socket.IO live updates, background closer, early closing with winner override audit, seller decision, matched mobile number exchange popup with one-touch Call/WhatsApp, dual handover, notification center)
- [x] **Phase 4: Smart Campus Assistant (BidBot)** (Natural-language budget search, live product recommendations, seller bidder insights, buyer bid tracking, and platform FAQ guidance)
- [ ] **Phase 5: Production Deployment & Hardening** (Reverse proxy setup, cloud object storage for uploads, production SSL/HTTPS configuration)

---

## ⚙️ Running Locally

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas cluster connection string

### 1. Environment Configuration

Create `server/.env` based on `server/.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bidding?retryWrites=true&w=majority

# Session
SESSION_SECRET=your_secure_random_64_character_hex_secret
SESSION_COOKIE_NAME=campus.sid

# CORS & Client URL
CLIENT_URL=http://localhost:5173
```

> **Note:** Never commit actual database passwords or session secrets to source control.

### 2. Installation & Directory Setup

Install dependencies for both projects:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

Ensure the `server/uploads/` directory exists (a `.gitkeep` file is provided in the repository).

### 3. Start the Development Servers

Open two separate terminal windows:

**Terminal 1 — Backend API & WebSockets (Port 5000):**
```powershell
cd server
npm run dev
```

**Terminal 2 — Frontend Client (Port 5173):**
```powershell
cd client
npm run dev
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 👨‍💻 Author

**JAYASURYASENTHIL** — jayasuryas.23aim@kongu.edu
