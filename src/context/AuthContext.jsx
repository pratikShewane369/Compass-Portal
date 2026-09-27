import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, notificationService } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3800 ? null : prev));
    }, 4000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res.data?.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch {
      // Ignore notification fetch error when unauthenticated
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('campushire_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      if (res.data?.success) {
        setUser(res.data.data.user);
        setProfile(res.data.data.profile);
        await fetchNotifications();
      }
    } catch {
      localStorage.removeItem('campushire_token');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    const { token, user: loggedUser } = res.data.data;
    localStorage.setItem('campushire_token', token);
    setUser(loggedUser);
    await refreshProfile();
    showToast(`Welcome back, ${loggedUser.name}`, 'success');
    return loggedUser;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    const { token, user: newUser, profile: newProfile } = res.data.data;
    localStorage.setItem('campushire_token', token);
    setUser(newUser);
    setProfile(newProfile);
    await fetchNotifications();
    showToast(`Account created for ${newUser.name}`, 'success');
    return newUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Continue client logout
    }
    localStorage.removeItem('campushire_token');
    setUser(null);
    setProfile(null);
    setNotifications([]);
    setUnreadCount(0);
    showToast('Signed out successfully', 'info');
  };

  const markNotificationRead = async (id) => {
    await notificationService.markRead(id);
    await fetchNotifications();
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    await fetchNotifications();
    showToast('All notifications marked as read', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        notifications,
        unreadCount,
        fetchNotifications,
        markNotificationRead,
        markAllRead,
        toast,
        setToast,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
