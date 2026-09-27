import StudentProfile from '../models/StudentProfile.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import Notification from '../models/Notification.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import {
  evaluateEligibility,
  calculateProfileCompletion,
} from '../services/eligibilityService.js';

/**
 * @desc    Get current student's profile
 * @route   GET /api/students/profile
 * @access  Private (STUDENT)
 */
export const getStudentProfile = asyncHandler(async (req, res) => {
  let profile = await StudentProfile.findOne({ user: req.user._id })
    .populate('user', 'name email role')
    .populate('placedCompany', 'name location tier');

  if (!profile) {
    profile = await StudentProfile.create({
      user: req.user._id,
      rollNumber: `BT2027${Math.floor(1000 + Math.random() * 9000)}`,
      branch: 'CSE',
      graduationYear: 2027,
      cgpa: 7.5,
      activeBacklogs: 0,
      skills: ['JavaScript', 'React'],
    });
    profile = await StudentProfile.findById(profile._id).populate('user', 'name email role');
  }

  res.status(200).json({
    success: true,
    message: 'Student profile retrieved successfully',
    data: profile,
  });
});

/**
 * @desc    Update current student's academic & technical profile
 * @route   PUT /api/students/profile
 * @access  Private (STUDENT)
 */
export const updateStudentProfile = asyncHandler(async (req, res) => {
  const {
    name,
    rollNumber,
    phone,
    college,
    branch,
    graduationYear,
    cgpa,
    activeBacklogs,
    historyOfBacklogs,
    skills,
    projects,
    experience,
    education,
  } = req.body;

  if (name) {
    await User.findByIdAndUpdate(req.user._id, { name: name.trim() });
  }

  let profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, 'Student profile not found');
  }

  if (rollNumber !== undefined) profile.rollNumber = String(rollNumber).trim();
  if (phone !== undefined) profile.phone = String(phone).trim();
  if (college !== undefined) profile.college = String(college).trim();
  if (branch !== undefined) profile.branch = branch;
  if (graduationYear !== undefined) profile.graduationYear = Number(graduationYear);
  if (cgpa !== undefined) {
    const parsedCgpa = Number(cgpa);
    if (parsedCgpa < 0 || parsedCgpa > 10) {
      throw new ApiError(400, 'CGPA must be between 0.0 and 10.0');
    }
    profile.cgpa = parsedCgpa;
  }
  if (activeBacklogs !== undefined) profile.activeBacklogs = Math.max(0, Number(activeBacklogs));
  if (historyOfBacklogs !== undefined)
    profile.historyOfBacklogs = Math.max(0, Number(historyOfBacklogs));

  if (skills !== undefined) {
    profile.skills = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean)
      : String(skills)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  }

  if (Array.isArray(projects)) profile.projects = projects;
  if (Array.isArray(experience)) profile.experience = experience;
  if (Array.isArray(education)) profile.education = education;

  profile.profileCompletionScore = calculateProfileCompletion(profile);
  await profile.save();

  const updated = await StudentProfile.findById(profile._id)
    .populate('user', 'name email role')
    .populate('placedCompany', 'name location tier');

  res.status(200).json({
    success: true,
    message: 'Student profile updated successfully',
    data: updated,
  });
});

/**
 * @desc    Upload or update student PDF resume
 * @route   POST /api/students/resume
 * @access  Private (STUDENT)
 */
export const uploadStudentResume = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, 'Student profile not found');
  }

  let resumeUrl = '';
  let resumeName = '';

  if (req.file) {
    resumeUrl = `/uploads/resumes/${req.file.filename}`;
    resumeName = req.file.originalname;
  } else if (req.body.resumeUrl || req.body.resumeName) {
    // Allow direct PDF metadata/URL update if uploaded via client reader
    const fileName = req.body.resumeName || 'Student_Resume.pdf';
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      throw new ApiError(400, 'Only PDF resume files (.pdf) are allowed.');
    }
    resumeName = fileName;
    resumeUrl = req.body.resumeUrl || `/uploads/resumes/${Date.now()}-${fileName}`;
  } else {
    throw new ApiError(400, 'Please attach a valid PDF resume file (max 5MB).');
  }

  profile.resumeUrl = resumeUrl;
  profile.resumeName = resumeName;
  profile.resumeUploadedAt = new Date();
  profile.profileCompletionScore = calculateProfileCompletion(profile);

  await profile.save();

  res.status(200).json({
    success: true,
    message: 'PDF Resume uploaded and linked to your profile successfully',
    data: {
      resumeUrl: profile.resumeUrl,
      resumeName: profile.resumeName,
      resumeUploadedAt: profile.resumeUploadedAt,
      profileCompletionScore: profile.profileCompletionScore,
    },
  });
});

/**
 * @desc    Get student dashboard summary, metrics, eligible jobs, and upcoming interviews
 * @route   GET /api/students/dashboard
 * @access  Private (STUDENT)
 */
export const getStudentDashboard = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id })
    .populate('user', 'name email')
    .populate('placedCompany', 'name location tier');

  const applications = await Application.find({ student: req.user._id })
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name location tier industry' },
    })
    .sort({ createdAt: -1 });

  const appliedJobIds = new Set(
    applications.map((app) => String(app.job?._id || app.job))
  );

  const openJobs = await Job.find({ status: 'OPEN' })
    .populate('company', 'name location industry tier website')
    .sort({ createdAt: -1 });

  const evaluatedJobs = openJobs.map((job) => {
    const jobObj = job.toObject ? job.toObject() : job;
    const eligibilityReport = evaluateEligibility(profile, jobObj);
    return {
      ...jobObj,
      eligibilityReport,
      hasApplied: appliedJobIds.has(String(jobObj._id)),
    };
  });

  const eligibleJobs = evaluatedJobs.filter((j) => j.eligibilityReport.eligible);

  const interviews = await Interview.find({ student: req.user._id })
    .populate({
      path: 'job',
      select: 'title packageLPA location company',
      populate: { path: 'company', select: 'name location' },
    })
    .sort({ scheduledAt: 1 });

  const notifications = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 })
    .limit(8);

  const stats = {
    profileCompletion: profile ? calculateProfileCompletion(profile) : 0,
    totalApplications: applications.length,
    shortlistedCount: applications.filter((a) =>
      ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED'].includes(a.status)
    ).length,
    interviewsScheduled: interviews.filter((i) => i.status === 'SCHEDULED').length,
    selectedOffers: applications.filter((a) => a.status === 'SELECTED').length,
    availableEligibleJobsCount: eligibleJobs.length,
    totalOpenJobsCount: openJobs.length,
  };

  res.status(200).json({
    success: true,
    message: 'Student dashboard loaded',
    data: {
      profile,
      stats,
      eligibleJobs: eligibleJobs.slice(0, 6),
      allEvaluatedJobs: evaluatedJobs.slice(0, 8),
      recentApplications: applications.slice(0, 6),
      upcomingInterviews: interviews,
      notifications,
    },
  });
});
