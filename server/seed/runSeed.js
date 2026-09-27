import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { seedCampusHireDatabase } from './seedData.js';

dotenv.config();

async function run() {
  await connectDB();
  const result = await seedCampusHireDatabase(true);
  console.log(`[Seed] ${result.message}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
