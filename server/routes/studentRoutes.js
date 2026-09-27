import express from 'express';
import {
  getStudentProfile,
  updateStudentProfile,
  uploadStudentResume,
  getStudentDashboard,
} from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { resumeUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect, authorize('STUDENT'));

router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);
router.post('/resume', resumeUpload.single('resume'), uploadStudentResume);
router.get('/dashboard', getStudentDashboard);

export default router;
