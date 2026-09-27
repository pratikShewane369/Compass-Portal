import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
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
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roundName: {
      type: String,
      required: [true, 'Interview round name is required'],
      trim: true,
    },
    roundType: {
      type: String,
      enum: ['ONLINE_ASSESSMENT', 'TECHNICAL', 'SYSTEM_DESIGN', 'MANAGERIAL', 'HR'],
      default: 'TECHNICAL',
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Interview date and time are required'],
    },
    durationMinutes: {
      type: Number,
      default: 45,
      min: 15,
      max: 240,
    },
    mode: {
      type: String,
      enum: ['ONLINE', 'IN_PERSON'],
      default: 'ONLINE',
    },
    meetingLinkOrLocation: {
      type: String,
      required: [true, 'Meeting link or room location is required'],
      trim: true,
    },
    instructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
      default: 'SCHEDULED',
    },
    feedback: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

interviewSchema.index({ student: 1, scheduledAt: 1 });
interviewSchema.index({ job: 1, scheduledAt: 1 });
interviewSchema.index({ application: 1 });

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
