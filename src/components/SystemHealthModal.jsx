import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Database, Server, ShieldCheck, Layers } from 'lucide-react';
import { systemService } from '../services/api.js';

export default function SystemHealthModal({ isOpen, onClose, onDataReset }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await systemService.getHealth();
      setHealth(res.data);
    } catch (err) {
      setHealth({
        success: false,
        status: 'ERROR',
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResetSeed = async () => {
    setResetting(true);
    try {
      await systemService.resetSeedData();
      await fetchHealth();
      if (onDataReset) onDataReset();
    } finally {
      setResetting(false);
    }
  };

  const collections = health?.database?.collections || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              System Architecture & Health Check (GET /api/health)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live MERN backend diagnostics, Mongoose collection counts, and Redis cache state
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Probe
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6 space-y-6">
          {/* Status Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Express REST API</span>
                <Server className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-lg font-semibold text-emerald-700 font-mono tabular-nums">
                {health?.status === 'OK' ? '200 OK · ONLINE' : 'CHECKING...'}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">MongoDB + Mongoose</span>
                <Database className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                {health?.database?.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </p>
              <p className="mt-1 text-xs text-slate-500 truncate">
                DB: {health?.database?.databaseName || 'campushire_db'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Redis Cache Layer</span>
                <Layers className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900 font-mono tabular-nums">
                Hits: {health?.cache?.hits ?? 0} · Keys: {health?.cache?.keysCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mode: {health?.cache?.mode || 'FAIL_OPEN_MEMORY_TTL'}
              </p>
            </div>
          </div>

          {/* Mongoose Collection Document Counts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Mongoose ODM Models & Active Document Counts
              </h3>
              <button
                onClick={handleResetSeed}
                disabled={resetting}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                {resetting ? 'Re-Seeding Database...' : 'Reset Demo Seed Data'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                'User',
                'StudentProfile',
                'RecruiterProfile',
                'Company',
                'Job',
                'Application',
                'Interview',
                'Notification',
              ].map((modelName) => (
                <div
                  key={modelName}
                  className="rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-slate-700">{modelName}</span>
                  <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                    {collections[modelName] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw JSON Response from GET /api/health */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Live JSON Payload from GET /api/health
              </h3>
            </div>
            <pre className="rounded-lg border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100 font-mono overflow-x-auto leading-relaxed">
              {JSON.stringify(health, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
