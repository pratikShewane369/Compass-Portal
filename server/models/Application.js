import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'APPLIED',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'SELECTED',
        'REJECTED',
        'WITHDRAWN',
      ],
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      default: '',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    resumeSnapshotUrl: {
      type: String,
      default: '',
    },
    coverNote: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: [
        'APPLIED',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'SELECTED',
        'REJECTED',
        'WITHDRAWN',
      ],
      default: 'APPLIED',
    },
    recruiterRemarks: {
      type: String,
      default: '',
    },
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate applications at database level
applicationSchema.index({ student: 1, job: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ student: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
