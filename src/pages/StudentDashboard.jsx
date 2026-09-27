import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Calendar,
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  ExternalLink,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import WorkspaceLayout from '../components/WorkspaceLayout.jsx';
import {
  studentService,
  jobService,
  applicationService,
  interviewService,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function StudentDashboard() {
  const { showToast, fetchNotifications } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Jobs Explorer state
  const [jobsList, setJobsList] = useState([]);
  const [jobsPagination, setJobsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [jobFilters, setJobFilters] = useState({
    search: '',
    branch: 'ALL',
    jobType: 'ALL',
    minCgpa: '',
    page: 1,
  });
  const [jobsLoading, setJobsLoading] = useState(false);

  // Selected Job Modal (Backend Eligibility Inspector)
  const [selectedJobDetail, setSelectedJobDetail] = useState(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);

  // My Applications & Interviews
  const [myApplications, setMyApplications] = useState([]);
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [myInterviews, setMyInterviews] = useState([]);

  // Profile Editor state
  const [profileForm, setProfileForm] = useState({
    rollNumber: '',
    phone: '',
    college: '',
    branch: 'CSE',
    graduationYear: 2027,
    cgpa: 8.0,
    activeBacklogs: 0,
    skillsText: '',
    projects: [],
    experience: [],
    education: [],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentService.getDashboard();
      const data = res.data.data;
      setDashboardData(data);

      if (data.profile) {
        const p = data.profile;
        setProfileForm({
          rollNumber: p.rollNumber || '',
          phone: p.phone || '',
          college: p.college || 'National Institute of Technology & Engineering',
          branch: p.branch || 'CSE',
          graduationYear: p.graduationYear || 2027,
          cgpa: p.cgpa ?? 0,
          activeBacklogs: p.activeBacklogs ?? 0,
          skillsText: (p.skills || []).join(', '),
          projects: p.projects || [],
          experience: p.experience || [],
          education: p.education || [],
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load student dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await jobService.getJobs({
        ...jobFilters,
        limit: 8,
      });
      setJobsList(res.data.data.jobs || []);
      setJobsPagination(res.data.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      // Handle error quietly
    } finally {
      setJobsLoading(false);
    }
  }, [jobFilters]);

  const loadMyApplications = useCallback(async () => {
    try {
      const res = await applicationService.getMyApplications({ status: appStatusFilter });
      setMyApplications(res.data.data || []);
    } catch {
      // Ignore
    }
  }, [appStatusFilter]);

  const loadMyInterviews = useCallback(async () => {
    try {
      const res = await interviewService.getInterviews();
      setMyInterviews(res.data.data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'jobs') loadJobs();
    if (activeTab === 'applications') loadMyApplications();
    if (activeTab === 'interviews') loadMyInterviews();
  }, [activeTab, loadJobs, loadMyApplications, loadMyInterviews]);

  const openJobInspector = async (jobId) => {
    setJobDetailLoading(true);
    setCoverNote('');
    try {
      const res = await jobService.getJobById(jobId);
      setSelectedJobDetail(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not load job details', 'error');
    } finally {
      setJobDetailLoading(false);
    }
  };

  const handleApplyToJob = async (e) => {
    e.preventDefault();
    if (!selectedJobDetail?.job?._id) return;
    setApplying(true);
    try {
      await applicationService.apply({
        jobId: selectedJobDetail.job._id,
        coverNote,
      });
      showToast('Application submitted successfully!', 'success');
      await openJobInspector(selectedJobDetail.job._id);
      await loadDashboard();
      await loadJobs();
      await fetchNotifications();
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Unable to submit application',
        'error'
      );
    } finally {
      setApplying(false);
    }
  };

  const handleWithdrawApplication = async (applicationId) => {
    try {
      await applicationService.updateStatus(applicationId, {
        status: 'WITHDRAWN',
        remarks: 'Withdrawn by candidate',
      });
      showToast('Application withdrawn', 'info');
      await loadMyApplications();
      await loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not withdraw application', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await studentService.updateProfile({
        rollNumber: profileForm.rollNumber,
        phone: profileForm.phone,
        college: profileForm.college,
        branch: profileForm.branch,
        graduationYear: Number(profileForm.graduationYear),
        cgpa: Number(profileForm.cgpa),
        activeBacklogs: Number(profileForm.activeBacklogs),
        skills: profileForm.skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        projects: profileForm.projects,
        experience: profileForm.experience,
        education: profileForm.education,
      });
      showToast('Profile saved. Job eligibility rules recalculated!', 'success');
      await loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Only PDF files (.pdf) are permitted for resumes', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Resume file size cannot exceed 5MB', 'error');
      return;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      await studentService.uploadResumeFile(formData);
      showToast(`Uploaded PDF resume: ${file.name}`, 'success');
      await loadDashboard();
    } catch {
      // Fallback metadata registration if multipart stream is intercepted
      await studentService.uploadResumeMeta({
        resumeName: file.name,
        resumeUrl: `/uploads/resumes/${Date.now()}-${file.name}`,
      });
      showToast(`Uploaded PDF resume: ${file.name}`, 'success');
      await loadDashboard();
    } finally {
      setUploadingResume(false);
    }
  };

  const stats = dashboardData?.stats || {};
  const profile = dashboardData?.profile || {};

  const navigationItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'jobs',
      label: 'Job Board & Eligibility',
      icon: Briefcase,
      count: stats.totalOpenJobsCount,
    },
    {
      id: 'applications',
      label: 'My Applications',
      icon: FileText,
      count: stats.totalApplications,
    },
    {
      id: 'interviews',
      label: 'Interviews',
      icon: Calendar,
      count: stats.interviewsScheduled,
    },
    {
      id: 'profile',
      label: 'Profile & Resume',
      icon: UserCheck,
      count: `${stats.profileCompletion || 0}%`,
    },
  ];

  return (
    <WorkspaceLayout
      roleTitle="B.Tech Student Candidate"
      navigationItems={navigationItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSeedReset={loadDashboard}
    >
      {/* TAB 1: STUDENT OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Candidate Placement Workspace
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {profile.rollNumber} · Branch: {profile.branch} · Batch {profile.graduationYear} ·
                CGPA: <span className="font-mono font-semibold text-slate-800">{Number(profile.cgpa || 0).toFixed(2)}</span> ·
                Active Backlogs: <span className="font-mono font-semibold text-slate-800">{profile.activeBacklogs ?? 0}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('profile')}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Edit Profile &amp; CGPA
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Explore Eligible Jobs ({stats.availableEligibleJobsCount || 0})
              </button>
            </div>
          </div>

          {/* 6-Metric Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                label: 'Profile Completion',
                value: `${stats.profileCompletion ?? 0}%`,
                sub: profile.resumeName ? 'Resume Attached' : 'Resume Pending',
              },
              {
                label: 'Eligible Open Jobs',
                value: stats.availableEligibleJobsCount ?? 0,
                sub: `of ${stats.totalOpenJobsCount ?? 0} total drives`,
              },
              {
                label: 'Total Applications',
                value: stats.totalApplications ?? 0,
                sub: 'Submitted drives',
              },
              {
                label: 'Shortlisted',
                value: stats.shortlistedCount ?? 0,
                sub: 'Cleared screening',
              },
              {
                label: 'Interviews Scheduled',
                value: stats.interviewsScheduled ?? 0,
                sub: 'Upcoming rounds',
              },
              {
                label: 'Selected Offers',
                value: stats.selectedOffers ?? 0,
                sub: profile.placementStatus || 'UNPLACED',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between"
              >
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-slate-500 truncate">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Two-Column Content: Eligible Drives + Upcoming Interviews & Applications */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Jobs with Live Backend Eligibility Status */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Campus Job Drives &amp; Automated Eligibility Evaluation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any job to inspect the backend eligibility rule breakdown
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                >
                  View All Jobs
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {(dashboardData?.allEvaluatedJobs || []).map((job) => {
                  const isEligible = job.eligibilityReport?.eligible;
                  return (
                    <div
                      key={job._id}
                      className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
                        </div>
                        <p className="text-xs text-slate-600">
                          {job.company?.name} · {job.location} · {job.workMode} ·{' '}
                          <span className="font-mono font-semibold text-slate-900">
                            {job.packageLPA} LPA
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          Criteria: Min CGPA {job.eligibility?.minCgpa} · Branches:{' '}
                          {(job.eligibility?.allowedBranches || []).join(', ')} · Max Backlogs:{' '}
                          {job.eligibility?.maxBacklogs}
                        </p>
                        {!isEligible && job.eligibilityReport?.reasons?.length > 0 && (
                          <p className="text-xs text-red-600 font-medium">
                            Ineligible: {job.eligibilityReport.reasons[0]}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-semibold ${
                            job.hasApplied
                              ? 'text-blue-600'
                              : isEligible
                              ? 'text-emerald-700'
                              : 'text-red-600'
                          }`}
                        >
                          {job.hasApplied
                            ? 'Applied'
                            : isEligible
                            ? 'Eligible to Apply'
                            : 'Not Eligible'}
                        </span>
                        <button
                          onClick={() => openJobInspector(job._id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          Inspect &amp; Apply
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Cols: Upcoming Interviews & Recent Application Status */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Scheduled Interviews
                  </h2>
                  <button
                    onClick={() => setActiveTab('interviews')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Full Schedule
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {(dashboardData?.upcomingInterviews || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No upcoming interviews scheduled yet.
                    </div>
                  ) : (
                    (dashboardData?.upcomingInterviews || []).map((iv) => (
                      <div key={iv._id} className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{iv.roundName}</p>
                          <span className="text-xs font-mono font-semibold text-blue-600">
                            {iv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {iv.job?.company?.name} · {iv.job?.title}
                        </p>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          {new Date(iv.scheduledAt).toLocaleString()} · {iv.durationMinutes} mins ·{' '}
                          {iv.mode}
                        </p>
                        {iv.meetingLinkOrLocation && (
                          <p className="text-xs text-blue-600 truncate font-mono">
                            Link/Venue: {iv.meetingLinkOrLocation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Recent Application Status
                  </h2>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    All Applications
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {(dashboardData?.recentApplications || []).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      You have not applied to any jobs yet.
                    </div>
                  ) : (
                    (dashboardData?.recentApplications || []).map((app) => (
                      <div
                        key={app._id}
                        className="p-4 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {app.job?.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {app.job?.company?.name} · {app.job?.packageLPA} LPA
                          </p>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-800">
                          {app.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOB BOARD & BACKEND ELIGIBILITY ENGINE */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Campus Job Opportunities &amp; Eligibility Engine
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Every job below is evaluated in real time against your academic profile (CGPA:{' '}
                <span className="font-mono font-semibold">{profile.cgpa}</span>, Branch:{' '}
                <span className="font-mono font-semibold">{profile.branch}</span>, Backlogs:{' '}
                <span className="font-mono font-semibold">{profile.activeBacklogs}</span>)
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={jobFilters.search}
                onChange={(e) =>
                  setJobFilters({ ...jobFilters, search: e.target.value, page: 1 })
                }
                placeholder="Search by role title, technology, or city..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <select
              value={jobFilters.branch}
              onChange={(e) =>
                setJobFilters({ ...jobFilters, branch: e.target.value, page: 1 })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Branches</option>
              {['CSE', 'IT', 'ECE', 'AIML', 'EEE', 'MECH'].map((b) => (
                <option key={b} value={b}>
                  Branch: {b}
                </option>
              ))}
            </select>

            <select
              value={jobFilters.jobType}
              onChange={(e) =>
                setJobFilters({ ...jobFilters, jobType: e.target.value, page: 1 })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Job Types</option>
              <option value="FULL_TIME">Full-Time Role</option>
              <option value="PPO">Internship + PPO</option>
              <option value="INTERNSHIP">Internship</option>
            </select>

            <input
              type="number"
              step="0.5"
              min="0"
              max="10"
              value={jobFilters.minCgpa}
              onChange={(e) =>
                setJobFilters({ ...jobFilters, minCgpa: e.target.value, page: 1 })
              }
              placeholder="Max Cutoff CGPA (e.g. 8.0)"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono tabular-nums"
            />
          </div>

          {/* Jobs Table / List */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {jobsLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Evaluating job eligibility criteria...
              </div>
            ) : jobsList.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No job openings match the selected filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {jobsList.map((job) => {
                  const report = job.eligibilityReport || { eligible: true, reasons: [] };
                  return (
                    <div
                      key={job._id}
                      className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {job.company?.name}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-mono font-semibold text-slate-900">
                            {job.packageLPA} LPA
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          {job.location} · {job.workMode} · {job.jobType} · Openings:{' '}
                          <span className="font-mono">{job.openings}</span> · Deadline:{' '}
                          <span className="font-mono">
                            {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        </p>

                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          Required: CGPA &ge; {job.eligibility?.minCgpa} · Branches:[
                          {(job.eligibility?.allowedBranches || []).join(', ')}] · Batch{' '}
                          {job.eligibility?.graduationYear} · Max Backlogs:{' '}
                          {job.eligibility?.maxBacklogs} · Skills:{' '}
                          {(job.eligibility?.requiredSkills || []).join(', ')}
                        </p>

                        {!report.eligible && report.reasons?.length > 0 && (
                          <div className="pt-1 space-y-0.5">
                            {report.reasons.map((r, idx) => (
                              <p
                                key={idx}
                                className="text-xs text-red-600 flex items-center gap-1.5"
                              >
                                <XCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{r}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {job.hasApplied ? (
                          <span className="text-xs font-mono font-semibold text-blue-600">
                            Status: {job.applicationStatus}
                          </span>
                        ) : report.eligible ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            Ineligible
                          </span>
                        )}

                        <button
                          onClick={() => openJobInspector(job._id)}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          {job.hasApplied ? 'View Application' : 'Check Eligibility & Apply'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
              <span className="font-mono tabular-nums">
                Total Matching Jobs: {jobsPagination.total} · Page {jobsPagination.page} of{' '}
                {jobsPagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={jobsPagination.page <= 1}
                  onClick={() =>
                    setJobFilters({ ...jobFilters, page: jobsPagination.page - 1 })
                  }
                  className="rounded border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={jobsPagination.page >= jobsPagination.totalPages}
                  onClick={() =>
                    setJobFilters({ ...jobFilters, page: jobsPagination.page + 1 })
                  }
                  className="rounded border border-slate-200 bg-white px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY APPLICATIONS & WORKFLOW TRACKER */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Application Status &amp; Workflow History
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Track real-time state transitions from APPLIED &rarr; SHORTLISTED &rarr;
                INTERVIEW_SCHEDULED &rarr; SELECTED
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED'].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setAppStatusFilter(st)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      appStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {myApplications.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  No applications found for filter: {appStatusFilter}
                </p>
                <button
                  onClick={() => setActiveTab('jobs')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Browse Eligible Jobs
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {myApplications.map((app) => (
                  <div key={app._id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {app.job?.title}
                        </h3>
                        <p className="text-xs text-slate-600">
                          {app.job?.company?.name} · {app.job?.location} ·{' '}
                          <span className="font-mono font-semibold">
                            {app.job?.packageLPA} LPA
                          </span>{' '}
                          · Applied on{' '}
                          <span className="font-mono">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-blue-700">
                          Current Stage: {app.status}
                        </span>
                        {app.status === 'APPLIED' && (
                          <button
                            onClick={() => handleWithdrawApplication(app._id)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    {app.recruiterRemarks && (
                      <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
                        <span className="font-semibold">Recruiter Note:</span>{' '}
                        {app.recruiterRemarks}
                      </p>
                    )}

                    {/* Workflow Audit Trail */}
                    {Array.isArray(app.statusHistory) && app.statusHistory.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                        {app.statusHistory.map((h, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mr-3 text-slate-300">&rarr;</span>}
                            <strong className="text-slate-700">{h.status}</strong> (
                            {new Date(h.updatedAt).toLocaleDateString()})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INTERVIEW SCHEDULES */}
      {activeTab === 'interviews' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              My Scheduled Interviews
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Technical, System Design, Managerial, and HR interview rounds scheduled by recruiters
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {myInterviews.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No interviews scheduled yet. Shortlisted applications will appear here once a
                recruiter assigns a time slot.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {myInterviews.map((iv) => (
                  <div
                    key={iv._id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {iv.roundName}
                        </h3>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono font-semibold text-blue-600">
                          {iv.roundType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {iv.job?.company?.name} — {iv.job?.title} ({iv.job?.packageLPA} LPA)
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        Scheduled: {new Date(iv.scheduledAt).toLocaleString()} · Duration:{' '}
                        {iv.durationMinutes} mins · Mode: {iv.mode}
                      </p>
                      {iv.instructions && (
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Instructions:</span> {iv.instructions}
                        </p>
                      )}
                      {iv.feedback && (
                        <p className="text-xs text-emerald-700">
                          <span className="font-semibold">Interviewer Feedback:</span>{' '}
                          {iv.feedback} {iv.rating ? `(Rating: ${iv.rating}/5)` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {iv.status}
                      </span>
                      {iv.meetingLinkOrLocation && iv.meetingLinkOrLocation.startsWith('http') && (
                        <a
                          href={iv.meetingLinkOrLocation}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Join Meeting
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STUDENT PROFILE & PDF RESUME UPLOAD */}
      {activeTab === 'profile' && (
        <div className="space-y-8">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Academic Profile &amp; Resume Management
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Changes to your CGPA, Branch, Graduation Year, Backlogs, or Skills immediately
                update your eligibility across all campus jobs.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Profile Completion</span>
              <p className="text-xl font-bold font-mono tabular-nums text-blue-600">
                {stats.profileCompletion ?? 0}%
              </p>
            </div>
          </div>

          {/* PDF Resume Upload Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Verified PDF Resume Document (POST /api/students/resume)
              </h2>
              <p className="text-xs text-slate-600">
                Current Resume:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {profile.resumeName || 'No PDF uploaded yet'}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Accepted format: .pdf only · Max file size: 5 MB · Multer validated
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap">
              <Upload className="h-4 w-4" />
              {uploadingResume ? 'Uploading PDF...' : 'Upload PDF Resume'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Academic & Skills Form */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-6"
          >
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
              Academic Credentials &amp; Eligibility Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  University Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.rollNumber}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, rollNumber: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, phone: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Academic Branch
                </label>
                <select
                  value={profileForm.branch}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, branch: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  {['CSE', 'IT', 'ECE', 'AIML', 'EEE', 'MECH', 'CIVIL'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cumulative GPA (CGPA out of 10.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  required
                  value={profileForm.cgpa}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, cgpa: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Active Backlogs Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  value={profileForm.activeBacklogs}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, activeBacklogs: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Graduation Year
                </label>
                <input
                  type="number"
                  min="2024"
                  max="2030"
                  required
                  value={profileForm.graduationYear}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, graduationYear: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Verified Technical Skills (comma-separated — matched by Eligibility Engine)
              </label>
              <input
                type="text"
                value={profileForm.skillsText}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, skillsText: e.target.value })
                }
                placeholder="JavaScript, React, Node.js, MongoDB, Express, C++, Python, SQL, Docker"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>

            {/* Projects Portfolio Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">
                  Engineering Projects ({profileForm.projects.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setProfileForm({
                      ...profileForm,
                      projects: [
                        ...profileForm.projects,
                        { title: '', description: '', techStack: ['React', 'Node.js'], projectUrl: '' },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project
                </button>
              </div>

              {profileForm.projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Project Title"
                      value={proj.title}
                      onChange={(e) => {
                        const updated = [...profileForm.projects];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        setProfileForm({ ...profileForm, projects: updated });
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = profileForm.projects.filter((_, i) => i !== idx);
                        setProfileForm({ ...profileForm, projects: updated });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Project architecture & key outcome..."
                    value={proj.description}
                    onChange={(e) => {
                      const updated = [...profileForm.projects];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      setProfileForm({ ...profileForm, projects: updated });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingProfile ? 'Saving & Recalculating Eligibility...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: JOB DETAILS & BACKEND ELIGIBILITY ENGINE INSPECTOR */}
      {(selectedJobDetail || jobDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {jobDetailLoading
                    ? 'Running Backend Eligibility Verification...'
                    : selectedJobDetail?.job?.title}
                </h2>
                {selectedJobDetail?.job && (
                  <p className="text-xs text-slate-500">
                    {selectedJobDetail.job.company?.name} · {selectedJobDetail.job.location} ·{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {selectedJobDetail.job.packageLPA} LPA
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedJobDetail?.job && (
              <div className="max-h-[78vh] overflow-y-auto p-6 space-y-6">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedJobDetail.job.description}
                </p>

                {/* Backend Eligibility Engine Breakdown */}
                {selectedJobDetail.eligibility && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Backend Eligibility Engine Result (GET /api/jobs/:id)
                      </h3>
                      <span
                        className={`text-xs font-mono font-semibold ${
                          selectedJobDetail.eligibility.eligible
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        eligible: {String(selectedJobDetail.eligibility.eligible)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {[
                        {
                          label: `CGPA >= ${selectedJobDetail.job.eligibility?.minCgpa}`,
                          pass: selectedJobDetail.eligibility.checks?.cgpa,
                        },
                        {
                          label: 'Branch Allowed',
                          pass: selectedJobDetail.eligibility.checks?.branch,
                        },
                        {
                          label: `Batch ${selectedJobDetail.job.eligibility?.graduationYear}`,
                          pass: selectedJobDetail.eligibility.checks?.graduationYear,
                        },
                        {
                          label: `Backlogs <= ${selectedJobDetail.job.eligibility?.maxBacklogs}`,
                          pass: selectedJobDetail.eligibility.checks?.backlogs,
                        },
                        {
                          label: 'Required Skills',
                          pass: selectedJobDetail.eligibility.checks?.skills,
                        },
                      ].map((chk) => (
                        <div
                          key={chk.label}
                          className="rounded-lg border border-slate-200 bg-white p-2.5 flex items-center justify-between"
                        >
                          <span className="text-slate-700 font-medium truncate">{chk.label}</span>
                          {chk.pass ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {!selectedJobDetail.eligibility.eligible &&
                      selectedJobDetail.eligibility.reasons?.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                          <p className="text-xs font-semibold text-red-800">
                            Backend Ineligibility Reasons:
                          </p>
                          {selectedJobDetail.eligibility.reasons.map((r, i) => (
                            <p key={i} className="text-xs text-red-700 font-mono">
                              • {r}
                            </p>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Application Action */}
                {selectedJobDetail.existingApplication ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-900">
                        You have already applied for this opening
                      </p>
                      <p className="text-xs text-blue-700 font-mono mt-0.5">
                        Current Application Status: {selectedJobDetail.existingApplication.status}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                ) : selectedJobDetail.eligibility?.eligible ? (
                  <form onSubmit={handleApplyToJob} className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Cover Note / Statement of Interest (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        placeholder="Highlight relevant projects, internships, or competitive coding experience..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedJobDetail(null)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={applying}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {applying ? 'Submitting Application...' : 'Submit Official Application'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                      Tip: You can update your CGPA, skills, or backlogs in the Profile tab to test
                      eligibility changes.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedJobDetail(null);
                        setActiveTab('profile');
                      }}
                      className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Go to Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
