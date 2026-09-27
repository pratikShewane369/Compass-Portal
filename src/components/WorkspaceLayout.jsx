import React, { useState } from 'react';
import {
  Bell,
  LogOut,
  CheckCheck,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import SystemHealthModal from './SystemHealthModal.jsx';

export default function WorkspaceLayout({
  roleTitle,
  navigationItems,
  activeTab,
  onSelectTab,
  primaryAction,
  children,
  onSeedReset,
}) {
  const {
    user,
    logout,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
    toast,
    setToast,
  } = useAuth();

  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 Brand | Zone 2 Nav Links | Zone 3 Actions */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
        {/* Zone 1: Brand Title (single text element wordmark) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              if (navigationItems[0]) onSelectTab(navigationItems[0].id);
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            CampusHire
          </a>
        </div>

        {/* Zone 2: 4-5 Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navigationItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
                activeTab === item.id
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHealthModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            API Health
          </button>

          <button
            onClick={() => setShowNotifDrawer(!showNotifDrawer)}
            className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white font-mono tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace Container: Sidebar + Content Viewport */}
      <div className="flex flex-1">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-5">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-400">Workspace Role</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{roleTitle}</p>
              <p className="mt-0.5 text-xs text-slate-500 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate font-mono">{user?.email}</p>
            </div>

            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2">
            {primaryAction && <div className="pb-2">{primaryAction}</div>}
            <button
              onClick={() => setShowHealthModal(true)}
              className="w-full flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span>MERN System Status</span>
              <span className="text-emerald-600 font-mono">200 OK</span>
            </button>
          </div>
        </aside>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 w-64 bg-white p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{roleTitle}</p>
                </div>
                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                          activeTab === item.id
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {children}
        </main>
      </div>

      {/* In-App Notifications Slide-Over Drawer */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <div className="w-full max-w-md bg-white h-full shadow-xl border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500">
                  Real-time application, shortlisting & interview alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-medium text-slate-700">No notifications yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Alerts appear here when you apply to jobs, get shortlisted, or receive interview invites.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => {
                      if (!n.isRead) markNotificationRead(n._id);
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      {!n.isRead && (
                        <span className="text-[11px] font-medium text-blue-600 shrink-0">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="mt-2 text-[11px] text-slate-400 font-mono tabular-nums">
                      {n.type} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg">
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <SystemHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        onDataReset={onSeedReset}
      />
    </div>
  );
}
