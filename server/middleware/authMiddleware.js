import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from './errorMiddleware.js';

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'campushire_dev_jwt_secret_key_2026_secure';

export const generateToken = (userId, role) => {
  return jwt.sign({ id: String(userId), role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * Authentication middleware: verifies JWT from Authorization Bearer header or HTTP-only cookie
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.campushire_token) {
    token = req.cookies.campushire_token;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in to access this resource.');
  }

  const decoded = jwt.verify(token, getJwtSecret());
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'The user belonging to this token no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account has been disabled by the Placement Cell Administrator.'
    );
  }

  req.user = user;
  next();
});

/**
 * Optional authentication middleware for public endpoints that enrich response when logged in
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.campushire_token) {
    token = req.cookies.campushire_token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Ignore invalid token on optional auth routes
    }
  }
  next();
});
