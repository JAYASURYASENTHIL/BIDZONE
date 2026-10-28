# 🏷️ Bidding App — MERN Stack

A full-stack bidding platform built with **MongoDB Atlas**, **Express**, **React (Vite)**, and **Node.js**.

## 📁 Project Structure

```
bidding/
├── client/          # React + Vite frontend
│   └── src/
├── server/          # Express + Mongoose backend
│   ├── index.js     # Entry point
│   └── .env         # Environment variables (not committed)
├── .gitignore
└── README.md
```

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/JAYASURYASENTHIL/bidding.git
cd bidding
```

### 2. Configure MongoDB Atlas
- Go to [MongoDB Atlas](https://cloud.mongodb.com) and create a free cluster
- Whitelist your IP and create a database user
- Copy the connection string

### 3. Server Setup
```bash
cd server
cp .env.example .env
# Edit .env and paste your MongoDB Atlas connection string
npm install
npm run dev
```

### 4. Client Setup
```bash
cd client
npm install
npm run dev
```

## 🚀 Running the App

| Command | Description |
|---------|-------------|
| `cd server && npm run dev` | Start backend (port 5000) |
| `cd client && npm run dev` | Start frontend (port 5173) |

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, CSS |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Dev Tools | Nodemon, ESLint |

## 🌿 Environment Variables

Create `server/.env` (see `server/.env.example`):

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/bidding
PORT=5000
CLIENT_URL=http://localhost:5173
```

> **Never commit `.env` files — they are listed in `.gitignore`**

## 📌 Author
**JAYASURYASENTHIL** — jayasuryas.23aim@kongu.edu
