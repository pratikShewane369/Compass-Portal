import mongoose from 'mongoose';

const recruiterProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    designation: {
      type: String,
      required: [true, 'Recruiter designation is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: 'University Talent Acquisition',
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

recruiterProfileSchema.index({ user: 1 }, { unique: true });
recruiterProfileSchema.index({ company: 1 });

const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);
export default RecruiterProfile;
