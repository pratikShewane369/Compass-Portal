import Application from '../models/Application.js';
import Job from '../models/Job.js';
import StudentProfile from '../models/StudentProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import { evaluateEligibility } from '../services/eligibilityService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Valid Application Workflow State Transitions
 * Prevents arbitrary or backward invalid status mutations from the frontend.
 */
const VALID_TRANSITIONS = {
  APPLIED: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED'],
  INTERVIEW_SCHEDULED: ['SELECTED', 'REJECTED', 'SHORTLISTED'],
  SELECTED: [],
  REJECTED: ['SHORTLISTED'], // Allow placement officer override if reconsidered
  WITHDRAWN: [],
};

/**
 * @desc    Submit a job application (enforces backend eligibility + duplicate prevention)
 * @route   POST /api/applications
 * @access  Private (STUDENT)
 */
export const applyToJob = asyncHandler(async (req, res) => {
  const { jobId, coverNote = '' } = req.body;

  if (!jobId) {
    throw new ApiError(400, 'Job ID is required to submit an application.');
  }

  const job = await Job.findById(jobId).populate('company', 'name');
  if (!job) {
    throw new ApiError(404, 'Job opening not found.');
  }

  if (job.status !== 'OPEN') {
    throw new ApiError(400, 'This job opening is no longer accepting applications.');
  }

  // Check duplicate application before proceeding
  const existingApplication = await Application.findOne({
    student: req.user._id,
    job: job._id,
  });

  if (existingApplication) {
    throw new ApiError(409, 'You have already submitted an application for this job.');
  }

  const studentProfile = await StudentProfile.findOne({ user: req.user._id });
  if (!studentProfile) {
    throw new ApiError(400, 'Please complete your student profile before applying to jobs.');
  }

  // Crucial requirement: Re-verify eligibility on the backend
  const eligibilityResult = evaluateEligibility(studentProfile, job);
  if (!eligibilityResult.eligible) {
    return res.status(400).json({
      success: false,
      message: 'You are not eligible for this job',
      eligible: false,
      reasons: eligibilityResult.reasons,
    });
  }

  const application = await Application.create({
    job: job._id,
    student: req.user._id,
    studentProfile: studentProfile._id,
    resumeSnapshotUrl: studentProfile.resumeUrl || '/uploads/resumes/default-student-resume.pdf',
    coverNote: coverNote.trim(),
    status: 'APPLIED',
    statusHistory: [
      {
        status: 'APPLIED',
        updatedBy: req.user._id,
        note: 'Application submitted after passing automated eligibility verification.',
        updatedAt: new Date(),
      },
    ],
  });

  await createNotification({
    recipientId: req.user._id,
    title: 'Application Submitted Successfully',
    message: `Your application for ${job.title} at ${job.company?.name || 'the company'} has been submitted.`,
    type: 'APPLICATION_SUBMITTED',
    relatedJob: job._id,
    relatedApplication: application._id,
  });

  const populated = await Application.findById(application._id).populate({
    path: 'job',
    populate: { path: 'company', select: 'name location tier' },
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: populated,
  });
});

/**
 * @desc    Get logged-in student's applications
 * @route   GET /api/applications/my
 * @access  Private (STUDENT)
 */
export const getMyApplications = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { student: req.user._id };

  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name location industry tier website' },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Student applications retrieved successfully',
    data: applications,
  });
});

/**
 * @desc    Get single application details by ID
 * @route   GET /api/applications/:id
 * @access  Private
 */
export const getApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name location industry tier website' },
    })
    .populate('student', 'name email')
    .populate('studentProfile');

  if (!application) {
    throw new ApiError(404, 'Application record not found');
  }

  // Student can only view their own application
  if (
    req.user.role === 'STUDENT' &&
    String(application.student?._id || application.student) !== String(req.user._id)
  ) {
    throw new ApiError(403, 'You are not authorized to view this application');
  }

  res.status(200).json({
    success: true,
    message: 'Application details retrieved',
    data: application,
  });
});

/**
 * @desc    Update application status (Shortlist, Reject, Select, Withdraw)
 * @route   PATCH /api/applications/:id/status
 * @access  Private (RECRUITER, ADMIN, or STUDENT for WITHDRAWN)
 */
export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, remarks = '' } = req.body;

  if (!status) {
    throw new ApiError(400, 'Target application status is required.');
  }

  const application = await Application.findById(req.params.id)
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name' },
    })
    .populate('student', 'name email');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  // Role authorization check
  if (req.user.role === 'STUDENT') {
    if (String(application.student?._id || application.student) !== String(req.user._id)) {
      throw new ApiError(403, 'You can only modify your own application.');
    }
    if (status !== 'WITHDRAWN') {
      throw new ApiError(403, 'Students may only withdraw their pending applications.');
    }
  } else if (req.user.role === 'RECRUITER') {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    const jobCompanyId = application.job?.company?._id || application.job?.company;
    if (!recProfile || String(recProfile.company) !== String(jobCompanyId)) {
      throw new ApiError(
        403,
        'You are only authorized to update applications for your own company.'
      );
    }
  }

  const currentStatus = application.status;
  const allowedNext = VALID_TRANSITIONS[currentStatus] || [];

  if (currentStatus !== status && !allowedNext.includes(status) && req.user.role !== 'ADMIN') {
    throw new ApiError(
      400,
      `Invalid status transition from '${currentStatus}' to '${status}'. Allowed transitions: [${allowedNext.join(', ') || 'None'}]`
    );
  }

  application.status = status;
  if (remarks) {
    application.recruiterRemarks = remarks;
  }

  application.statusHistory.push({
    status,
    updatedBy: req.user._id,
    note: remarks || `Status updated to ${status}`,
    updatedAt: new Date(),
  });

  await application.save();

  const companyName = application.job?.company?.name || 'Company';
  const jobTitle = application.job?.title || 'Role';
  const studentUserId = application.student?._id || application.student;

  // If SELECTED, mark student profile as PLACED
  if (status === 'SELECTED') {
    const stuProfile = await StudentProfile.findOne({ user: studentUserId });
    if (stuProfile) {
      stuProfile.placementStatus = 'PLACED';
      stuProfile.placedCompany = application.job?.company?._id || application.job?.company;
      stuProfile.placedPackageLPA = application.job?.packageLPA || stuProfile.placedPackageLPA;
      await stuProfile.save();
    }
  }

  // Send corresponding in-app + email notification to the student
  const notificationMap = {
    SHORTLISTED: {
      title: `Shortlisted for ${companyName}`,
      message: `Congratulations! You have been shortlisted for ${jobTitle} at ${companyName}.${remarks ? ` Note: ${remarks}` : ''}`,
      type: 'SHORTLISTED',
    },
    SELECTED: {
      title: `Offer Selected – ${companyName}`,
      message: `Congratulations! You have been selected for ${jobTitle} at ${companyName} (${application.job?.packageLPA} LPA).`,
      type: 'OFFER_SELECTED',
    },
    REJECTED: {
      title: `Application Update – ${companyName}`,
      message: `Your application for ${jobTitle} at ${companyName} was not moved forward to the next round.${remarks ? ` Feedback: ${remarks}` : ''}`,
      type: 'APPLICATION_REJECTED',
    },
  };

  if (notificationMap[status]) {
    await createNotification({
      recipientId: studentUserId,
      title: notificationMap[status].title,
      message: notificationMap[status].message,
      type: notificationMap[status].type,
      relatedJob: application.job?._id,
      relatedApplication: application._id,
    });
  }

  res.status(200).json({
    success: true,
    message: `Application status updated to ${status}`,
    data: application,
  });
});
