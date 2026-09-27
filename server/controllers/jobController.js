import Job from '../models/Job.js';
import Company from '../models/Company.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import StudentProfile from '../models/StudentProfile.js';
import Application from '../models/Application.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import { evaluateEligibility } from '../services/eligibilityService.js';
import { getCache, setCache, invalidateCachePattern } from '../config/redis.js';

/**
 * @desc    List jobs with search, filtering, pagination, and backend eligibility evaluation
 * @route   GET /api/jobs
 * @access  Private / Optional Auth
 */
export const getJobs = asyncHandler(async (req, res) => {
  const {
    search = '',
    branch = '',
    minCgpa = '',
    location = '',
    jobType = '',
    company = '',
    status = 'OPEN',
    page = 1,
    limit = 10,
  } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));

  const query = {};

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (jobType && jobType !== 'ALL') {
    query.jobType = jobType;
  }

  if (company) {
    query.company = company;
  }

  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  if (branch && branch !== 'ALL') {
    query['eligibility.allowedBranches'] = branch;
  }

  if (minCgpa !== '' && !Number.isNaN(Number(minCgpa))) {
    query['eligibility.minCgpa'] = { $lte: Number(minCgpa) };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const cacheKey = `jobs:${JSON.stringify({ query, pageNum, limitNum })}`;
  let cachedResult = await getCache(cacheKey);

  let rawJobs;
  let total;

  if (cachedResult) {
    rawJobs = cachedResult.rawJobs;
    total = cachedResult.total;
  } else {
    total = await Job.countDocuments(query);
    const jobsDocs = await Job.find(query)
      .populate('company', 'name location industry tier website')
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    rawJobs = jobsDocs.map((j) => (j.toObject ? j.toObject() : j));
    await setCache(cacheKey, { rawJobs, total }, 45);
  }

  // If logged-in user is a STUDENT, compute real-time backend eligibility for every job
  let studentProfile = null;
  let appliedJobMap = new Map();

  if (req.user && req.user.role === 'STUDENT') {
    studentProfile = await StudentProfile.findOne({ user: req.user._id });
    const myApps = await Application.find({ student: req.user._id });
    for (const app of myApps) {
      appliedJobMap.set(String(app.job), app.status);
    }
  }

  const enrichedJobs = rawJobs.map((job) => {
    const eligibilityReport = studentProfile
      ? evaluateEligibility(studentProfile, job)
      : null;
    const applicationStatus = appliedJobMap.get(String(job._id)) || null;

    return {
      ...job,
      eligibilityReport,
      hasApplied: Boolean(applicationStatus),
      applicationStatus,
    };
  });

  res.status(200).json({
    success: true,
    message: 'Jobs retrieved successfully',
    data: {
      jobs: enrichedJobs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    },
  });
});

/**
 * @desc    Get single job details + full backend eligibility evaluation for students
 * @route   GET /api/jobs/:id
 * @access  Private
 */
export const getJobById = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
    .populate('company', 'name location industry tier website description')
    .populate('postedBy', 'name email');

  if (!job) {
    throw new ApiError(404, 'Job opening not found');
  }

  const jobObj = job.toObject ? job.toObject() : job;
  let eligibility = null;
  let existingApplication = null;

  if (req.user && req.user.role === 'STUDENT') {
    const studentProfile = await StudentProfile.findOne({ user: req.user._id });
    eligibility = evaluateEligibility(studentProfile, jobObj);
    existingApplication = await Application.findOne({
      student: req.user._id,
      job: job._id,
    });
  }

  const applicantsCount = await Application.countDocuments({ job: job._id });

  res.status(200).json({
    success: true,
    message: 'Job details fetched successfully',
    data: {
      job: jobObj,
      applicantsCount,
      eligibility,
      existingApplication,
    },
  });
});

/**
 * @desc    Create a new job opening
 * @route   POST /api/jobs
 * @access  Private (RECRUITER, ADMIN)
 */
