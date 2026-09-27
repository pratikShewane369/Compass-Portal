import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    jobType: {
      type: String,
      enum: ['FULL_TIME', 'INTERNSHIP', 'PPO'],
      default: 'FULL_TIME',
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
    },
    workMode: {
      type: String,
      enum: ['ONSITE', 'HYBRID', 'REMOTE'],
      default: 'HYBRID',
    },
    packageLPA: {
      type: Number,
      required: [true, 'CTC Package (in LPA) is required'],
      min: 0,
    },
    stipendPerMonth: {
      type: Number,
      default: 0,
    },
    openings: {
      type: Number,
      default: 1,
      min: 1,
    },
    deadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED', 'DRAFT'],
      default: 'OPEN',
    },
    eligibility: {
      minCgpa: {
        type: Number,
        required: true,
        default: 6.0,
        min: 0,
        max: 10,
      },
      allowedBranches: [
        {
          type: String,
          enum: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML'],
        },
      ],
      graduationYear: {
        type: Number,
        required: true,
        default: 2027,
      },
      maxBacklogs: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      requiredSkills: [
        {
          type: String,
          trim: true,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for job discovery, company filtering, and active status
jobSchema.index({ company: 1, status: 1 });
jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ 'eligibility.minCgpa': 1, 'eligibility.graduationYear': 1 });

const Job = mongoose.model('Job', jobSchema);
export default Job;
