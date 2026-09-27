import express from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, getJobs);
router.get('/:id', optionalAuth, getJobById);
router.post('/', protect, authorize('RECRUITER', 'ADMIN'), createJob);
router.put('/:id', protect, authorize('RECRUITER', 'ADMIN'), updateJob);
router.delete('/:id', protect, authorize('RECRUITER', 'ADMIN'), deleteJob);

export default router;
