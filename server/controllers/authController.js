import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Company from '../models/Company.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { ApiError, asyncHandler } from '../middleware/errorMiddleware.js';
import { calculateProfileCompletion } from '../services/eligibilityService.js';

/**
 * @desc    Register a new user (STUDENT or RECRUITER)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'STUDENT',
    // Student optional fields
    rollNumber,
    branch = 'CSE',
    graduationYear = 2027,
    cgpa = 7.5,
    skills = [],
    // Recruiter optional fields
    companyName,
    companyIndustry = 'Software & Cloud Services',
    companyLocation = 'Bengaluru, India',
    companyWebsite = '',
    designation = 'Talent Acquisition Lead',
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Please provide full name, email address, and password.');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  const normalizedRole = ['STUDENT', 'RECRUITER'].includes(String(role).toUpperCase())
    ? String(role).toUpperCase()
    : 'STUDENT';

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email address already exists.');
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: normalizedRole,
    isActive: true,
    isApproved: true,
    lastLogin: new Date(),
  });

  let profile = null;

  if (normalizedRole === 'STUDENT') {
    const parsedSkills = Array.isArray(skills)
      ? skills
      : String(skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const initialData = {
      user: user._id,
      rollNumber: rollNumber || `BT${graduationYear}${Math.floor(1000 + Math.random() * 9000)}`,
      branch: branch || 'CSE',
      graduationYear: Number(graduationYear) || 2027,
      cgpa: Number(cgpa) || 7.5,
      activeBacklogs: 0,
      skills: parsedSkills.length > 0 ? parsedSkills : ['JavaScript', 'React', 'Node.js'],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: `B.Tech in ${branch || 'CSE'}`,
          year: `${Number(graduationYear) - 4} - ${graduationYear}`,
          score: `${Number(cgpa || 7.5).toFixed(2)} CGPA`,
        },
      ],
    };

    initialData.profileCompletionScore = calculateProfileCompletion(initialData);
    profile = await StudentProfile.create(initialData);
  } else if (normalizedRole === 'RECRUITER') {
    const targetCompanyName = (companyName || `${name.split(' ')[0]} Technologies`).trim();
    let company = await Company.findOne({ name: targetCompanyName });

    if (!company) {
      company = await Company.create({
        name: targetCompanyName,
        website: companyWebsite || `https://${targetCompanyName.toLowerCase().replace(/\s+/g, '')}.io`,
        industry: companyIndustry,
        location: companyLocation,
        description: `${targetCompanyName} is a technology organization recruiting engineering graduates via CampusHire.`,
        tier: 'TIER_1_DREAM',
        createdBy: user._id,
        isVerified: true,
      });
    }

    profile = await RecruiterProfile.create({
      user: user._id,
      company: company._id,
      designation,
      isVerified: true,
    });
  }

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: 'Registration completed successfully',
    data: {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
      },
      profile,
    },
  });
});

/**
 * @desc    Authenticate user & return JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email address and password.');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account has been deactivated by the Placement Cell Administrator.'
    );
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
      },
    },
  });
});

/**
 * @desc    Logout current user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('campushire_token');
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: {},
  });
});

/**
 * @desc    Get current logged-in user and role-specific profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  let profile = null;
  if (user.role === 'STUDENT') {
    profile = await StudentProfile.findOne({ user: user._id }).populate('placedCompany');
  } else if (user.role === 'RECRUITER') {
    profile = await RecruiterProfile.findOne({ user: user._id }).populate('company');
  }

  res.status(200).json({
    success: true,
    message: 'Current user profile fetched',
    data: {
      user,
      profile,
    },
  });
});
