/**
 * CampusHire Automated Backend Job Eligibility Engine
 *
 * Evaluates a StudentProfile against a Job's eligibility criteria on the backend:
 * 1. Minimum CGPA
 * 2. Allowed Academic Branches
 * 3. Target Graduation Year
 * 4. Maximum Active Backlogs
 * 5. Required Technical Skills (case-insensitive normalized set matching)
 *
 * Returns:
 * {
 *   eligible: boolean,
 *   reasons: string[],
 *   checks: { cgpa: boolean, branch: boolean, graduationYear: boolean, backlogs: boolean, skills: boolean },
 *   matchedSkills: string[],
 *   missingSkills: string[]
 * }
 */
export const evaluateEligibility = (studentProfile, job) => {
  if (!studentProfile) {
    return {
      eligible: false,
      reasons: ['Student academic profile is incomplete. Please complete your profile first.'],
      checks: {
        cgpa: false,
        branch: false,
        graduationYear: false,
        backlogs: false,
        skills: false,
      },
      matchedSkills: [],
      missingSkills: job?.eligibility?.requiredSkills || [],
    };
  }

  const criteria = job?.eligibility || {};
  const reasons = [];
  const checks = {
    cgpa: true,
    branch: true,
    graduationYear: true,
    backlogs: true,
    skills: true,
  };

  // 1. Check Minimum CGPA
  const minCgpa = Number(criteria.minCgpa ?? 0);
  const studentCgpa = Number(studentProfile.cgpa ?? 0);
  if (studentCgpa < minCgpa) {
    checks.cgpa = false;
    reasons.push(`Minimum CGPA required is ${minCgpa.toFixed(1)} (Your CGPA: ${studentCgpa.toFixed(2)})`);
  }

  // 2. Check Allowed Branches
  const allowedBranches = Array.isArray(criteria.allowedBranches) ? criteria.allowedBranches : [];
  if (
    allowedBranches.length > 0 &&
    !allowedBranches.map((b) => b.toUpperCase()).includes(String(studentProfile.branch || '').toUpperCase())
  ) {
    checks.branch = false;
    reasons.push(
      `Allowed branches are [${allowedBranches.join(', ')}] (Your branch: ${studentProfile.branch || 'N/A'})`
    );
  }

  // 3. Check Graduation Year
  const requiredGradYear = Number(criteria.graduationYear);
  const studentGradYear = Number(studentProfile.graduationYear);
  if (requiredGradYear && studentGradYear !== requiredGradYear) {
    checks.graduationYear = false;
    reasons.push(
      `Target graduation batch is ${requiredGradYear} (Your graduation year: ${studentGradYear || 'N/A'})`
    );
  }

  // 4. Check Maximum Allowed Active Backlogs
  const maxBacklogs =
    criteria.maxBacklogs !== undefined && criteria.maxBacklogs !== null
      ? Number(criteria.maxBacklogs)
      : 0;
  const studentBacklogs = Number(studentProfile.activeBacklogs ?? 0);
  if (studentBacklogs > maxBacklogs) {
    checks.backlogs = false;
    reasons.push(
      `Maximum allowed backlogs is ${maxBacklogs} (Your active backlogs: ${studentBacklogs})`
    );
  }

  // 5. Check Required Skills
  const requiredSkills = Array.isArray(criteria.requiredSkills)
    ? criteria.requiredSkills.filter(Boolean)
    : [];
  const studentSkillsNormalized = new Set(
    (studentProfile.skills || []).map((s) => String(s).trim().toLowerCase())
  );

  const matchedSkills = [];
  const missingSkills = [];

  for (const reqSkill of requiredSkills) {
    const normalizedReq = String(reqSkill).trim().toLowerCase();
    if (studentSkillsNormalized.has(normalizedReq)) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  if (missingSkills.length > 0) {
    checks.skills = false;
    reasons.push(`Missing required skills: ${missingSkills.join(', ')}`);
  }

  // Also check if job itself is closed or past deadline
  if (job.status && job.status !== 'OPEN') {
    reasons.push(`Job posting status is currently ${job.status}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    checks,
    matchedSkills,
    missingSkills,
  };
};

/**
 * Computes profile completion percentage for a StudentProfile
 */
export const calculateProfileCompletion = (profile) => {
  if (!profile) return 0;
  let score = 0;
  if (profile.rollNumber) score += 10;
  if (profile.phone) score += 10;
  if (profile.branch && profile.graduationYear) score += 15;
  if (profile.cgpa > 0) score += 15;
  if (Array.isArray(profile.skills) && profile.skills.length >= 2) score += 15;
  if (Array.isArray(profile.projects) && profile.projects.length >= 1) score += 15;
  if (Array.isArray(profile.education) && profile.education.length >= 1) score += 10;
  if (profile.resumeUrl) score += 10;
  return Math.min(100, score);
};
