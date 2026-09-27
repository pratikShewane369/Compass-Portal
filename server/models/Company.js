import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      unique: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    industry: {
      type: String,
      required: [true, 'Industry sector is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Headquarters / location is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Company description is required'],
    },
    tier: {
      type: String,
      enum: ['TIER_1_DREAM', 'TIER_2_CORE', 'MASS_RECRUITER'],
      default: 'TIER_1_DREAM',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

companySchema.index({ name: 1 }, { unique: true });
companySchema.index({ industry: 1, tier: 1 });

const Company = mongoose.model('Company', companySchema);
export default Company;
