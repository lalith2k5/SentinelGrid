import React, { useState, useEffect } from 'react';
import { Shield, Lock, Mail, User as UserIcon, Award, Building, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/index.ts';

export const AuthPage: React.FC = () => {
  const { login, register, error, clearError } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regStatus, setRegStatus] = useState<{ userCount: number; hasAdmin: boolean; nextRoleAssigned: string } | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const checkRegStatus = async () => {
    try {
      const res = await fetch('/api/auth/registration-status');
      if (res.ok) {
        const data = await res.json();
        setRegStatus(data);
      }
    } catch (e) {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    checkRegStatus();
  }, [isRegisterMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setLocalError('Full name is required');
          setIsSubmitting(false);
          return;
        }
        await register({
          email: email.trim(),
          password,
          name: name.trim(),
          badgeNumber: badgeNumber.trim(),
          department: department.trim()
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string, demoName: string) => {
    setIsRegisterMode(true);
    setEmail(demoEmail);
    setPassword('EmergencyPass2026!');
    setName(demoName);
    setBadgeNumber('SG-001');
    setDepartment('Emergency Operations Center');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-emerald-950/80 border border-emerald-700/70 text-emerald-400 mb-4 shadow-lg">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-wider font-mono uppercase text-slate-100">
          SentinelGrid
        </h1>
        <p className="mt-1.5 text-xs text-slate-400 font-mono tracking-wide">
          OFFLINE-FIRST EMERGENCY COORDINATION PLATFORM
        </p>
        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Phase 1 — Core Foundation</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 rounded-lg shadow-xl">
          {/* Mode Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-colors cursor-pointer ${
                !isRegisterMode
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-colors cursor-pointer ${
                isRegisterMode
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Operator
            </button>
          </div>

          {(error || localError) && (
            <div className="mb-4 p-3 rounded bg-red-950/80 border border-red-800 text-xs text-red-300">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Elena Ramos"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Assigned Role
                  </label>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-start gap-2.5">
                    {regStatus && !regStatus.hasAdmin ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-semibold text-purple-300 font-mono">ADMIN (Incident Commander)</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Initial bootstrap: First registered user is automatically provisioned with root Administrator privileges.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-semibold text-emerald-400 font-mono">OPERATOR (Standard Access)</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Standard field operator. Role elevations (Dispatcher, Responder, Admin) are managed in Settings by an Administrator.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="operator@sentinelgrid.local"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  minLength={8}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              {isRegisterMode && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Stored securely using Node.js scrypt with unique cryptographic salt.
                </p>
              )}
            </div>

            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Badge / Callsign
                  </label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={e => setBadgeNumber(e.target.value)}
                    placeholder="SG-842"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="Search & Rescue"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded border border-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Create Secure Account' : 'Authenticate Operator'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick preset for easy first-time test */}
          {!isRegisterMode && (
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="text-[11px] font-mono uppercase text-slate-400 mb-2.5 text-center">
                Quick Test Account Prefill
              </div>
              <p className="text-[11px] text-slate-500 mb-3 text-center">
                Need to create or sign into an initial account? Click below to prefill:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoFill('commander@sentinelgrid.local', 'Incident Commander')
                  }
                  className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 rounded text-[11px] text-slate-300 text-left font-mono cursor-pointer"
                >
                  <div className="font-semibold text-purple-300">Commander Account</div>
                  <div className="text-[10px] text-slate-400">commander@sentinelgrid.local</div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickDemoFill('operator@sentinelgrid.local', 'Field Operator')
                  }
                  className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 rounded text-[11px] text-slate-300 text-left font-mono cursor-pointer"
                >
                  <div className="font-semibold text-emerald-300">Operator Account</div>
                  <div className="text-[10px] text-slate-400">operator@sentinelgrid.local</div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 font-mono">
          <span>Zero cloud connection required. Stores credentials locally on this machine.</span>
        </div>
      </div>
    </div>
  );
};
