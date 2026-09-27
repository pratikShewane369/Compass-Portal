import mongoose from 'mongoose';
import { enableInMemoryMongooseAdapter, getInMemoryStats } from './inMemoryMongoAdapter.js';

let dbState = {
  connected: false,
  mode: 'DISCONNECTED', // 'MONGODB_NATIVE' | 'MONGOOSE_MEMORY_ENGINE'
  host: null,
  databaseName: 'campushire_db',
  connectedAt: null,
};

/**
 * Connects to MongoDB using Mongoose.
 * If MONGO_URI is provided and reachable, connects via standard MongoDB wire protocol.
 * If running in a container/sandbox without a live mongod daemon, seamlessly activates
 * the Mongoose In-Memory Engine so all Mongoose models, schemas, indexes, and queries work.
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri && mongoUri !== 'MY_MONGO_URI') {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2500,
      });

      dbState = {
        connected: true,
        mode: 'MONGODB_NATIVE',
        host: conn.connection.host,
        databaseName: conn.connection.name || 'campushire_db',
        connectedAt: new Date().toISOString(),
      };

      console.log(`[MongoDB] Connected natively: ${conn.connection.host}/${dbState.databaseName}`);
      return dbState;
    } catch (error) {
      console.warn(
        `[MongoDB] Native daemon at ${mongoUri} unreachable (${error.message}). Switching to Mongoose In-Memory Engine.`
      );
    }
  }

  enableInMemoryMongooseAdapter();
  dbState = {
    connected: true,
    mode: 'MONGOOSE_MEMORY_ENGINE',
    host: '127.0.0.1:27017 (Mongoose Memory Engine)',
    databaseName: 'campushire_db',
    connectedAt: new Date().toISOString(),
  };

  console.log(`[MongoDB] Mongoose In-Memory Engine active for database: ${dbState.databaseName}`);
  return dbState;
};

export const getDatabaseStatus = () => {
  return {
    ...dbState,
    collections: getInMemoryStats(),
  };
};
