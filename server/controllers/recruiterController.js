import RecruiterProfile from '../models/RecruiterProfile.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';

/**
 * @desc    Get Recruiter Dashboard metrics, company info, jobs, and pipeline summary
 * @route   GET /api/recruiters/dashboard
 * @access  Private (RECRUITER)
 */
export const getRecruiterDashboard = asyncHandler(async (req, res) => {
  let recProfile = await RecruiterProfile.findOne({ user: req.user._id }).populate('company');

  if (!recProfile) {
    // Auto-bootstrap if needed
    const company = await Company.create({
      name: `${req.user.name.split(' ')[0]} Systems`,
      industry: 'Enterprise Software',
      location: 'Bengaluru, India',
      description: 'Technology partner hiring campus engineering talent.',
      tier: 'TIER_1_DREAM',
      createdBy: req.user._id,
    });
    recProfile = await RecruiterProfile.create({
      user: req.user._id,
      company: company._id,
      designation: 'Senior Technical Recruiter',
    });
    recProfile = await RecruiterProfile.findById(recProfile._id).populate('company');
  }

  const companyId = recProfile.company?._id || recProfile.company;
  const jobs = await Job.find({ company: companyId })
    .populate('company', 'name location industry tier')
    .sort({ createdAt: -1 });

  const jobIds = jobs.map((j) => j._id);

  const applications = await Application.find({ job: { $in: jobIds } })
    .populate('student', 'name email')
    .populate('studentProfile')
    .populate('job', 'title packageLPA location status')
    .sort({ createdAt: -1 });

  const interviews = await Interview.find({ job: { $in: jobIds } })
    .populate('student', 'name email')
    .populate('job', 'title packageLPA')
    .sort({ scheduledAt: 1 });

  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status === 'OPEN').length,
    totalApplicants: applications.length,
    shortlistedCandidates: applications.filter((a) =>
      ['SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(a.status)
    ).length,
    interviewsScheduled: interviews.filter((i) => i.status === 'SCHEDULED').length,
    selectedCandidates: applications.filter((a) => a.status === 'SELECTED').length,
  };

  // Pipeline breakdown by status
  const pipelineBreakdown = {
    APPLIED: applications.filter((a) => a.status === 'APPLIED').length,
    SHORTLISTED: applications.filter((a) => a.status === 'SHORTLISTED').length,
    INTERVIEW_SCHEDULED: applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length,
    SELECTED: applications.filter((a) => a.status === 'SELECTED').length,
    REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
  };

  res.status(200).json({
    success: true,
    message: 'Recruiter dashboard loaded',
    data: {
      recruiterProfile: recProfile,
      company: recProfile.company,
      stats,
      pipelineBreakdown,
      jobs,
      recentApplicants: applications.slice(0, 12),
      interviews,
    },
  });
});

/**
 * @desc    Update recruiter's company profile & recruiter designation
 * @route   PUT /api/recruiters/company
 * @access  Private (RECRUITER)
 */
export const updateRecruiterCompany = asyncHandler(async (req, res) => {
  const { name, website, industry, location, description, tier, designation, phone } = req.body;

  const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
  if (!recProfile) {
    throw new ApiError(404, 'Recruiter profile not found');
  }

  if (designation) recProfile.designation = designation.trim();
  if (phone !== undefined) recProfile.phone = phone.trim();
  await recProfile.save();

  const company = await Company.findById(recProfile.company);
  if (company) {
    if (name) company.name = name.trim();
    if (website !== undefined) company.website = website.trim();
    if (industry) company.industry = industry.trim();
    if (location) company.location = location.trim();
    if (description) company.description = description.trim();
    if (tier) company.tier = tier;
    await company.save();
  }

  const updated = await RecruiterProfile.findById(recProfile._id).populate('company');

  res.status(200).json({
    success: true,
    message: 'Company and recruiter profile updated successfully',
    data: updated,
  });
});

/**
 * @desc    Get all jobs posted under the recruiter's company
 * @route   GET /api/recruiters/jobs
 * @access  Private (RECRUITER)
 */
export const getRecruiterJobs = asyncHandler(async (req, res) => {
  const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
  if (!recProfile) {
    throw new ApiError(404, 'Recruiter profile not found');
  }

  const jobs = await Job.find({ company: recProfile.company })
    .populate('company', 'name location industry tier')
    .sort({ createdAt: -1 });

  const enriched = await Promise.all(
    jobs.map(async (job) => {
      const jobObj = job.toObject ? job.toObject() : job;
      const totalApplicants = await Application.countDocuments({ job: job._id });
      const shortlisted = await Application.countDocuments({
        job: job._id,
        status: { $in: ['SHORTLISTED', 'INTERVIEW_SCHEDULED'] },
      });
      const selected = await Application.countDocuments({
        job: job._id,
        status: 'SELECTED',
      });

      return {
        ...jobObj,
        metrics: { totalApplicants, shortlisted, selected },
      };
    })
  );

  res.status(200).json({
    success: true,
    message: 'Recruiter jobs retrieved',
    data: enriched,
  });
});

/**
 * @desc    Get applicants for a specific job with filtering (CGPA, branch, graduationYear, status, search)
 * @route   GET /api/recruiters/jobs/:jobId/applicants
 * @access  Private (RECRUITER, ADMIN)
 */
export const getJobApplicants = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const {
    status = 'ALL',
    branch = 'ALL',
    minCgpa = '',
    graduationYear = '',
    search = '',
  } = req.query;

  const job = await Job.findById(jobId).populate('company', 'name location tier');
  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (req.user.role === 'RECRUITER') {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    const jobCompId = job.company?._id || job.company;
    if (!recProfile || String(recProfile.company) !== String(jobCompId)) {
      throw new ApiError(403, 'You are not authorized to view applicants for this job.');
    }
  }

  const appFilter = { job: job._id };
  if (status && status !== 'ALL') {
    appFilter.status = status;
  }

  const applications = await Application.find(appFilter)
    .populate('student', 'name email')
    .populate('studentProfile')
    .populate('job', 'title packageLPA location')
    .sort({ createdAt: -1 });

  // Filter on populated student & studentProfile attributes
  const filtered = applications.filter((app) => {
    const profile = app.studentProfile || {};
    const student = app.student || {};

    if (branch && branch !== 'ALL' && profile.branch !== branch) {
      return false;
    }

    if (minCgpa !== '' && Number(profile.cgpa || 0) < Number(minCgpa)) {
      return false;
    }

    if (
      graduationYear !== '' &&
      Number(profile.graduationYear) !== Number(graduationYear)
    ) {
      return false;
    }

    if (search) {
      const q = search.toLowerCase();
      const nameMatch = String(student.name || '').toLowerCase().includes(q);
      const emailMatch = String(student.email || '').toLowerCase().includes(q);
      const rollMatch = String(profile.rollNumber || '').toLowerCase().includes(q);
      const skillMatch = (profile.skills || []).some((s) =>
        String(s).toLowerCase().includes(q)
      );
      if (!nameMatch && !emailMatch && !rollMatch && !skillMatch) {
        return false;
      }
    }

    return true;
  });

  res.status(200).json({
    success: true,
    message: 'Job applicants retrieved successfully',
    data: {
      job,
      applicants: filtered,
      totalCount: filtered.length,
    },
  });
});
