import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import { getDatabaseStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';

/**
 * @desc    Get Admin / Placement Officer comprehensive dashboard & analytics
 * @route   GET /api/admin/dashboard
 * @access  Private (ADMIN)
 */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const analyticsData = await buildPlacementAnalytics();

  const recentApplications = await Application.find({})
    .populate('student', 'name email')
    .populate('studentProfile')
    .populate({
      path: 'job',
      select: 'title packageLPA location company',
      populate: { path: 'company', select: 'name tier' },
    })
    .sort({ createdAt: -1 })
    .limit(10);

  const upcomingInterviews = await Interview.find({})
    .populate('student', 'name email')
    .populate({
      path: 'job',
      select: 'title packageLPA company',
      populate: { path: 'company', select: 'name' },
    })
    .sort({ scheduledAt: 1 })
    .limit(8);

  res.status(200).json({
    success: true,
    message: 'Placement Officer dashboard data retrieved',
    data: {
      ...analyticsData,
      recentApplications,
      upcomingInterviews,
      systemTelemetry: {
        database: getDatabaseStatus(),
        cache: getRedisStatus(),
      },
    },
  });
});

/**
 * Helper to compute placement statistics, branch-wise metrics, and company-wise hiring data
 */
async function buildPlacementAnalytics() {
  const students = await StudentProfile.find({})
    .populate('user', 'name email isActive')
    .populate('placedCompany', 'name tier');
  const companies = await Company.find({});
  const jobs = await Job.find({}).populate('company', 'name tier');
  const applications = await Application.find({}).populate({
    path: 'job',
    populate: { path: 'company', select: 'name tier' },
  });
  const interviews = await Interview.find({});

  const totalStudents = students.length;
  const placedStudentsList = students.filter((s) => s.placementStatus === 'PLACED');
  const totalPlacedStudents = placedStudentsList.length;

  const placementPercentage =
    totalStudents > 0 ? Number(((totalPlacedStudents / totalStudents) * 100).toFixed(1)) : 0;

  const shortlistedStudentsSet = new Set(
    applications
      .filter((a) => ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED'].includes(a.status))
      .map((a) => String(a.student))
  );

  // Average & Highest Package (LPA)
  const placedPackages = placedStudentsList
    .map((s) => Number(s.placedPackageLPA || 0))
    .filter((p) => p > 0);

  const allJobPackages = jobs.map((j) => Number(j.packageLPA || 0)).filter((p) => p > 0);
  const packagePool = placedPackages.length > 0 ? placedPackages : allJobPackages;

  const averagePackageLPA =
    packagePool.length > 0
      ? Number((packagePool.reduce((acc, v) => acc + v, 0) / packagePool.length).toFixed(2))
      : 0;

  const highestPackageLPA =
    packagePool.length > 0 ? Number(Math.max(...packagePool).toFixed(2)) : 0;

  // Branch-wise placement statistics
  const branchList = ['CSE', 'IT', 'ECE', 'AIML', 'EEE', 'MECH'];
  const branchStatsMap = new Map();

  for (const b of branchList) {
    branchStatsMap.set(b, { branch: b, totalStudents: 0, placedStudents: 0, avgCgpa: 0, cgpaSum: 0 });
  }

  for (const s of students) {
    const b = s.branch || 'CSE';
    if (!branchStatsMap.has(b)) {
      branchStatsMap.set(b, { branch: b, totalStudents: 0, placedStudents: 0, avgCgpa: 0, cgpaSum: 0 });
    }
    const entry = branchStatsMap.get(b);
    entry.totalStudents += 1;
    entry.cgpaSum += Number(s.cgpa || 0);
    if (s.placementStatus === 'PLACED') {
      entry.placedStudents += 1;
    }
  }

  const branchWiseStats = Array.from(branchStatsMap.values())
    .filter((b) => b.totalStudents > 0)
    .map((b) => ({
      branch: b.branch,
      totalStudents: b.totalStudents,
      placedStudents: b.placedStudents,
      unplacedStudents: b.totalStudents - b.placedStudents,
      placementRate:
        b.totalStudents > 0 ? Number(((b.placedStudents / b.totalStudents) * 100).toFixed(1)) : 0,
      avgCgpa: b.totalStudents > 0 ? Number((b.cgpaSum / b.totalStudents).toFixed(2)) : 0,
    }));

  // Company-wise hiring statistics
  const companyStats = companies.map((comp) => {
    const compJobs = jobs.filter(
      (j) => String(j.company?._id || j.company) === String(comp._id)
    );
    const compJobIds = new Set(compJobs.map((j) => String(j._id)));
    const compApps = applications.filter((a) =>
      compJobIds.has(String(a.job?._id || a.job))
    );
    const selectedCount = compApps.filter((a) => a.status === 'SELECTED').length;
    const shortlistedCount = compApps.filter((a) =>
      ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED'].includes(a.status)
    ).length;
    const maxCtc =
      compJobs.length > 0
        ? Math.max(...compJobs.map((j) => Number(j.packageLPA || 0)))
        : 0;

    return {
      _id: comp._id,
      companyName: comp.name,
      tier: comp.tier,
      industry: comp.industry,
      jobsCount: compJobs.length,
      totalApplications: compApps.length,
      shortlistedCount,
      hiredCount: selectedCount,
      maxPackageLPA: maxCtc,
    };
  });

  // Application funnel breakdown
  const statusDistribution = [
    { status: 'APPLIED', count: applications.filter((a) => a.status === 'APPLIED').length },
    { status: 'SHORTLISTED', count: applications.filter((a) => a.status === 'SHORTLISTED').length },
    {
      status: 'INTERVIEW_SCHEDULED',
      count: applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length,
    },
    { status: 'SELECTED', count: applications.filter((a) => a.status === 'SELECTED').length },
    { status: 'REJECTED', count: applications.filter((a) => a.status === 'REJECTED').length },
  ];

  return {
    overview: {
      totalStudents,
      totalCompanies: companies.length,
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === 'OPEN').length,
      totalApplications: applications.length,
      totalShortlistedStudents: shortlistedStudentsSet.size,
      totalPlacedStudents,
      totalInterviews: interviews.length,
      placementPercentage,
      averagePackageLPA,
      highestPackageLPA,
    },
    branchWiseStats,
    companyWiseStats: companyStats,
    statusDistribution,
    selectedStudents: placedStudentsList,
  };
}

