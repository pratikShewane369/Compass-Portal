/**
 * CampusHire Automated Backend API & Eligibility Engine Test Suite
 * Run via: npm test
 *
 * Tests:
 * 1. Health Check API (GET /api/health)
 * 2. User Registration & bcrypt password hashing (POST /api/auth/register)
 * 3. User Login & JWT issuance (POST /api/auth/login)
 * 4. Protected Route enforcement (GET /api/auth/me)
 * 5. Role-Based Authorization (Student blocked from Admin/Recruiter routes)
 * 6. Job Creation by Recruiter (POST /api/jobs)
 * 7. Backend Job Eligibility Engine (Eligible vs Ineligible reasons)
 * 8. Application Creation & Duplicate Application Prevention (409 Conflict)
 * 9. Application Workflow State Machine Transitions (PATCH /api/applications/:id/status)
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { seedCampusHireDatabase } from '../seed/seedData.js';

async function request(server, method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('==========================================================');
  console.log('Running CampusHire Backend API & Eligibility Test Suite...');
  console.log('==========================================================');

  await connectDB();
  await seedCampusHireDatabase(true);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // 1. Health Check
    const healthRes = await request(server, 'GET', '/api/health');
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.body.success, true);
    console.log('PASS [1/9]: Health Check API (GET /api/health)');

    // 2. Student Registration
    const regRes = await request(server, 'POST', '/api/auth/register', {
      name: 'Test Candidate',
      email: 'test.candidate@nit.edu',
      password: 'Password@123',
      role: 'STUDENT',
      rollNumber: 'BT23CSE099',
      branch: 'CSE',
      graduationYear: 2027,
      cgpa: 8.4,
      skills: ['JavaScript', 'React', 'Node.js'],
    });
    assert.equal(regRes.status, 201);
    assert.ok(regRes.body.data.token);
    const studentToken = regRes.body.data.token;
    console.log('PASS [2/9]: Student Registration & JWT Issuance');

    // 3. Recruiter Login
    const recLogin = await request(server, 'POST', '/api/auth/login', {
      email: 'recruiter@cloudscale.io',
      password: 'CampusHire@2027',
    });
    assert.equal(recLogin.status, 200);
    const recruiterToken = recLogin.body.data.token;
    console.log('PASS [3/9]: Recruiter Login & bcrypt Password Verification');

    // 4. Protected Route Verification
    const unauthMe = await request(server, 'GET', '/api/auth/me');
    assert.equal(unauthMe.status, 401);
    const authMe = await request(server, 'GET', '/api/auth/me', null, studentToken);
    assert.equal(authMe.status, 200);
    assert.equal(authMe.body.data.user.email, 'test.candidate@nit.edu');
    console.log('PASS [4/9]: Protected Route Middleware Verification');

    // 5. Role-Based Authorization (Student blocked from Admin & Recruiter routes)
    const forbiddenAdmin = await request(
      server,
      'GET',
      '/api/admin/dashboard',
      null,
      studentToken
    );
    assert.equal(forbiddenAdmin.status, 403);
    console.log('PASS [5/9]: Role-Based Access Control (RBAC 403 Enforcement)');

    // 6. Job Creation by Recruiter
    const createJobRes = await request(
      server,
      'POST',
      '/api/jobs',
      {
        title: 'Backend Systems Engineer',
        description: 'Build distributed Node.js services',
        location: 'Bengaluru, India',
        packageLPA: 20,
        deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        eligibility: {
          minCgpa: 8.0,
          allowedBranches: ['CSE', 'IT'],
          graduationYear: 2027,
          maxBacklogs: 0,
          requiredSkills: ['JavaScript', 'Node.js'],
        },
      },
      recruiterToken
    );
    assert.equal(createJobRes.status, 201);
    const createdJobId = createJobRes.body.data._id;
    console.log('PASS [6/9]: Job Creation by Recruiter');

    // 7. Backend Eligibility Engine Check
    const jobDetailEligible = await request(
      server,
      'GET',
      `/api/jobs/${createdJobId}`,
      null,
      studentToken
    );
    assert.equal(jobDetailEligible.status, 200);
    assert.equal(jobDetailEligible.body.data.eligibility.eligible, true);

    // Login as ineligible student (Rohan Verma: ECE, 6.85 CGPA, 1 Backlog)
    const rohanLogin = await request(server, 'POST', '/api/auth/login', {
      email: 'rohan.verma@nit.edu',
      password: 'CampusHire@2027',
    });
    const rohanToken = rohanLogin.body.data.token;
    const jobDetailIneligible = await request(
      server,
      'GET',
      `/api/jobs/${createdJobId}`,
      null,
      rohanToken
    );
    assert.equal(jobDetailIneligible.body.data.eligibility.eligible, false);
    assert.ok(jobDetailIneligible.body.data.eligibility.reasons.length >= 2);
    console.log('PASS [7/9]: Backend Job Eligibility Engine (Eligible & Ineligible Reasons)');

    // 8. Application Creation & Duplicate Prevention
    const applyRes = await request(
      server,
      'POST',
      '/api/applications',
      { jobId: createdJobId, coverNote: 'Excited to apply' },
      studentToken
    );
    assert.equal(applyRes.status, 201);
    const applicationId = applyRes.body.data._id;

    // Duplicate application attempt -> 409 Conflict
    const dupApplyRes = await request(
      server,
      'POST',
      '/api/applications',
      { jobId: createdJobId },
      studentToken
    );
    assert.equal(dupApplyRes.status, 409);
    console.log('PASS [8/9]: Application Submission & Duplicate Prevention (409 Conflict)');

    // 9. Application Workflow State Transition
    const statusUpdateRes = await request(
      server,
      'PATCH',
      `/api/applications/${applicationId}/status`,
      { status: 'SHORTLISTED', remarks: 'Strong backend fundamentals' },
      recruiterToken
    );
    assert.equal(statusUpdateRes.status, 200);
    assert.equal(statusUpdateRes.body.data.status, 'SHORTLISTED');
    console.log('PASS [9/9]: Application State Machine Transition (APPLIED -> SHORTLISTED)');

    console.log('==========================================================');
    console.log('ALL 9 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('==========================================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