export const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    companyId,
    description,
    jobType = 'FULL_TIME',
    location,
    workMode = 'HYBRID',
    packageLPA,
    stipendPerMonth = 0,
    openings = 1,
    deadline,
    eligibility = {},
  } = req.body;

  if (!title || !description || !location || packageLPA === undefined || !deadline) {
    throw new ApiError(
      400,
      'Please provide job title, description, location, package (LPA), and application deadline.'
    );
  }

  let targetCompanyId = companyId;

  if (req.user.role === 'RECRUITER') {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    if (!recProfile || !recProfile.company) {
      throw new ApiError(400, 'Please configure your company profile before posting a job.');
    }
    targetCompanyId = recProfile.company;
  } else if (!targetCompanyId) {
    const defaultCompany = await Company.findOne({});
    if (!defaultCompany) {
      throw new ApiError(400, 'Please specify a valid companyId.');
    }
    targetCompanyId = defaultCompany._id;
  }

  const parsedSkills = Array.isArray(eligibility.requiredSkills)
    ? eligibility.requiredSkills.map((s) => String(s).trim()).filter(Boolean)
    : String(eligibility.requiredSkills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const parsedBranches =
    Array.isArray(eligibility.allowedBranches) && eligibility.allowedBranches.length > 0
      ? eligibility.allowedBranches
      : ['CSE', 'IT', 'ECE'];

  const job = await Job.create({
    title: title.trim(),
    company: targetCompanyId,
    postedBy: req.user._id,
    description,
    jobType,
    location: location.trim(),
    workMode,
    packageLPA: Number(packageLPA),
    stipendPerMonth: Number(stipendPerMonth) || 0,
    openings: Number(openings) || 1,
    deadline: new Date(deadline),
    status: 'OPEN',
    eligibility: {
      minCgpa: Number(eligibility.minCgpa ?? 7.0),
      allowedBranches: parsedBranches,
      graduationYear: Number(eligibility.graduationYear ?? 2027),
      maxBacklogs: Number(eligibility.maxBacklogs ?? 0),
      requiredSkills: parsedSkills,
    },
  });

  await invalidateCachePattern('jobs:');

  const populatedJob = await Job.findById(job._id).populate(
    'company',
    'name location industry tier'
  );

  res.status(201).json({
    success: true,
    message: 'Job opportunity created and published successfully',
    data: populatedJob,
  });
});

/**
 * @desc    Update an existing job opening
 * @route   PUT /api/jobs/:id
 * @access  Private (RECRUITER, ADMIN)
 */
export const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job opening not found');
  }

  // Ensure recruiter only modifies their own company's jobs
  if (
    req.user.role === 'RECRUITER' &&
    String(job.postedBy) !== String(req.user._id)
  ) {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    if (!recProfile || String(recProfile.company) !== String(job.company)) {
      throw new ApiError(403, 'You are only authorized to modify jobs belonging to your company.');
    }
  }

  const updatableFields = [
    'title',
    'description',
    'jobType',
    'location',
    'workMode',
    'packageLPA',
    'stipendPerMonth',
    'openings',
    'deadline',
    'status',
  ];

  for (const field of updatableFields) {
    if (req.body[field] !== undefined) {
      job[field] = req.body[field];
    }
  }

  if (req.body.eligibility) {
    const el = req.body.eligibility;
    job.eligibility = {
      minCgpa: el.minCgpa !== undefined ? Number(el.minCgpa) : job.eligibility.minCgpa,
      allowedBranches: Array.isArray(el.allowedBranches)
        ? el.allowedBranches
        : job.eligibility.allowedBranches,
      graduationYear:
        el.graduationYear !== undefined
          ? Number(el.graduationYear)
          : job.eligibility.graduationYear,
      maxBacklogs:
        el.maxBacklogs !== undefined ? Number(el.maxBacklogs) : job.eligibility.maxBacklogs,
      requiredSkills: Array.isArray(el.requiredSkills)
        ? el.requiredSkills
        : typeof el.requiredSkills === 'string'
        ? el.requiredSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : job.eligibility.requiredSkills,
    };
  }

  await job.save();
  await invalidateCachePattern('jobs:');

  const updated = await Job.findById(job._id).populate('company', 'name location industry tier');

  res.status(200).json({
    success: true,
    message: 'Job opening updated successfully',
    data: updated,
  });
});

/**
 * @desc    Close or delete a job opening
 * @route   DELETE /api/jobs/:id
 * @access  Private (RECRUITER, ADMIN)
 */
export const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    throw new ApiError(404, 'Job opening not found');
  }

  if (
    req.user.role === 'RECRUITER' &&
    String(job.postedBy) !== String(req.user._id)
  ) {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    if (!recProfile || String(recProfile.company) !== String(job.company)) {
      throw new ApiError(403, 'You are not authorized to delete this job posting.');
    }
  }

  job.status = 'CLOSED';
  await job.save();
  await invalidateCachePattern('jobs:');

  res.status(200).json({
    success: true,
    message: 'Job opening closed successfully',
    data: { _id: job._id, status: job.status },
  });
});
