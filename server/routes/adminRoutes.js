import express from 'express';
import {
  getAdminDashboard,
  getAdminAnalytics,
  getAdminStudents,
  getAdminRecruiters,
  getAdminCompanies,
  getAdminApplications,
  updateUserAccountStatus,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect, authorize('ADMIN'));

router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);
router.get('/students', getAdminStudents);
router.get('/recruiters', getAdminRecruiters);
router.get('/companies', getAdminCompanies);
router.get('/applications', getAdminApplications);
router.patch('/users/:userId/status', updateUserAccountStatus);

export default router;
