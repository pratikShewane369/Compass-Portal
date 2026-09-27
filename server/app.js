import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { getDatabaseStatus } from './config/db.js';
import { getRedisStatus, invalidateCachePattern } from './config/redis.js';
import { seedCampusHireDatabase } from './seed/seedData.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import recruiterRoutes from './routes/recruiterRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { notFound, errorHandler, asyncHandler } from './middleware/errorMiddleware.js';

const app = express();

// Core Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded resume PDFs
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

/**
 * PHASE 1: Health-Check & System Architecture Status API
 * @route GET /api/health
 */
app.get('/api/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const cacheStatus = getRedisStatus();

  res.status(200).json({
    success: true,
    status: 'OK',
    service: 'CampusHire – College Placement & Recruitment Management API',
    stack: {
      frontend: 'React 19 + React Router + Axios + Recharts + Tailwind CSS',
      backend: 'Node.js + Express.js REST API',
      database: 'MongoDB + Mongoose ODM',
      authentication: 'JWT (JSON Web Token) + bcrypt Password Hashing + RBAC Middleware',
      caching: 'Redis Caching Layer (Fail-Open TTL Adapter)',
    },
    database: dbStatus,
    cache: cacheStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Reset / Re-seed Demo Database on Demand
 * @route POST /api/seed
 */
app.post(
  '/api/seed',
  asyncHandler(async (req, res) => {
    const result = await seedCampusHireDatabase(true);
    await invalidateCachePattern('jobs:');
    res.status(200).json({
      success: true,
      message: result.message,
      data: getDatabaseStatus(),
    });
  })
);

// Mount Modular REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch unmatched /api/* routes with centralized 404 & Error Middleware
app.use('/api/*', notFound);
app.use(errorHandler);

export default app;
