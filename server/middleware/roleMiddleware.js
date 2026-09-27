import { ApiError } from './errorMiddleware.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to users matching one of the permitted roles.
 * Usage: authorize('ADMIN', 'RECRUITER')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before checking role permissions.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access Denied: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    if (req.user.role === 'RECRUITER' && req.user.isApproved === false) {
      return next(
        new ApiError(
          403,
          'Your recruiter account is pending approval from the Placement Officer.'
        )
      );
    }

    next();
  };
};
