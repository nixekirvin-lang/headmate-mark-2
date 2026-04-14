import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Logo from './Logo';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'register' | 'reset-password';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [systemName, setSystemName] = useState('');
  const [isSinglet, setIsSinglet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSystemName('');
    setIsSinglet(false);
    setError(null);
    setSuccessMessage(null);
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          username: user.uid.slice(0, 8),
          displayName: systemName || (isSinglet ? 'Unnamed User' : 'Unnamed System'),
          systemName: systemName || (isSinglet ? 'Unnamed User' : 'Unnamed System'),
          isSinglet,
          themeConfig: {
            background: '#f5f5f5',
            accent: '#a855f7',
            text: '#1a1a1a',
            isDark: false,
            highContrast: false,
            fontSize: 'medium',
            dyslexiaFont: false,
            useAlterTheme: !isSinglet,
          },
          isPrivate: true,
          followingIds: [],
          followerIds: [],
          friendIds: [],
          createdAt: new Date().toISOString(),
        });
      } else if (mode === 'reset-password') {
        // Password reset is now handled via email to support
        setMode('login');
        setSuccessMessage('Please email headm8support@gmail.com with your username and display name from the email address you used to create your account.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 50%, #e879f9 100%)' }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        {/* Logo and Subtitle */}
        <div className="mb-8 text-center flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <div className="text-9xl">☁️</div>
          </motion.div>
          <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tight mb-2">
            HeadM8
          </h1>
          <p className="text-white/90 font-medium text-sm drop-shadow-md italic">
            courtesy of Team HeadM8 and The Quiet Room
          </p>
        </div>

        <div className="bg-[var(--bg-surface)]/90 backdrop-blur-xl rounded-[2.5rem] p-8 w-full shadow-2xl border border-white/20 dark:border-zinc-800/50">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Create System'}
              {mode === 'reset-password' && 'Reset Password'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {mode === 'login' && 'Sign in to manage your system.'}
              {mode === 'register' && 'Start your journey with HeadM8.'}
              {mode === 'reset-password' && 'Need help accessing your account?'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl text-sm flex items-start gap-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)]/50 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            )}

            {mode === 'reset-password' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  To reset your password, please email <strong>headm8support@gmail.com</strong> with the following information:
                </p>
                <ul className="text-sm text-[var(--text-secondary)] space-y-2 pl-4">
                  <li>• Your username</li>
                  <li>• Your display name</li>
                  <li>• The email address you used to create your account</li>
                </ul>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Our team will help you regain access to your account.
                </p>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-4">
                <div className="flex p-1 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--bg-panel)]">
                  <button
                    type="button"
                    onClick={() => setIsSinglet(false)}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      !isSinglet ? "bg-[var(--accent-main)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Plural System
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSinglet(true)}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                      isSinglet ? "bg-[var(--accent-main)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    Singlet
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">
                    {isSinglet ? 'Display Name' : 'System Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                      type="text"
                      required
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)]/50 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none transition-all"
                      placeholder={isSinglet ? "e.g. Alex" : "e.g. The Nebula System"}
                    />
                  </div>
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)]/50 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[var(--bg-panel)] bg-[var(--bg-main)]/50 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-main)] outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode('reset-password'); setError(null); }}
                  className="text-xs font-bold text-[var(--accent-main)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--accent-main)] text-white rounded-2xl font-bold text-lg hover:bg-[var(--accent-hover)] transition-all shadow-xl shadow-[var(--accent-glow)] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'reset-password' && 'Back to Login'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--bg-panel)] text-center">
            {mode === 'login' ? (
              <p className="text-sm text-[var(--text-muted)]">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); setError(null); }}
                  className="font-bold text-[var(--accent-main)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Register
                </button>
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-bold text-[var(--accent-main)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
