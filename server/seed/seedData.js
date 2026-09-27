import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import Notification from '../models/Notification.js';
import { calculateProfileCompletion } from '../services/eligibilityService.js';

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'CampusHire@2027';

export const seedCampusHireDatabase = async (forceReset = false) => {
  const existingUsersCount = await User.countDocuments({});
  if (existingUsersCount > 0 && !forceReset) {
    return { seeded: false, message: 'Database already contains initial records.' };
  }

  if (forceReset) {
    await Promise.all([
      Notification.deleteMany({}),
      Interview.deleteMany({}),
      Application.deleteMany({}),
      Job.deleteMany({}),
      RecruiterProfile.deleteMany({}),
      Company.deleteMany({}),
      StudentProfile.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  // 1. Create Placement Officer / Admin
  const adminUser = await User.create({
    name: 'Dr. Rajeshwari Menon (TPO)',
    email: 'tpo.admin@nit.edu',
    password: DEMO_PASSWORD,
    role: 'ADMIN',
    isActive: true,
    isApproved: true,
    lastLogin: new Date(),
  });

  // 2. Create Recruiters
  const recruiter1User = await User.create({
    name: 'Siddharth Malhotra',
    email: 'recruiter@cloudscale.io',
    password: DEMO_PASSWORD,
    role: 'RECRUITER',
    isActive: true,
    isApproved: true,
    lastLogin: new Date(),
  });

  const recruiter2User = await User.create({
    name: 'Meera Krishnan',
    email: 'hr@quantedge.fin',
    password: DEMO_PASSWORD,
    role: 'RECRUITER',
    isActive: true,
    isApproved: true,
    lastLogin: new Date(),
  });

  const recruiter3User = await User.create({
    name: 'Karan Deshmukh',
    email: 'campus@nexacore.tech',
    password: DEMO_PASSWORD,
    role: 'RECRUITER',
    isActive: true,
    isApproved: true,
    lastLogin: new Date(),
  });

  // 3. Create Companies
  const cloudScale = await Company.create({
    name: 'CloudScale Systems',
    website: 'https://cloudscale.io',
    industry: 'Cloud Infrastructure & Distributed Systems',
    location: 'Bengaluru, India',
    description:
      'CloudScale builds high-throughput distributed observability and Kubernetes orchestration engines for global enterprises.',
    tier: 'TIER_1_DREAM',
    createdBy: recruiter1User._id,
    isVerified: true,
  });

  const quantEdge = await Company.create({
    name: 'QuantEdge Capital & FinTech',
    website: 'https://quantedge.fin',
    industry: 'Quantitative Finance & Algorithmic Trading',
    location: 'Mumbai, India',
    description:
      'Low-latency market-making, risk analytics, and real-time institutional settlement infrastructure.',
    tier: 'TIER_1_DREAM',
    createdBy: recruiter2User._id,
    isVerified: true,
  });

  const nexaCore = await Company.create({
    name: 'NexaCore Enterprise Digital',
    website: 'https://nexacore.tech',
    industry: 'Enterprise SaaS & AI Platforms',
    location: 'Hyderabad, India',
    description:
      'Full-stack digital product engineering and enterprise workflow automation platform.',
    tier: 'TIER_2_CORE',
    createdBy: recruiter3User._id,
    isVerified: true,
  });

  // Link Recruiter Profiles
  await RecruiterProfile.create([
    {
      user: recruiter1User._id,
      company: cloudScale._id,
      designation: 'Head of University Talent Acquisition',
      phone: '+91 98450 11223',
      department: 'Engineering Recruitment',
      isVerified: true,
    },
    {
      user: recruiter2User._id,
      company: quantEdge._id,
      designation: 'VP – Campus Hiring & Quant Engineering',
      phone: '+91 98201 44556',
      department: 'Core Technology Hiring',
      isVerified: true,
    },
    {
      user: recruiter3User._id,
      company: nexaCore._id,
      designation: 'Senior Technical Recruiter',
      phone: '+91 90001 77889',
      department: 'Graduate Programs',
      isVerified: true,
    },
  ]);

  // 4. Create Students (6 diverse profiles across branches & CGPA levels)
  const studentUsersData = [
    {
      name: 'Aarav Sharma',
      email: 'aarav.sharma@nit.edu',
      rollNumber: 'BT23CSE014',
      phone: '+91 98765 43210',
      branch: 'CSE',
      graduationYear: 2027,
      cgpa: 8.65,
      activeBacklogs: 0,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express', 'SQL', 'Docker'],
      placementStatus: 'UNPLACED',
      placedCompany: null,
      placedPackageLPA: 0,
      resumeUrl: '/uploads/resumes/Aarav_Sharma_BTech_CSE_Resume.pdf',
      resumeName: 'Aarav_Sharma_BTech_CSE_Resume.pdf',
      projects: [
        {
          title: 'CampusHire – Automated Recruitment & Eligibility Engine',
          description:
            'Built a full-stack MERN platform featuring rule-based job eligibility evaluation, role-based access control, and placement analytics.',
          techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'JWT'],
          projectUrl: 'https://github.com/aarav-sharma/campushire',
        },
        {
          title: 'DistriCache – High-Concurrency Rate Limiter & Cache Proxy',
          description:
            'Implemented a token-bucket rate limiter and Redis-backed caching middleware reducing P95 API latency.',
          techStack: ['Node.js', 'Redis', 'Docker'],
          projectUrl: 'https://github.com/aarav-sharma/districache',
        },
      ],
      experience: [
        {
          company: 'FinStack Labs',
          role: 'Software Engineering Intern',
          duration: 'May 2026 - Jul 2026',
          description:
            'Developed RESTful microservices in Node.js and optimized MongoDB aggregation pipelines.',
        },
      ],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Computer Science & Engineering',
          year: '2023 - 2027',
          score: '8.65 CGPA',
        },
      ],
    },
    {
      name: 'Priya Nair',
      email: 'priya.nair@nit.edu',
      rollNumber: 'BT23IT008',
      phone: '+91 98111 22334',
      branch: 'IT',
      graduationYear: 2027,
      cgpa: 9.12,
      activeBacklogs: 0,
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Kubernetes'],
      placementStatus: 'PLACED',
      placedCompany: cloudScale._id,
      placedPackageLPA: 24.0,
      resumeUrl: '/uploads/resumes/Priya_Nair_IT_Resume.pdf',
      resumeName: 'Priya_Nair_IT_Resume.pdf',
      projects: [
        {
          title: 'KubeGuard – Automated Pod Telemetry Monitor',
          description: 'Real-time container health dashboard with anomaly alerting.',
          techStack: ['React', 'Go', 'Kubernetes'],
          projectUrl: 'https://github.com/priya-nair/kubeguard',
        },
      ],
      experience: [],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Information Technology',
          year: '2023 - 2027',
          score: '9.12 CGPA',
        },
      ],
    },
    {
      name: 'Rohan Verma',
      email: 'rohan.verma@nit.edu',
      rollNumber: 'BT23ECE042',
      phone: '+91 97654 32109',
      branch: 'ECE',
      graduationYear: 2027,
      cgpa: 6.85,
      activeBacklogs: 1,
      skills: ['C++', 'Python', 'Embedded C', 'JavaScript'],
      placementStatus: 'UNPLACED',
      placedCompany: null,
      placedPackageLPA: 0,
      resumeUrl: '/uploads/resumes/Rohan_Verma_ECE_Resume.pdf',
      resumeName: 'Rohan_Verma_ECE_Resume.pdf',
      projects: [
        {
          title: 'IoT Smart Grid Telemetry Node',
          description: 'ESP32-based power quality monitor with MQTT broker ingestion.',
          techStack: ['C++', 'MQTT', 'Python'],
          projectUrl: 'https://github.com/rohan-verma/smart-grid',
        },
      ],
      experience: [],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Electronics & Communication Engineering',
          year: '2023 - 2027',
          score: '6.85 CGPA',
        },
      ],
    },
    {
      name: 'Ananya Iyer',
      email: 'ananya.iyer@nit.edu',
      rollNumber: 'BT23CSE003',
      phone: '+91 98400 99887',
      branch: 'CSE',
      graduationYear: 2027,
      cgpa: 9.45,
      activeBacklogs: 0,
      skills: ['C++', 'Python', 'Algorithms', 'JavaScript', 'React', 'Node.js', 'SQL'],
      placementStatus: 'PLACED',
      placedCompany: quantEdge._id,
      placedPackageLPA: 32.0,
      resumeUrl: '/uploads/resumes/Ananya_Iyer_CSE_Resume.pdf',
      resumeName: 'Ananya_Iyer_CSE_Resume.pdf',
      projects: [
        {
          title: 'OrderBookX – Sub-Millisecond Limit Order Book Engine',
          description: 'Matching engine supporting 250k orders/sec with lock-free queues.',
          techStack: ['C++', 'Python', 'React'],
          projectUrl: 'https://github.com/ananya-iyer/orderbookx',
        },
      ],
      experience: [],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Computer Science & Engineering',
          year: '2023 - 2027',
          score: '9.45 CGPA',
        },
      ],
    },
    {
      name: 'Vikram Patel',
      email: 'vikram.patel@nit.edu',
      rollNumber: 'BT23AIML019',
      phone: '+91 99220 33445',
      branch: 'AIML',
      graduationYear: 2027,
      cgpa: 8.35,
      activeBacklogs: 0,
      skills: ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'PyTorch'],
      placementStatus: 'UNPLACED',
      placedCompany: null,
      placedPackageLPA: 0,
      resumeUrl: '/uploads/resumes/Vikram_Patel_AIML_Resume.pdf',
      resumeName: 'Vikram_Patel_AIML_Resume.pdf',
      projects: [],
      experience: [],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Artificial Intelligence & Machine Learning',
          year: '2023 - 2027',
          score: '8.35 CGPA',
        },
      ],
    },
    {
      name: 'Sneha Kulkarni',
      email: 'sneha.kulkarni@nit.edu',
      rollNumber: 'BT23IT027',
      phone: '+91 98230 55667',
      branch: 'IT',
      graduationYear: 2027,
      cgpa: 7.95,
      activeBacklogs: 0,
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'HTML', 'CSS'],
      placementStatus: 'PLACED',
      placedCompany: nexaCore._id,
      placedPackageLPA: 14.5,
      resumeUrl: '/uploads/resumes/Sneha_Kulkarni_IT_Resume.pdf',
      resumeName: 'Sneha_Kulkarni_IT_Resume.pdf',
      projects: [],
      experience: [],
      education: [
        {
          institution: 'National Institute of Technology & Engineering',
          degree: 'B.Tech in Information Technology',
          year: '2023 - 2027',
          score: '7.95 CGPA',
        },
      ],
    },
  ];

  const createdStudents = [];
  for (const sData of studentUsersData) {
    const u = await User.create({
      name: sData.name,
      email: sData.email,
      password: DEMO_PASSWORD,
      role: 'STUDENT',
      isActive: true,
      isApproved: true,
      lastLogin: new Date(),
    });

    const profilePayload = {
      user: u._id,
      rollNumber: sData.rollNumber,
      phone: sData.phone,
      branch: sData.branch,
      graduationYear: sData.graduationYear,
      cgpa: sData.cgpa,
      activeBacklogs: sData.activeBacklogs,
      historyOfBacklogs: sData.activeBacklogs,
      skills: sData.skills,
      projects: sData.projects,
      experience: sData.experience,
      education: sData.education,
      resumeUrl: sData.resumeUrl,
      resumeName: sData.resumeName,
      resumeUploadedAt: new Date(),
      placementStatus: sData.placementStatus,
      placedCompany: sData.placedCompany,
      placedPackageLPA: sData.placedPackageLPA,
    };
    profilePayload.profileCompletionScore = calculateProfileCompletion(profilePayload);

    const p = await StudentProfile.create(profilePayload);
    createdStudents.push({ user: u, profile: p });
  }

  const [aarav, priya, rohan, ananya, vikram, sneha] = createdStudents;

  // 5. Create Jobs with realistic eligibility requirements
  const futureDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const job1 = await Job.create({
    title: 'Software Development Engineer – I (Full-Stack & Cloud)',
    company: cloudScale._id,
    postedBy: recruiter1User._id,
    description:
      'Join CloudScale Systems core platform engineering team to architect high-scale microservices in Node.js, React, and distributed NoSQL databases. Candidates will own production features from design to deployment.',
    jobType: 'FULL_TIME',
    location: 'Bengaluru, India',
    workMode: 'HYBRID',
    packageLPA: 24.0,
    stipendPerMonth: 75000,
    openings: 6,
    deadline: futureDate(18),
    status: 'OPEN',
    eligibility: {
      minCgpa: 7.5,
      allowedBranches: ['CSE', 'IT', 'AIML'],
      graduationYear: 2027,
      maxBacklogs: 0,
      requiredSkills: ['JavaScript', 'React', 'Node.js'],
    },
  });

  const job2 = await Job.create({
    title: 'Site Reliability & Platform Engineer (SRE)',
    company: cloudScale._id,
    postedBy: recruiter1User._id,
    description:
      'Design automated deployment pipelines, observability dashboards, and multi-region failover systems for mission-critical cloud workloads.',
    jobType: 'FULL_TIME',
    location: 'Bengaluru, India',
    workMode: 'ONSITE',
    packageLPA: 21.0,
    stipendPerMonth: 65000,
    openings: 4,
    deadline: futureDate(21),
    status: 'OPEN',
    eligibility: {
      minCgpa: 7.0,
      allowedBranches: ['CSE', 'IT', 'ECE', 'AIML'],
      graduationYear: 2027,
      maxBacklogs: 0,
      requiredSkills: ['JavaScript', 'Docker', 'Node.js'],
    },
  });

  const job3 = await Job.create({
    title: 'Quantitative Systems Developer (Low-Latency Trading)',
    company: quantEdge._id,
    postedBy: recruiter2User._id,
    description:
      'Build ultra-low-latency market data parsers, algorithmic execution engines, and real-time risk telemetry consoles.',
    jobType: 'FULL_TIME',
    location: 'Mumbai, India',
    workMode: 'ONSITE',
    packageLPA: 32.0,
    stipendPerMonth: 110000,
    openings: 3,
    deadline: futureDate(12),
    status: 'OPEN',
    eligibility: {
      minCgpa: 9.0,
      allowedBranches: ['CSE', 'IT'],
      graduationYear: 2027,
      maxBacklogs: 0,
      requiredSkills: ['C++', 'Algorithms', 'Python'],
    },
  });

  const job4 = await Job.create({
    title: 'Full-Stack Product Engineer (MERN Stack)',
    company: nexaCore._id,
    postedBy: recruiter3User._id,
    description:
      'Develop customer-facing SaaS workflows, analytics modules, and REST APIs using MongoDB, Express, React, and Node.js.',
    jobType: 'FULL_TIME',
    location: 'Hyderabad, India',
    workMode: 'HYBRID',
    packageLPA: 14.5,
    stipendPerMonth: 45000,
    openings: 10,
    deadline: futureDate(25),
    status: 'OPEN',
    eligibility: {
      minCgpa: 7.0,
      allowedBranches: ['CSE', 'IT', 'ECE', 'EEE', 'AIML'],
      graduationYear: 2027,
      maxBacklogs: 0,
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    },
  });

  const job5 = await Job.create({
    title: 'Graduate Engineering Intern (6-Month PPO Track)',
    company: nexaCore._id,
    postedBy: recruiter3User._id,
    description:
      '6-month final semester internship with direct performance-based conversion to Full-Time Software Engineer.',
    jobType: 'PPO',
    location: 'Pune / Remote',
    workMode: 'REMOTE',
    packageLPA: 12.0,
    stipendPerMonth: 40000,
    openings: 15,
    deadline: futureDate(30),
    status: 'OPEN',
    eligibility: {
      minCgpa: 6.5,
      allowedBranches: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AIML'],
      graduationYear: 2027,
      maxBacklogs: 1,
      requiredSkills: ['JavaScript'],
    },
  });

  // 6. Create Sample Applications across workflow states
  // Aarav applied to Job 1 (CloudScale SDE-1) -> INTERVIEW_SCHEDULED
  const appAaravJob1 = await Application.create({
    job: job1._id,
    student: aarav.user._id,
    studentProfile: aarav.profile._id,
    resumeSnapshotUrl: aarav.profile.resumeUrl,
    coverNote:
      'Strong hands-on experience building production MERN stack applications and distributed caching proxies.',
    status: 'INTERVIEW_SCHEDULED',
    recruiterRemarks: 'Strong system design and MERN projects. Cleared OA with 96th percentile.',
    statusHistory: [
      {
        status: 'APPLIED',
        updatedBy: aarav.user._id,
        note: 'Application submitted after passing automated eligibility check.',
        updatedAt: new Date(Date.now() - 5 * 86400000),
      },
      {
        status: 'SHORTLISTED',
        updatedBy: recruiter1User._id,
        note: 'Shortlisted after resume and online coding assessment review.',
        updatedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        status: 'INTERVIEW_SCHEDULED',
        updatedBy: recruiter1User._id,
        note: 'Technical Interview Round 1 scheduled.',
        updatedAt: new Date(Date.now() - 1 * 86400000),
      },
    ],
  });

  // Aarav applied to Job 4 (NexaCore MERN) -> SHORTLISTED
  const appAaravJob4 = await Application.create({
    job: job4._id,
    student: aarav.user._id,
    studentProfile: aarav.profile._id,
    resumeSnapshotUrl: aarav.profile.resumeUrl,
    coverNote: 'Excited to contribute to NexaCore Enterprise SaaS modules.',
    status: 'SHORTLISTED',
    recruiterRemarks: 'Direct match on MongoDB, Express, React, Node.js skill matrix.',
    statusHistory: [
      {
        status: 'APPLIED',
        updatedBy: aarav.user._id,
        note: 'Application submitted.',
        updatedAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        status: 'SHORTLISTED',
        updatedBy: recruiter3User._id,
        note: 'Shortlisted for technical evaluation.',
        updatedAt: new Date(Date.now() - 2 * 86400000),
      },
    ],
  });

  // Priya applied to Job 1 (CloudScale SDE-1) -> SELECTED
  const appPriyaJob1 = await Application.create({
    job: job1._id,
    student: priya.user._id,
    studentProfile: priya.profile._id,
    resumeSnapshotUrl: priya.profile.resumeUrl,
    status: 'SELECTED',
    recruiterRemarks: 'Exceptional performance across Technical and System Design rounds.',
  });

  // Ananya applied to Job 3 (QuantEdge) -> SELECTED
  await Application.create({
    job: job3._id,
    student: ananya.user._id,
    studentProfile: ananya.profile._id,
    resumeSnapshotUrl: ananya.profile.resumeUrl,
    status: 'SELECTED',
    recruiterRemarks: 'Outstanding C++ concurrency and algorithmic problem-solving.',
  });

  // Sneha applied to Job 4 (NexaCore) -> SELECTED
  await Application.create({
    job: job4._id,
    student: sneha.user._id,
    studentProfile: sneha.profile._id,
    resumeSnapshotUrl: sneha.profile.resumeUrl,
    status: 'SELECTED',
    recruiterRemarks: 'Strong frontend architecture and API integration skills.',
  });

  // Vikram applied to Job 1 (CloudScale SDE-1) -> APPLIED
  await Application.create({
    job: job1._id,
    student: vikram.user._id,
    studentProfile: vikram.profile._id,
    resumeSnapshotUrl: vikram.profile.resumeUrl,
    coverNote: 'AIML undergrad with strong full-stack engineering foundations.',
    status: 'APPLIED',
  });

  // Rohan applied to Job 5 (NexaCore Intern) -> APPLIED
  await Application.create({
    job: job5._id,
    student: rohan.user._id,
    studentProfile: rohan.profile._id,
    resumeSnapshotUrl: rohan.profile.resumeUrl,
    status: 'APPLIED',
  });

  // 7. Create Scheduled Interviews
  await Interview.create([
    {
      application: appAaravJob1._id,
      job: job1._id,
      student: aarav.user._id,
      scheduledBy: recruiter1User._id,
      roundName: 'Technical & System Design Round 1',
      roundType: 'TECHNICAL',
      scheduledAt: new Date(Date.now() + 2 * 86400000),
      durationMinutes: 60,
      mode: 'ONLINE',
      meetingLinkOrLocation: 'https://meet.cloudscale.io/sde1-aarav-sharma',
      instructions:
        'Be prepared to walk through your CampusHire MERN architecture, database indexing strategy, and live coding in JavaScript.',
      status: 'SCHEDULED',
    },
    {
      application: appPriyaJob1._id,
      job: job1._id,
      student: priya.user._id,
      scheduledBy: recruiter1User._id,
      roundName: 'Final Engineering Hiring Manager Round',
      roundType: 'MANAGERIAL',
      scheduledAt: new Date(Date.now() - 2 * 86400000),
      durationMinutes: 45,
      mode: 'ONLINE',
      meetingLinkOrLocation: 'https://meet.cloudscale.io/hm-priya-nair',
      status: 'COMPLETED',
      feedback: 'Strong distributed systems fundamentals. Recommended for immediate offer.',
      rating: 5,
    },
  ]);

  // 8. Create In-App Notifications for Demo Student (Aarav)
  await Notification.create([
    {
      recipient: aarav.user._id,
      title: 'Interview Scheduled – CloudScale Systems',
      message:
        'Your Technical & System Design Round 1 with CloudScale Systems for SDE-I (24.0 LPA) has been scheduled. Check your Interviews tab for the meeting link.',
      type: 'INTERVIEW_SCHEDULED',
      relatedJob: job1._id,
      relatedApplication: appAaravJob1._id,
      isRead: false,
    },
    {
      recipient: aarav.user._id,
      title: 'Shortlisted – NexaCore Enterprise Digital',
      message:
        'You have been shortlisted for Full-Stack Product Engineer (MERN Stack) at NexaCore Enterprise Digital.',
      type: 'SHORTLISTED',
      relatedJob: job4._id,
      relatedApplication: appAaravJob4._id,
      isRead: false,
    },
    {
      recipient: aarav.user._id,
      title: 'New Eligible Opportunity Published',
      message:
        'Site Reliability & Platform Engineer (21.0 LPA) at CloudScale Systems matches 100% of your eligibility profile.',
      type: 'SYSTEM_ALERT',
      relatedJob: job2._id,
      isRead: true,
    },
  ]);

  return {
    seeded: true,
    message: 'CampusHire database seeded with demo users, companies, jobs, applications, and interviews.',
  };
};