/**
 * @desc    Get placement analytics for charts and reporting
 * @route   GET /api/admin/analytics
 * @access  Private (ADMIN)
 */
export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const analytics = await buildPlacementAnalytics();
  res.status(200).json({
    success: true,
    message: 'Placement analytics generated successfully',
    data: analytics,
  });
});

/**
 * @desc    Get all registered students with profile and placement details
 * @route   GET /api/admin/students
 * @access  Private (ADMIN)
 */
export const getAdminStudents = asyncHandler(async (req, res) => {
  const { branch = 'ALL', placementStatus = 'ALL', search = '' } = req.query;

  const profiles = await StudentProfile.find({})
    .populate('user', 'name email role isActive lastLogin createdAt')
    .populate('placedCompany', 'name location tier')
    .sort({ cgpa: -1 });

  const filtered = profiles.filter((p) => {
    if (branch !== 'ALL' && p.branch !== branch) return false;
    if (placementStatus !== 'ALL' && p.placementStatus !== placementStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = String(p.user?.name || '').toLowerCase().includes(q);
      const emailMatch = String(p.user?.email || '').toLowerCase().includes(q);
      const rollMatch = String(p.rollNumber || '').toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !rollMatch) return false;
    }
    return true;
  });

  res.status(200).json({
    success: true,
    message: 'All students retrieved',
    data: filtered,
  });
});

/**
 * @desc    Get all registered recruiters & their company associations
 * @route   GET /api/admin/recruiters
 * @access  Private (ADMIN)
 */
export const getAdminRecruiters = asyncHandler(async (req, res) => {
  const recruiters = await RecruiterProfile.find({})
    .populate('user', 'name email role isActive isApproved createdAt')
    .populate('company', 'name website industry location tier isVerified')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'All recruiters retrieved',
    data: recruiters,
  });
});

/**
 * @desc    Get all registered companies
 * @route   GET /api/admin/companies
 * @access  Private (ADMIN)
 */
export const getAdminCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find({})
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Companies retrieved',
    data: companies,
  });
});

/**
 * @desc    Get all applications across the campus
 * @route   GET /api/admin/applications
 * @access  Private (ADMIN)
 */
export const getAdminApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({})
    .populate('student', 'name email')
    .populate('studentProfile')
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name location tier' },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'All campus applications retrieved',
    data: applications,
  });
});

/**
 * @desc    Enable/disable user account or approve recruiter account
 * @route   PATCH /api/admin/users/:userId/status
 * @access  Private (ADMIN)
 */
export const updateUserAccountStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive, isApproved } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (String(user._id) === String(req.user._id) && isActive === false) {
    throw new ApiError(400, 'You cannot disable your own administrator account.');
  }

  if (isActive !== undefined) user.isActive = Boolean(isActive);
  if (isApproved !== undefined) user.isApproved = Boolean(isApproved);

  await user.save();

  res.status(200).json({
    success: true,
    message: `User account status updated (${user.name})`,
    data: user,
  });
});
