import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function RoleBasedRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900">
            Initializing CampusHire Session...
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Verifying JWT &amp; RBAC Role Permissions
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (user.role === 'RECRUITER') {
    return <RecruiterDashboard />;
  }

  return <StudentDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <RoleBasedRouter />
    </AuthProvider>
  );
}
