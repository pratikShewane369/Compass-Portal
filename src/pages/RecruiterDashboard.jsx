import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import WorkspaceLayout from '../components/WorkspaceLayout.jsx';
import {
  recruiterService,
  jobService,
  applicationService,
  interviewService,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const ALL_BRANCHES = ['CSE', 'IT', 'ECE', 'AIML', 'EEE', 'MECH', 'CIVIL'];

export default function RecruiterDashboard() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create / Edit Job Modal
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    jobType: 'FULL_TIME',
    location: 'Bengaluru, India',
    workMode: 'HYBRID',
    packageLPA: 18.0,
    stipendPerMonth: 60000,
    openings: 5,
    deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    minCgpa: 7.5,
    allowedBranches: ['CSE', 'IT', 'AIML'],
    graduationYear: 2027,
    maxBacklogs: 0,
    requiredSkillsText: 'JavaScript, React, Node.js',
  });
  const [savingJob, setSavingJob] = useState(false);

  // Applicants ATS View
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applicantsData, setApplicantsData] = useState({ job: null, applicants: [] });
  const [applicantFilters, setApplicantFilters] = useState({
    status: 'ALL',
    branch: 'ALL',
    minCgpa: '',
    graduationYear: '',
    search: '',
  });
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [inspectCandidate, setInspectCandidate] = useState(null);

  // Schedule Interview Modal
  const [interviewModalApp, setInterviewModalApp] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    roundName: 'Technical & System Design Round 1',
    roundType: 'TECHNICAL',
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16),
    durationMinutes: 45,
    mode: 'ONLINE',
    meetingLinkOrLocation: 'https://meet.cloudscale.io/technical-panel-1',
    instructions: 'Please join 5 minutes early with your IDE ready.',
  });
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Company Profile Editor
  const [companyForm, setCompanyForm] = useState({
    name: '',
    website: '',
    industry: '',
    location: '',
    description: '',
    tier: 'TIER_1_DREAM',
    designation: '',
    phone: '',
  });
  const [savingCompany, setSavingCompany] = useState(false);

  const loadRecruiterDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recruiterService.getDashboard();
      const data = res.data.data;
      setDashboard(data);

      if (data.jobs?.length > 0 && !selectedJobId) {
        setSelectedJobId(data.jobs[0]._id);
      }

      if (data.company) {
        setCompanyForm({
          name: data.company.name || '',
          website: data.company.website || '',
          industry: data.company.industry || '',
          location: data.company.location || '',
          description: data.company.description || '',
          tier: data.company.tier || 'TIER_1_DREAM',
          designation: data.recruiterProfile?.designation || '',
          phone: data.recruiterProfile?.phone || '',
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load recruiter dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, showToast]);

  const loadJobApplicants = useCallback(async () => {
    if (!selectedJobId) return;
    setLoadingApplicants(true);
    try {
      const res = await recruiterService.getJobApplicants(selectedJobId, applicantFilters);
      setApplicantsData(res.data.data || { job: null, applicants: [] });
    } catch {
      // Ignore
    } finally {
      setLoadingApplicants(false);
    }
  }, [selectedJobId, applicantFilters]);

  useEffect(() => {
    loadRecruiterDashboard();
  }, [loadRecruiterDashboard]);

  useEffect(() => {
    if (activeTab === 'applicants' && selectedJobId) {
      loadJobApplicants();
    }
  }, [activeTab, selectedJobId, loadJobApplicants]);

  const openCreateJobModal = () => {
    setEditingJobId(null);
    setJobForm({
      title: '',
      description: '',
      jobType: 'FULL_TIME',
      location: dashboard?.company?.location || 'Bengaluru, India',
      workMode: 'HYBRID',
      packageLPA: 18.0,
      stipendPerMonth: 60000,
      openings: 5,
      deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      minCgpa: 7.5,
      allowedBranches: ['CSE', 'IT', 'AIML'],
      graduationYear: 2027,
      maxBacklogs: 0,
      requiredSkillsText: 'JavaScript, React, Node.js',
    });
    setShowJobModal(true);
  };

  const openEditJobModal = (job) => {
    setEditingJobId(job._id);
    setJobForm({
      title: job.title || '',
      description: job.description || '',
      jobType: job.jobType || 'FULL_TIME',
      location: job.location || '',
      workMode: job.workMode || 'HYBRID',
      packageLPA: job.packageLPA ?? 15,
      stipendPerMonth: job.stipendPerMonth ?? 50000,
      openings: job.openings ?? 3,
      deadline: job.deadline
        ? new Date(job.deadline).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      minCgpa: job.eligibility?.minCgpa ?? 7.0,
      allowedBranches: job.eligibility?.allowedBranches || ['CSE', 'IT'],
      graduationYear: job.eligibility?.graduationYear ?? 2027,
      maxBacklogs: job.eligibility?.maxBacklogs ?? 0,
      requiredSkillsText: (job.eligibility?.requiredSkills || []).join(', '),
    });
    setShowJobModal(true);
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setSavingJob(true);
    try {
      const payload = {
        title: jobForm.title,
        description: jobForm.description,
        jobType: jobForm.jobType,
        location: jobForm.location,
        workMode: jobForm.workMode,
        packageLPA: Number(jobForm.packageLPA),
        stipendPerMonth: Number(jobForm.stipendPerMonth),
        openings: Number(jobForm.openings),
        deadline: jobForm.deadline,
        eligibility: {
          minCgpa: Number(jobForm.minCgpa),
          allowedBranches: jobForm.allowedBranches,
          graduationYear: Number(jobForm.graduationYear),
          maxBacklogs: Number(jobForm.maxBacklogs),
          requiredSkills: jobForm.requiredSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };

      if (editingJobId) {
        await jobService.updateJob(editingJobId, payload);
        showToast('Job opening and eligibility criteria updated!', 'success');
      } else {
        await jobService.createJob(payload);
        showToast('New job opportunity published!', 'success');
      }

      setShowJobModal(false);
      await loadRecruiterDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save job posting', 'error');
    } finally {
      setSavingJob(false);
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      await jobService.deleteJob(jobId);
      showToast('Job opening marked as CLOSED', 'info');
      await loadRecruiterDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to close job', 'error');
    }
  };

  const handleCandidateStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationService.updateStatus(applicationId, {
        status: newStatus,
        remarks: `Updated to ${newStatus} by Recruiter`,
      });
      showToast(`Candidate status updated to ${newStatus}`, 'success');
      await loadJobApplicants();
      await loadRecruiterDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid status transition', 'error');
    }
  };

  const handleScheduleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!interviewModalApp) return;
    setSchedulingInterview(true);
    try {
      await interviewService.scheduleInterview({
        applicationId: interviewModalApp._id,
        ...interviewForm,
      });
      showToast('Interview scheduled and candidate notified!', 'success');
      setInterviewModalApp(null);
      await loadJobApplicants();
      await loadRecruiterDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to schedule interview', 'error');
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await recruiterService.updateCompany(companyForm);
      showToast('Company profile updated successfully', 'success');
      await loadRecruiterDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update company profile', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const toggleBranchInForm = (branch) => {
    const exists = jobForm.allowedBranches.includes(branch);
    if (exists && jobForm.allowedBranches.length === 1) return;
    setJobForm({
      ...jobForm,
      allowedBranches: exists
        ? jobForm.allowedBranches.filter((b) => b !== branch)
        : [...jobForm.allowedBranches, branch],
    });
  };

  const stats = dashboard?.stats || {};
  const company = dashboard?.company || {};

  const navigationItems = [
    { id: 'overview', label: 'Hiring Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Openings', icon: Briefcase, count: stats.totalJobs },
    {
      id: 'applicants',
      label: 'Applicant Pipeline',
      icon: Users,
      count: stats.totalApplicants,
    },
    {
      id: 'interviews',
      label: 'Interviews',
      icon: Calendar,
      count: stats.interviewsScheduled,
    },
    { id: 'company', label: 'Company Profile', icon: Building2 },
  ];

  return (
    <WorkspaceLayout
      roleTitle={`Recruiter · ${company.name || 'Employer'}`}
      navigationItems={navigationItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSeedReset={loadRecruiterDashboard}
      primaryAction={
        <button
          onClick={openCreateJobModal}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Post New Job Drive
        </button>
      }
    >
      {/* TAB 1: RECRUITER HIRING DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {company.name || 'Company'} — Campus Recruitment Console
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {company.industry} · {company.location} · Classification: {company.tier}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('applicants')}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Review Applicants ({stats.totalApplicants || 0})
              </button>
              <button
                onClick={openCreateJobModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Post Job Opening
              </button>
            </div>
          </div>

          {/* 6 KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Job Postings', value: stats.totalJobs ?? 0, sub: 'All drives' },
              { label: 'Active Open Jobs', value: stats.activeJobs ?? 0, sub: 'Accepting apps' },
              { label: 'Total Applicants', value: stats.totalApplicants ?? 0, sub: 'Eligible candidates' },
              { label: 'Shortlisted', value: stats.shortlistedCandidates ?? 0, sub: 'In evaluation' },
              { label: 'Interviews Scheduled', value: stats.interviewsScheduled ?? 0, sub: 'Active panels' },
              { label: 'Selected / Hired', value: stats.selectedCandidates ?? 0, sub: 'Final offers' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between"
              >
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Recent Applicants Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Recent Candidate Applications Across Drives
                </h2>
                <p className="text-xs text-slate-500">
                  Shortlist, reject, or schedule interviews directly from the candidate pipeline
                </p>
              </div>
              <button
                onClick={() => setActiveTab('applicants')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Open Full ATS Filter View
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Job Opening</th>
                    <th className="py-3 px-4">Branch &amp; Batch</th>
                    <th className="py-3 px-4 text-right">CGPA</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(dashboard?.recentApplicants || []).map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{app.student?.name}</p>
                        <p className="text-slate-500 font-mono">{app.student?.email}</p>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {app.job?.title}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {app.studentProfile?.branch} · {app.studentProfile?.graduationYear}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {Number(app.studentProfile?.cgpa || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                        {app.status}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setInspectCandidate(app)}
                          className="rounded border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Profile
                        </button>
                        {app.status === 'APPLIED' && (
                          <button
                            onClick={() =>
                              handleCandidateStatusChange(app._id, 'SHORTLISTED')
                            }
                            className="rounded bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
                          >
                            Shortlist
                          </button>
                        )}
                        {['SHORTLISTED', 'APPLIED'].includes(app.status) && (
                          <button
                            onClick={() => setInterviewModalApp(app)}
                            className="rounded bg-slate-900 px-2.5 py-1 font-semibold text-white hover:bg-slate-800"
                          >
                            Schedule Interview
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE JOB OPENINGS */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Company Job Postings &amp; Eligibility Rules
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Define CGPA cutoffs, allowed engineering branches, backlog limits, and required
                skills
              </p>
            </div>
            <button
              onClick={openCreateJobModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Job Opening
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
            {(dashboard?.jobs || []).map((job) => (
              <div
                key={job._id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-mono font-semibold text-slate-800">
                      {job.packageLPA} LPA
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        job.status === 'OPEN' ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    {job.location} · {job.workMode} · {job.jobType} · Openings:{' '}
                    <span className="font-mono">{job.openings}</span>
                  </p>

                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    Eligibility Engine Rules: Min CGPA {job.eligibility?.minCgpa} · Branches:[
                    {(job.eligibility?.allowedBranches || []).join(', ')}] · Batch{' '}
                    {job.eligibility?.graduationYear} · Max Backlogs:{' '}
                    {job.eligibility?.maxBacklogs} · Skills:[
                    {(job.eligibility?.requiredSkills || []).join(', ')}]
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedJobId(job._id);
                      setActiveTab('applicants');
                    }}
                    className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    View Applicants
                  </button>
                  <button
                    onClick={() => openEditJobModal(job)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit Rules
                  </button>
                  {job.status === 'OPEN' && (
                    <button
                      onClick={() => handleCloseJob(job._id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Close Drive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: APPLICANT TRACKING & SHORTLISTING PIPELINE */}
      {activeTab === 'applicants' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Candidate Pipeline &amp; Shortlisting (ATS)
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Filter eligible applicants, inspect resumes, transition stages, and schedule
                interviews
              </p>
            </div>

            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900"
            >
              {(dashboard?.jobs || []).map((j) => (
                <option key={j._id} value={j._id}>
                  Drive: {j.title} ({j.packageLPA} LPA)
                </option>
              ))}
            </select>
          </div>

          {/* Applicant Filter Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={applicantFilters.search}
                onChange={(e) =>
                  setApplicantFilters({ ...applicantFilters, search: e.target.value })
                }
                placeholder="Search candidate name, roll number, or skill..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm"
              />
            </div>

            <select
              value={applicantFilters.status}
              onChange={(e) =>
                setApplicantFilters({ ...applicantFilters, status: e.target.value })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Stages</option>
              <option value="APPLIED">APPLIED</option>
              <option value="SHORTLISTED">SHORTLISTED</option>
              <option value="INTERVIEW_SCHEDULED">INTERVIEW_SCHEDULED</option>
              <option value="SELECTED">SELECTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>

            <select
              value={applicantFilters.branch}
              onChange={(e) =>
                setApplicantFilters({ ...applicantFilters, branch: e.target.value })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Branches</option>
              {ALL_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.1"
              placeholder="Min CGPA (e.g. 8.0)"
              value={applicantFilters.minCgpa}
              onChange={(e) =>
                setApplicantFilters({ ...applicantFilters, minCgpa: e.target.value })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono tabular-nums"
            />
          </div>

          {/* Applicants Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {loadingApplicants ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Loading candidate applications...
              </div>
            ) : (applicantsData.applicants || []).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No applicants match the current filters for this job opening.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Roll No &amp; Branch</th>
                      <th className="py-3 px-4 text-right">CGPA</th>
                      <th className="py-3 px-4">Top Skills</th>
                      <th className="py-3 px-4">Resume</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Decision Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {applicantsData.applicants.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{app.student?.name}</p>
                          <p className="text-slate-500 font-mono">{app.student?.email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {app.studentProfile?.rollNumber} · {app.studentProfile?.branch} (
                          {app.studentProfile?.graduationYear})
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {Number(app.studentProfile?.cgpa || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {(app.studentProfile?.skills || []).slice(0, 4).join(' · ')}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setInspectCandidate(app)}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Inspect Profile &amp; PDF
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                          {app.status}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {app.status === 'APPLIED' && (
                            <button
                              onClick={() =>
                                handleCandidateStatusChange(app._id, 'SHORTLISTED')
                              }
                              className="rounded bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
                            >
                              Shortlist
                            </button>
                          )}
                          {['APPLIED', 'SHORTLISTED'].includes(app.status) && (
                            <button
                              onClick={() => setInterviewModalApp(app)}
                              className="rounded bg-slate-900 px-2.5 py-1 font-semibold text-white hover:bg-slate-800"
                            >
                              Interview
                            </button>
                          )}
                          {['SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status) && (
                            <button
                              onClick={() =>
                                handleCandidateStatusChange(app._id, 'SELECTED')
                              }
                              className="rounded bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
                            >
                              Select Offer
                            </button>
                          )}
                          {!['SELECTED', 'REJECTED'].includes(app.status) && (
                            <button
                              onClick={() =>
                                handleCandidateStatusChange(app._id, 'REJECTED')
                              }
                              className="rounded border border-red-200 px-2.5 py-1 font-medium text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SCHEDULED INTERVIEWS */}
      {activeTab === 'interviews' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Scheduled Candidate Interviews
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage technical, system design, and HR interview schedules for your company
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-200">
            {(dashboard?.interviews || []).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No interviews scheduled yet.
              </div>
            ) : (
              (dashboard?.interviews || []).map((iv) => (
                <div
                  key={iv._id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900">
                      {iv.student?.name} — {iv.roundName}
                    </p>
                    <p className="text-xs text-slate-600">
                      Role: {iv.job?.title} · Mode: {iv.mode} · Link/Venue:{' '}
                      <span className="font-mono text-blue-600">
                        {iv.meetingLinkOrLocation}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {new Date(iv.scheduledAt).toLocaleString()} · {iv.durationMinutes} mins
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-slate-800">
                      {iv.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: COMPANY PROFILE */}
      {activeTab === 'company' && (
        <form
          onSubmit={handleSaveCompany}
          className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h1 className="text-xl font-bold text-slate-900">
              Company &amp; Recruiter Profile Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Displayed to eligible B.Tech candidates across all campus job drives
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Official Website
              </label>
              <input
                type="text"
                value={companyForm.website}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, website: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Industry Sector
              </label>
              <input
                type="text"
                required
                value={companyForm.industry}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, industry: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Headquarters / Hiring Location
              </label>
              <input
                type="text"
                required
                value={companyForm.location}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, location: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Recruiter Designation
              </label>
              <input
                type="text"
                required
                value={companyForm.designation}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, designation: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Placement Tier Classification
              </label>
              <select
                value={companyForm.tier}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, tier: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="TIER_1_DREAM">TIER_1_DREAM (Super Dream / High CTC)</option>
                <option value="TIER_2_CORE">TIER_2_CORE (Core Engineering)</option>
                <option value="MASS_RECRUITER">MASS_RECRUITER</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Company Engineering Overview
            </label>
            <textarea
              rows={3}
              required
              value={companyForm.description}
              onChange={(e) =>
                setCompanyForm({ ...companyForm, description: e.target.value })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingCompany}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {savingCompany ? 'Saving...' : 'Save Company Profile'}
            </button>
          </div>
        </form>
      )}

      {/* MODAL 1: CREATE / EDIT JOB OPENING & ELIGIBILITY CRITERIA */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editingJobId
                  ? 'Update Job Opening & Eligibility Rules'
                  : 'Create New Campus Job Opening'}
              </h2>
              <button
                onClick={() => setShowJobModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveJob}
              className="max-h-[80vh] overflow-y-auto p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="e.g. Software Development Engineer - I"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    CTC Package (LPA)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={jobForm.packageLPA}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, packageLPA: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Location
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, location: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Type
                  </label>
                  <select
                    value={jobForm.jobType}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, jobType: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="FULL_TIME">FULL_TIME</option>
                    <option value="PPO">PPO (Internship + Full-Time)</option>
                    <option value="INTERNSHIP">INTERNSHIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={jobForm.deadline}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, deadline: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role Responsibilities &amp; Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={jobForm.description}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {/* Automated Eligibility Engine Configuration */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-slate-900">
                  Automated Eligibility Engine Criteria (Enforced on Backend)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Minimum CGPA
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      value={jobForm.minCgpa}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, minCgpa: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Active Backlogs
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      required
                      value={jobForm.maxBacklogs}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, maxBacklogs: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      required
                      value={jobForm.graduationYear}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, graduationYear: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Allowed Engineering Branches
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_BRANCHES.map((b) => {
                      const active = jobForm.allowedBranches.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBranchInForm(b)}
                          className={`px-3 py-1 rounded-md text-xs font-mono font-semibold border transition-colors ${
                            active
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Required Technical Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={jobForm.requiredSkillsText}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, requiredSkillsText: e.target.value })
                    }
                    placeholder="JavaScript, React, Node.js"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {savingJob ? 'Publishing...' : editingJobId ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE INTERVIEW */}
      {interviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Schedule Candidate Interview (POST /api/interviews)
                </h2>
                <p className="text-xs text-slate-500">
                  Candidate: {interviewModalApp.student?.name} · Role:{' '}
                  {interviewModalApp.job?.title}
                </p>
              </div>
              <button
                onClick={() => setInterviewModalApp(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterviewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Interview Round Title
                </label>
                <input
                  type="text"
                  required
                  value={interviewForm.roundName}
                  onChange={(e) =>
                    setInterviewForm({ ...interviewForm, roundName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Round Type
                  </label>
                  <select
                    value={interviewForm.roundType}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, roundType: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="SYSTEM_DESIGN">SYSTEM_DESIGN</option>
                    <option value="MANAGERIAL">MANAGERIAL</option>
                    <option value="HR">HR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Interview Mode
                  </label>
                  <select
                    value={interviewForm.mode}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, mode: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="ONLINE">ONLINE (Video Call)</option>
                    <option value="IN_PERSON">IN_PERSON (Campus Panel)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={interviewForm.scheduledAt}
                    onChange={(e) =>
                      setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    value={interviewForm.durationMinutes}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        durationMinutes: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Meeting URL or Campus Room Venue
                </label>
                <input
                  type="text"
                  required
                  value={interviewForm.meetingLinkOrLocation}
                  onChange={(e) =>
                    setInterviewForm({
                      ...interviewForm,
                      meetingLinkOrLocation: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInterviewModalApp(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingInterview}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {schedulingInterview ? 'Scheduling...' : 'Confirm & Notify Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANDIDATE PROFILE & RESUME INSPECTOR */}
      {inspectCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Candidate Dossier: {inspectCandidate.student?.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectCandidate.studentProfile?.rollNumber} ·{' '}
                  {inspectCandidate.studentProfile?.branch} · CGPA:{' '}
                  {inspectCandidate.studentProfile?.cgpa}
                </p>
              </div>
              <button
                onClick={() => setInspectCandidate(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div>
                  <span className="text-slate-500">Email:</span>
                  <p className="font-mono font-semibold text-slate-900">
                    {inspectCandidate.student?.email}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Resume File:</span>
                  <p className="font-mono font-semibold text-blue-600 truncate">
                    {inspectCandidate.studentProfile?.resumeName ||
                      inspectCandidate.resumeSnapshotUrl ||
                      'Attached PDF'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Verified Technical Skills</h3>
                <p className="text-slate-700 font-mono">
                  {(inspectCandidate.studentProfile?.skills || []).join(' · ')}
                </p>
              </div>

              {(inspectCandidate.studentProfile?.projects || []).length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Engineering Projects</h3>
                  {inspectCandidate.studentProfile.projects.map((p, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-semibold text-slate-900">{p.title}</p>
                      <p className="text-slate-600 mt-0.5">{p.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {inspectCandidate.coverNote && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Candidate Cover Note</h3>
                  <p className="text-slate-600 rounded-lg border border-slate-200 p-3 bg-slate-50">
                    {inspectCandidate.coverNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
