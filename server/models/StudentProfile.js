import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    techStack: [{ type: String, trim: true }],
    projectUrl: { type: String, trim: true },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    description: { type: String },
  },
  { _id: true }
);

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    score: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      required: [true, 'University roll number is required'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    college: {
      type: String,
      trim: true,
      default: 'National Institute of Technology & Engineering',
    },
    branch: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML'],
      required: [true, 'Academic branch is required'],
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
      min: 2024,
      max: 2030,
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10.0'],
      default: 0,
    },
    activeBacklogs: {
      type: Number,
      default: 0,
      min: 0,
    },
    historyOfBacklogs: {
      type: Number,
      default: 0,
      min: 0,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    projects: [projectSchema],
    experience: [experienceSchema],
    education: [educationSchema],
    resumeUrl: {
      type: String,
      default: '',
    },
    resumeName: {
      type: String,
      default: '',
    },
    resumeUploadedAt: {
      type: Date,
    },
    placementStatus: {
      type: String,
      enum: ['UNPLACED', 'PLACED', 'OPTED_OUT'],
      default: 'UNPLACED',
    },
    placedCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    placedPackageLPA: {
      type: Number,
      default: 0,
    },
    profileCompletionScore: {
      type: Number,
      default: 40,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

studentProfileSchema.index({ user: 1 }, { unique: true });
studentProfileSchema.index({ branch: 1, graduationYear: 1, cgpa: -1 });
studentProfileSchema.index({ placementStatus: 1 });

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
