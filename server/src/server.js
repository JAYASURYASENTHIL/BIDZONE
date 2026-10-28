import 'dotenv/config';
import connectDB from './config/db.js';
import createApp from './app.js';

const PORT = process.env.PORT || 5000;

// Guard: SESSION_SECRET must be set
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET is not set in environment variables. Refusing to start.');
  process.exit(1);
}

const start = async () => {
  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  });
};

start();
