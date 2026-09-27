import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  Shield,
  Briefcase,
  GraduationCap,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { systemService } from '../services/api.js';
import SystemHealthModal from '../components/SystemHealthModal.jsx';

const DEMO_ACCOUNTS = [
  {
    role: 'STUDENT (ELIGIBLE)',
    name: 'Aarav Sharma',
    subtitle: 'B.Tech CSE · 2027 · 8.65 CGPA · 0 Backlogs',
    email: 'aarav.sharma@nit.edu',
    password: 'CampusHire@2027',
    icon: GraduationCap,
  },
  {
    role: 'STUDENT (EDGE CASE)',
    name: 'Rohan Verma',
    subtitle: 'B.Tech ECE · 2027 · 6.85 CGPA · 1 Backlog (Tests Ineligibility)',
    email: 'rohan.verma@nit.edu',
    password: 'CampusHire@2027',
    icon: GraduationCap,
  },
  {
    role: 'RECRUITER',
    name: 'Siddharth Malhotra',
    subtitle: 'CloudScale Systems · Talent Acquisition Lead',
    email: 'recruiter@cloudscale.io',
    password: 'CampusHire@2027',
    icon: Briefcase,
  },
  {
    role: 'PLACEMENT OFFICER / ADMIN',
    name: 'Dr. Rajeshwari Menon',
    subtitle: 'Training & Placement Cell · Full Campus Control',
    email: 'tpo.admin@nit.edu',
    password: 'CampusHire@2027',
    icon: Shield,
  },
];

export default function AuthPage() {
  const { login, register, toast } = useAuth();

  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [role, setRole] = useState('STUDENT'); // 'STUDENT' | 'RECRUITER'
  const [email, setEmail] = useState('aarav.sharma@nit.edu');
  const [password, setPassword] = useState('CampusHire@2027');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [graduationYear, setGraduationYear] = useState(2027);
  const [cgpa, setCgpa] = useState(8.2);
  const [skills, setSkills] = useState('JavaScript, React, Node.js, MongoDB');
  const [companyName, setCompanyName] = useState('');
  const [companyLocation, setCompanyLocation] = useState('Bengaluru, India');
  const [designation, setDesignation] = useState('Technical Recruiter');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [showHealthModal, setShowHealthModal] = useState(false);

  useEffect(() => {
    systemService
      .getHealth()
      .then((res) => setHealth(res.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'LOGIN') {
        await login(email, password);
      } else {
        await register({
          name,
          email,
          password,
          role,
          rollNumber,
          branch,
          graduationYear: Number(graduationYear),
          cgpa: Number(cgpa),
          skills,
          companyName,
          companyLocation,
          designation,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demo) => {
    setError('');
    setEmail(demo.email);
    setPassword(demo.password);
    setSubmitting(true);
    try {
      await login(demo.email, demo.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 Zones */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-10">
        <a href="/" className="text-lg font-bold tracking-tight text-slate-900">
          CampusHire
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition-colors">
            Eligibility Engine
          </a>
          <a href="#workflow" className="hover:text-slate-900 transition-colors">
            Placement Workflow
          </a>
          <a href="#demo-access" className="hover:text-slate-900 transition-colors">
            Demo Portals
          </a>
          <button
            onClick={() => setShowHealthModal(true)}
            className="hover:text-slate-900 transition-colors"
          >
            MERN Architecture
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHealthModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            {health?.status === 'OK' ? 'API Connected · 200 OK' : 'Inspect API Health'}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-10 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Platform Overview & Instant Demo Credentials */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-blue-600 tracking-wide">
              Centralized University Placement & Recruitment Management Platform
            </p>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Automated Eligibility Verification, Candidate Pipelines, and Campus Hiring Analytics.
            </h1>
            <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
              Replace fragmented spreadsheets, manual CGPA verification, and scattered interview links
              with a unified MERN platform built for Students, Recruiters, and Training &amp; Placement Officers.
            </p>
          </div>

          {/* Instant 1-Click Role Switcher Cards */}
          <div id="demo-access" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Instant 1-Click Demo Login (Pre-Seeded MongoDB Accounts)
              </h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Password: CampusHire@2027
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {DEMO_ACCOUNTS.map((acct) => {
                const Icon = acct.icon;
                return (
                  <button
                    key={acct.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickDemoLogin(acct)}
                    className="group text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-600 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-blue-600">{acct.role}</span>
                        <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">{acct.name}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{acct.subtitle}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span className="truncate">{acct.email}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Architectural Capabilities */}
          <div
            id="features"
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold text-slate-900">
              Production MERN Architecture & Key Engineering Highlights
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Backend Job Eligibility Engine
                </p>
                <p className="leading-relaxed">
                  Server-side verification of Minimum CGPA, Allowed Branches, Graduation Batch,
                  Active Backlogs, and Normalized Technical Skills with diagnostic reasons.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  State-Machine Application Workflow
                </p>
                <p className="leading-relaxed">
                  Strict transition validation across APPLIED → SHORTLISTED → INTERVIEW_SCHEDULED →
                  SELECTED / REJECTED with compound unique index duplicate prevention.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  JWT + bcrypt + Role-Based Access Control
                </p>
                <p className="leading-relaxed">
                  Dedicated middleware enforcing strict isolation between Student, Recruiter, and
                  Placement Officer API endpoints.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Live Backend Health & Telemetry
                </p>
                <p className="leading-relaxed">
                  Connected to{' '}
                  <span className="font-mono text-slate-800">
                    {health?.database?.databaseName || 'campushire_db'}
                  </span>{' '}
                  with fail-open Redis TTL caching and automated notification dispatch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Login / Registration Form Card */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            {/* Segmented Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In to Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setError('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  mode === 'REGISTER'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                New Account Registration
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'REGISTER' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Select Account Role
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {['STUDENT', 'RECRUITER'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                            role === r
                              ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {r === 'STUDENT' ? 'B.Tech Student' : 'Company Recruiter'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aditya Kulkarni"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Institutional / Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nit.edu"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {mode === 'REGISTER' && role === 'STUDENT' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        required
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        placeholder="BT23CSE055"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Branch
                      </label>
                      <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
                      >
                        {['CSE', 'IT', 'ECE', 'AIML', 'EEE', 'MECH', 'CIVIL'].map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Current CGPA
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        required
                        value={cgpa}
                        onChange={(e) => setCgpa(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Graduation Year
                      </label>
                      <input
                        type="number"
                        required
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Technical Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="JavaScript, React, Node.js, MongoDB"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
              )}

              {mode === 'REGISTER' && role === 'RECRUITER' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Stripe India Engineering"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        required
                        value={companyLocation}
                        onChange={(e) => setCompanyLocation(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Your Designation
                      </label>
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {submitting
                  ? 'Authenticating via JWT...'
                  : mode === 'LOGIN'
                  ? 'Sign In to CampusHire'
                  : 'Create Verified Account'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg">
          {toast.message}
        </div>
      )}

      <SystemHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
      />
    </div>
  );
}
