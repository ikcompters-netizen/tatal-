import React, { useState } from 'react';
import { X, Lock, Mail, User, Flame, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import {
  firebaseGoogleLogin,
  firebaseRegister,
  firebaseResetPassword,
  firebaseSignIn,
  getFirebaseAuthInstance,
} from '../lib/firebase';
import { api } from '../lib/api';
import type { AuthUser, ContactSettings } from '../types';

interface AuthDrawerProps {
  open: boolean;
  onClose: () => void;
  user: AuthUser | null;
  contact: ContactSettings;
  firebaseConnected: boolean;
  onLoginSuccess: (user: AuthUser) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({
  open,
  onClose,
  user,
  contact,
  firebaseConnected,
  onLoginSuccess,
  onLogout,
  onOpenAdmin,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!open) return null;

  const finishAuth = async (emailAddr: string, displayName: string, uid: string, provider: 'firebase' | 'local') => {
    const adminCheck = await api.checkAdmin(emailAddr).catch(() => ({ isAdmin: false, role: null }));
    onLoginSuccess({
      email: emailAddr,
      displayName: displayName || emailAddr.split('@')[0],
      uid,
      provider,
      isAdmin: adminCheck.isAdmin,
      role: adminCheck.role,
    });
    setEmail('');
    setPassword('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const fbAuth = getFirebaseAuthInstance();

      if (mode === 'reset') {
        if (fbAuth && firebaseConnected) {
          await firebaseResetPassword(email.trim());
          setInfo('Password reset link sent to your email via Firebase.');
        } else {
          setInfo('Connect your Firebase config in the Admin Panel to send live password reset emails.');
        }
        setLoading(false);
        return;
      }

      if (fbAuth && firebaseConnected) {
        if (mode === 'register') {
          const fullName = `${firstName} ${lastName}`.trim();
          const cred = await firebaseRegister(email.trim(), password, fullName);
          await api.subscribe(email.trim(), fullName, 'register').catch(() => {});
          await finishAuth(cred.user.email || email.trim(), fullName, cred.user.uid, 'firebase');
        } else {
          const cred = await firebaseSignIn(email.trim(), password);
          await finishAuth(
            cred.user.email || email.trim(),
            cred.user.displayName || '',
            cred.user.uid,
            'firebase'
          );
        }
      } else {
        // Local preview auth until user provides their Firebase credentials
        if (!email.trim().includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (mode === 'register') {
          const fullName = `${firstName} ${lastName}`.trim();
          await api.subscribe(email.trim(), fullName, 'register').catch(() => {});
          await finishAuth(email.trim().toLowerCase(), fullName, `local-${Date.now()}`, 'local');
        } else {
          await finishAuth(email.trim().toLowerCase(), '', `local-${Date.now()}`, 'local');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await firebaseGoogleLogin();
      await finishAuth(
        cred.user.email || '',
        cred.user.displayName || '',
        cred.user.uid,
        'firebase'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminPreview = async () => {
    setLoading(true);
    setError('');
    try {
      await finishAuth(contact.email, `${contact.brandName} Admin`, 'local-admin', 'local');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-md flex-col bg-[#FAF7F2] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DDD0] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">
              {contact.brandName} Account
            </p>
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#1F1815]">
              {user
                ? 'Your Profile'
                : mode === 'login'
                ? 'Welcome Back'
                : mode === 'register'
                ? 'Create Account'
                : 'Reset Password'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5C4E45] transition hover:bg-[#EFE7DA] hover:text-[#1F1815]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Firebase Status Banner */}
          <div
            className={`mb-5 flex items-start gap-3 rounded-xl border p-3.5 text-xs ${
              firebaseConnected
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                : 'border-amber-200 bg-amber-50/80 text-amber-900'
            }`}
          >
            <Flame className={`mt-0.5 h-4 w-4 shrink-0 ${firebaseConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <p className="font-semibold">
                {firebaseConnected ? 'Firebase Authentication Active' : 'Firebase Ready — Preview Sign-In Mode'}
              </p>
              <p className="mt-0.5 opacity-85">
                {firebaseConnected
                  ? 'Secured by your connected Firebase project.'
                  : 'Waiting for your Firebase config keys. You can sign in right now in preview mode or add Firebase keys inside Admin → Firebase Setup.'}
              </p>
            </div>
          </div>

          {user ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F1815] text-lg font-semibold text-[#FAF7F2]">
                    {(user.displayName || user.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#1F1815]">{user.displayName}</p>
                    <p className="truncate text-sm text-[#6B5D54]">{user.email}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3ECE1] px-3 py-1 text-xs font-medium text-[#5C4E45]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {user.provider === 'firebase' ? 'Firebase Verified' : 'Preview Session'}
                  </span>
                  {user.isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#8E4A34]/15 px-3 py-1 text-xs font-semibold text-[#8E4A34]">
                      <Sparkles className="h-3.5 w-3.5" />
                      {user.role || 'Admin'}
                    </span>
                  )}
                </div>
              </div>

              {user.isAdmin && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full rounded-full bg-[#8E4A34] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#753B28]"
                >
                  Open {contact.brandName} Admin Panel
                </button>
              )}

              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full rounded-full border border-[#1F1815] px-5 py-3 text-sm font-semibold text-[#1F1815] transition hover:bg-[#1F1815] hover:text-white"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-[#8E7F75]" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ayesha"
                          className="w-full rounded-xl border border-[#DDD3C4] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#8E4A34]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Khan"
                        className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#8E7F75]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-[#DDD3C4] bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-[#8E4A34]"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                        Password *
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset');
                            setError('');
                            setInfo('');
                          }}
                          className="text-xs font-medium text-[#8E4A34] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#8E7F75]" />
                      <input
                        type="password"
                        required={firebaseConnected}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-[#DDD3C4] bg-white py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-[#8E4A34]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#1F1815] py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#3A2E28] disabled:opacity-60"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign In'
                    : mode === 'register'
                    ? 'Create Account'
                    : 'Send Reset Link'}
                </button>
              </form>

              {firebaseConnected && mode !== 'reset' && (
                <div className="mt-4">
                  <div className="relative my-4 flex items-center">
                    <div className="flex-grow border-t border-[#E5DDD0]" />
                    <span className="mx-3 text-xs uppercase tracking-wider text-[#8E7F75]">or</span>
                    <div className="flex-grow border-t border-[#E5DDD0]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#DDD3C4] bg-white py-3 text-sm font-semibold text-[#1F1815] transition hover:bg-[#F3ECE1]"
                  >
                    Continue with Google (Firebase)
                  </button>
                </div>
              )}

              {!firebaseConnected && (
                <div className="mt-5 rounded-2xl border border-dashed border-[#CBBBA6] bg-[#F3ECE1]/60 p-4">
                  <p className="text-xs font-semibold text-[#1F1815]">Quick Owner Preview Access</p>
                  <p className="mt-1 text-xs text-[#6B5D54]">
                    Sign in immediately as <strong>{contact.email}</strong> to test the Admin Panel, Home Editor, Coupons & Firebase Setup.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickAdminPreview}
                    className="mt-3 w-full rounded-full bg-[#8E4A34] py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#753B28]"
                  >
                    Sign In as Owner ({contact.email})
                  </button>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-[#6B5D54]">
                {mode === 'login' ? (
                  <>
                    New to {contact.brandName}?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                      }}
                      className="font-semibold text-[#8E4A34] hover:underline"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                      className="font-semibold text-[#8E4A34] hover:underline"
                    >
                      Sign in here
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
