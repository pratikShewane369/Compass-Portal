import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

import app from './app.js';
import { connectDB } from './config/db.js';
import { seedCampusHireDatabase } from './seed/seedData.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

export async function startServer() {
  // 1. Connect to MongoDB via Mongoose
  await connectDB();

  // 2. Seed initial placement records if database is empty
  await seedCampusHireDatabase(false);

  // 3. Attach Vite dev server or serve production static bundle
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusHire Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CampusHire Server] Startup failure:', err);
  process.exit(1);
});
