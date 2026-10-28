import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

const createApp = () => {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // ── Security headers (allow cross-origin images for static uploads) ─────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // ── CORS — credentialed, exact origin only ──────────────────────────────────
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true, // required for cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
    })
  );

  // ── Body parsers ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Static folder for uploaded photos ───────────────────────────────────────
  app.use('/uploads', express.static(uploadsDir));

  // ── Session — stored in MongoDB Atlas via connect-mongo ────────────────────
  app.use(
    session({
      name: process.env.SESSION_COOKIE_NAME || 'campus.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: 'bidding',
        collectionName: 'sessions',
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        autoRemove: 'native',
      }),
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  if (isProd) app.set('trust proxy', 1);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({ success: true, message: 'Campus Bidding API is running 🚀' });
  });

  // ── API routes ──────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/alerts', alertRoutes);

  // ── 404 handler ─────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
  });

  // ── Centralised error handler (must be last) ───────────────────────────────
  app.use(errorHandler);

  return app;
};

export default createApp;
