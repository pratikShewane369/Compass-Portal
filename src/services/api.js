import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campushire_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized API Service Modules
export const systemService = {
  getHealth: () => api.get('/health'),
  resetSeedData: () => api.post('/seed'),
};

export const authService = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const studentService = {
  getDashboard: () => api.get('/students/dashboard'),
  getProfile: () => api.get('/students/profile'),
  updateProfile: (payload) => api.put('/students/profile', payload),
  uploadResumeFile: (formData) =>
    api.post('/students/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadResumeMeta: (payload) => api.post('/students/resume', payload),
};

export const jobService = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJobById: (id) => api.get(`/jobs/${id}`),
  createJob: (payload) => api.post('/jobs', payload),
  updateJob: (id, payload) => api.put(`/jobs/${id}`, payload),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
};

export const applicationService = {
  apply: (payload) => api.post('/applications', payload),
  getMyApplications: (params) => api.get('/applications/my', { params }),
  getById: (id) => api.get(`/applications/${id}`),
  updateStatus: (id, payload) => api.patch(`/applications/${id}/status`, payload),
};

export const recruiterService = {
  getDashboard: () => api.get('/recruiters/dashboard'),
  updateCompany: (payload) => api.put('/recruiters/company', payload),
  getJobs: () => api.get('/recruiters/jobs'),
  getJobApplicants: (jobId, params) =>
    api.get(`/recruiters/jobs/${jobId}/applicants`, { params }),
};

export const interviewService = {
  getInterviews: () => api.get('/interviews'),
  scheduleInterview: (payload) => api.post('/interviews', payload),
  updateInterview: (id, payload) => api.put(`/interviews/${id}`, payload),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: () => api.get('/admin/analytics'),
  getStudents: (params) => api.get('/admin/students', { params }),
  getRecruiters: () => api.get('/admin/recruiters'),
  getCompanies: () => api.get('/admin/companies'),
  getApplications: () => api.get('/admin/applications'),
  updateUserStatus: (userId, payload) =>
    api.patch(`/admin/users/${userId}/status`, payload),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export default api;
