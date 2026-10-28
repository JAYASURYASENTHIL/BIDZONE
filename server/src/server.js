import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import createApp from './app.js';
import { startAuctionCloser } from './services/auctionCloser.js';

const PORT = process.env.PORT || 5000;

if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is not set in environment variables. Refusing to start.');
  process.exit(1);
}

const start = async () => {
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);

  // Setup Socket.io for real-time bid updates
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  app.set('io', io);

  io.on('connection', (socket) => {
    socket.on('join:auction', (auctionId) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('leave:auction', (auctionId) => {
      socket.leave(`auction:${auctionId}`);
    });
  });

  // Start background closer for handling expired auctions
  startAuctionCloser(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 BIDZONE Server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
