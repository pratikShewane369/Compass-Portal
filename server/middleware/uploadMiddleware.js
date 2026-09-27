import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from './errorMiddleware.js';

const uploadDir = path.resolve(process.cwd(), 'uploads/resumes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `resume-${req.user?._id || 'student'}-${uniqueSuffix}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only PDF resumes (.pdf) are allowed.'), false);
  }
};

export const resumeUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});
