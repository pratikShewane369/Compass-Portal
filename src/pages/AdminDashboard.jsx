import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  BarChart3,
  Search,
  RefreshCw,
} from 'lucide-react';
import WorkspaceLayout from '../components/WorkspaceLayout.jsx';
import { adminService, applicationService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminDashboard() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [studentFilters, setStudentFilters] = useState({
    branch: 'ALL',
    placementStatus: 'ALL',
    search: '',
  });

  const loadAdminDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getDashboard();
      setDashboard(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load admin analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await adminService.getStudents(studentFilters);
      setStudents(res.data.data || []);
    } catch {
      // Ignore
    }
  }, [studentFilters]);

  const loadRecruiters = useCallback(async () => {
    try {
      const res = await adminService.getRecruiters();
      setRecruiters(res.data.data || []);
    } catch {
      // Ignore
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const res = await adminService.getApplications();
      setApplications(res.data.data || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadAdminDashboard();
  }, [loadAdminDashboard]);

  useEffect(() => {
    if (activeTab === 'students') loadStudents();
    if (activeTab === 'recruiters') loadRecruiters();
    if (activeTab === 'applications') loadApplications();
  }, [activeTab, loadStudents, loadRecruiters, loadApplications]);

  const handleToggleUserActive = async (userId, currentActive) => {
    try {
      await adminService.updateUserStatus(userId, { isActive: !currentActive });
      showToast(`User account ${!currentActive ? 'enabled' : 'disabled'}`, 'info');
      if (activeTab === 'students') await loadStudents();
      if (activeTab === 'recruiters') await loadRecruiters();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update user status', 'error');
    }
  };

  const handleOverrideApplicationStatus = async (appId, status) => {
    try {
      await applicationService.updateStatus(appId, {
        status,
        remarks: `Status updated by Training & Placement Officer`,
      });
      showToast(`Application updated to ${status}`, 'success');
      await loadApplications();
      await loadAdminDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const overview = dashboard?.overview || {};
  const branchWiseStats = dashboard?.branchWiseStats || [];
  const companyWiseStats = dashboard?.companyWiseStats || [];
  const statusDistribution = dashboard?.statusDistribution || [];

  const navigationItems = [
    { id: 'overview', label: 'Analytics Dashboard', icon: LayoutDashboard },
    {
      id: 'students',
      label: 'Students Directory',
      icon: Users,
      count: overview.totalStudents,
    },
    {
      id: 'recruiters',
      label: 'Companies & Recruiters',
      icon: Building2,
      count: overview.totalCompanies,
    },
    {
      id: 'applications',
      label: 'Master Applications',
      icon: FileText,
      count: overview.totalApplications,
    },
    { id: 'reports', label: 'Branch & CTC Reports', icon: BarChart3 },
  ];

  return (
    <WorkspaceLayout
      roleTitle="Training & Placement Officer (Admin)"
      navigationItems={navigationItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSeedReset={loadAdminDashboard}
    >
      {/* TAB 1: EXECUTIVE PLACEMENT ANALYTICS & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                University Training &amp; Placement Cell — Analytics Command Center
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Real-time campus hiring telemetry, branch-wise placement ratios, and CTC package
                metrics (Batch 2027)
              </p>
            </div>
            <button
              onClick={loadAdminDashboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors self-start"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Analytics
            </button>
          </div>

          {/* 8 Executive KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            {[
              { label: 'Registered Students', value: overview.totalStudents ?? 0 },
              { label: 'Placed Students', value: overview.totalPlacedStudents ?? 0 },
              {
                label: 'Placement Rate',
                value: `${overview.placementPercentage ?? 0}%`,
              },
              {
                label: 'Avg Package',
                value: `${overview.averagePackageLPA ?? 0} LPA`,
              },
              {
                label: 'Highest Package',
                value: `${overview.highestPackageLPA ?? 0} LPA`,
              },
              { label: 'Partner Companies', value: overview.totalCompanies ?? 0 },
              { label: 'Active Job Drives', value: overview.totalJobs ?? 0 },
              { label: 'Applications', value: overview.totalApplications ?? 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between"
              >
                <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
                <p className="mt-2 text-xl font-bold text-slate-900 font-mono tabular-nums">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Recharts Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: Branch-Wise Placement Statistics */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Branch-Wise Placement Statistics (Registered vs Placed)
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time breakdown across engineering departments
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchWiseStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="totalStudents"
                      name="Registered Students"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="placedStudents"
                      name="Placed Students"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Application Stage Funnel */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Campus Application Stage Distribution
                </h2>
                <p className="text-xs text-slate-500">
                  Pipeline progression across all active job drives
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="status"
                      type="category"
                      width={135}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Applications"
                      fill="#0f172a"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Company-Wise Hiring Statistics Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Company-Wise Hiring &amp; CTC Statistics
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Industry &amp; Tier</th>
                    <th className="py-3 px-4 text-right">Jobs Posted</th>
                    <th className="py-3 px-4 text-right">Applications</th>
                    <th className="py-3 px-4 text-right">Shortlisted</th>
                    <th className="py-3 px-4 text-right">Students Hired</th>
                    <th className="py-3 px-4 text-right">Top CTC (LPA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {companyWiseStats.map((comp) => (
                    <tr key={comp._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {comp.companyName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {comp.industry} · <span className="font-mono">{comp.tier}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {comp.jobsCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {comp.totalApplications}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {comp.shortlistedCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        {comp.hiredCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {comp.maxPackageLPA} LPA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS DIRECTORY & ACCESS CONTROL */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Registered B.Tech Students Directory
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Monitor student academic profiles, placement status, and account access
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={studentFilters.search}
                onChange={(e) =>
                  setStudentFilters({ ...studentFilters, search: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-sm"
              />
            </div>

            <select
              value={studentFilters.branch}
              onChange={(e) =>
                setStudentFilters({ ...studentFilters, branch: e.target.value })
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
              value={studentFilters.placementStatus}
              onChange={(e) =>
                setStudentFilters({
                  ...studentFilters,
                  placementStatus: e.target.value,
                })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white"
            >
              <option value="ALL">All Placement Statuses</option>
              <option value="PLACED">PLACED</option>
              <option value="UNPLACED">UNPLACED</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll No &amp; Branch</th>
                    <th className="py-3 px-4 text-right">CGPA</th>
                    <th className="py-3 px-4 text-right">Backlogs</th>
                    <th className="py-3 px-4">Placement Status</th>
                    <th className="py-3 px-4">Account State</th>
                    <th className="py-3 px-4 text-right">Admin Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.map((stu) => (
                    <tr key={stu._id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{stu.user?.name}</p>
                        <p className="text-slate-500 font-mono">{stu.user?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {stu.rollNumber} · {stu.branch} ({stu.graduationYear})
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {Number(stu.cgpa || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        {stu.activeBacklogs}
                      </td>
                      <td className="py-3.5 px-4">
                        {stu.placementStatus === 'PLACED' ? (
                          <span className="font-semibold text-emerald-700">
                            PLACED @ {stu.placedCompany?.name} ({stu.placedPackageLPA} LPA)
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">UNPLACED</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {stu.user?.isActive ? (
                          <span className="text-emerald-700 font-semibold">ACTIVE</span>
                        ) : (
                          <span className="text-red-600 font-semibold">DISABLED</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() =>
                            handleToggleUserActive(stu.user?._id, stu.user?.isActive)
                          }
                          className="rounded border border-slate-200 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {stu.user?.isActive ? 'Disable Account' : 'Enable Account'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECRUITERS & COMPANIES */}
      {activeTab === 'recruiters' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Recruiter Accounts &amp; Partner Companies
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Approve corporate recruiters and monitor company onboarding
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Recruiter</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Location &amp; Tier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recruiters.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{rec.user?.name}</p>
                        <p className="text-slate-500 font-mono">{rec.user?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {rec.company?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{rec.designation}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rec.company?.location} ·{' '}
                        <span className="font-mono">{rec.company?.tier}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {rec.user?.isActive ? (
                          <span className="text-emerald-700 font-semibold">
                            VERIFIED &amp; ACTIVE
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold">DISABLED</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() =>
                            handleToggleUserActive(rec.user?._id, rec.user?.isActive)
                          }
                          className="rounded border border-slate-200 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {rec.user?.isActive ? 'Disable Recruiter' : 'Enable Recruiter'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER CAMPUS APPLICATIONS LEDGER */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Master Campus Applications Ledger
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Full visibility and administrative control over all candidate applications
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Company &amp; Role</th>
                    <th className="py-3 px-4 text-right">Package</th>
                    <th className="py-3 px-4">Current Status</th>
                    <th className="py-3 px-4 text-right">TPO Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{app.student?.name}</p>
                        <p className="text-slate-500 font-mono">
                          {app.studentProfile?.rollNumber} · {app.studentProfile?.branch} ·{' '}
                          {app.studentProfile?.cgpa} CGPA
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{app.job?.title}</p>
                        <p className="text-slate-500">{app.job?.company?.name}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {app.job?.packageLPA} LPA
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                        {app.status}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleOverrideApplicationStatus(app._id, e.target.value)
                          }
                          className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono"
                        >
                          {[
                            'APPLIED',
                            'SHORTLISTED',
                            'INTERVIEW_SCHEDULED',
                            'SELECTED',
                            'REJECTED',
                          ].map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BRANCH-WISE DETAILED ANALYTICS TABLE */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Branch-Wise Placement &amp; Academic Performance Report
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Departmental placement ratios and selected candidate roster
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Department / Branch</th>
                  <th className="py-3 px-4 text-right">Registered Students</th>
                  <th className="py-3 px-4 text-right">Placed Students</th>
                  <th className="py-3 px-4 text-right">Unplaced Students</th>
                  <th className="py-3 px-4 text-right">Average CGPA</th>
                  <th className="py-3 px-4 text-right">Placement Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {branchWiseStats.map((b) => (
                  <tr key={b.branch} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{b.branch}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {b.totalStudents}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {b.placedStudents}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {b.unplacedStudents}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      {b.avgCgpa}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 tabular-nums">
                      {b.placementRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
