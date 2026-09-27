import Interview from '../models/Interview.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import { createNotification } from '../services/notificationService.js';

/**
 * @desc    Schedule an interview for a candidate application
 * @route   POST /api/interviews
 * @access  Private (RECRUITER, ADMIN)
 */
export const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    applicationId,
    roundName = 'Technical Interview Round 1',
    roundType = 'TECHNICAL',
    scheduledAt,
    durationMinutes = 45,
    mode = 'ONLINE',
    meetingLinkOrLocation,
    instructions = '',
  } = req.body;

  if (!applicationId || !scheduledAt || !meetingLinkOrLocation) {
    throw new ApiError(
      400,
      'Please provide applicationId, scheduledAt date/time, and meeting link or room location.'
    );
  }

  const application = await Application.findById(applicationId)
    .populate({
      path: 'job',
      populate: { path: 'company', select: 'name' },
    })
    .populate('student', 'name email');

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (['REJECTED', 'WITHDRAWN'].includes(application.status)) {
    throw new ApiError(
      400,
      `Cannot schedule an interview for an application with status '${application.status}'.`
    );
  }

  // Transition application to INTERVIEW_SCHEDULED if currently APPLIED or SHORTLISTED
  if (['APPLIED', 'SHORTLISTED'].includes(application.status)) {
    application.status = 'INTERVIEW_SCHEDULED';
    application.statusHistory.push({
      status: 'INTERVIEW_SCHEDULED',
      updatedBy: req.user._id,
      note: `Interview scheduled: ${roundName} (${mode})`,
      updatedAt: new Date(),
    });
    await application.save();
  }

  const studentId = application.student?._id || application.student;
  const jobId = application.job?._id || application.job;

  const interview = await Interview.create({
    application: application._id,
    job: jobId,
    student: studentId,
    scheduledBy: req.user._id,
    roundName: roundName.trim(),
    roundType,
    scheduledAt: new Date(scheduledAt),
    durationMinutes: Number(durationMinutes) || 45,
    mode,
    meetingLinkOrLocation: meetingLinkOrLocation.trim(),
    instructions: instructions.trim(),
    status: 'SCHEDULED',
  });

  const companyName = application.job?.company?.name || 'the hiring team';
  const formattedTime = new Date(scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await createNotification({
    recipientId: studentId,
    title: `Interview Scheduled – ${companyName}`,
    message: `Your interview (${roundName}) with ${companyName} is scheduled for ${formattedTime}. Mode: ${mode}.`,
    type: 'INTERVIEW_SCHEDULED',
    relatedJob: jobId,
    relatedApplication: application._id,
  });

  const populated = await Interview.findById(interview._id)
    .populate('student', 'name email')
    .populate({
      path: 'job',
      select: 'title packageLPA location company',
      populate: { path: 'company', select: 'name location' },
    });

  res.status(201).json({
    success: true,
    message: 'Interview scheduled and candidate notified successfully',
    data: populated,
  });
});

/**
 * @desc    Get interviews (role-filtered for STUDENT, RECRUITER, or ADMIN)
 * @route   GET /api/interviews
 * @access  Private
 */
export const getInterviews = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.user.role === 'STUDENT') {
    filter.student = req.user._id;
  } else if (req.user.role === 'RECRUITER') {
    const recProfile = await RecruiterProfile.findOne({ user: req.user._id });
    if (recProfile) {
      const companyJobs = await Job.find({ company: recProfile.company });
      filter.job = { $in: companyJobs.map((j) => j._id) };
    } else {
      filter.scheduledBy = req.user._id;
    }
  }

  const interviews = await Interview.find(filter)
    .populate('student', 'name email')
    .populate({
      path: 'job',
      select: 'title packageLPA location company',
      populate: { path: 'company', select: 'name location tier' },
    })
    .populate('application', 'status resumeSnapshotUrl')
    .sort({ scheduledAt: 1 });

  res.status(200).json({
    success: true,
    message: 'Interviews retrieved successfully',
    data: interviews,
  });
});

/**
 * @desc    Update interview details, status, or interviewer feedback
 * @route   PUT /api/interviews/:id
 * @access  Private (RECRUITER, ADMIN)
 */
export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findById(req.params.id);
  if (!interview) {
    throw new ApiError(404, 'Interview schedule not found');
  }

  const fields = [
    'roundName',
    'roundType',
    'scheduledAt',
    'durationMinutes',
    'mode',
    'meetingLinkOrLocation',
    'instructions',
    'status',
    'feedback',
    'rating',
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      interview[field] =
        field === 'scheduledAt' ? new Date(req.body[field]) : req.body[field];
    }
  }

  await interview.save();

  const updated = await Interview.findById(interview._id)
    .populate('student', 'name email')
    .populate({
      path: 'job',
      select: 'title packageLPA location company',
      populate: { path: 'company', select: 'name location' },
    });

  res.status(200).json({
    success: true,
    message: 'Interview updated successfully',
    data: updated,
  });
});
