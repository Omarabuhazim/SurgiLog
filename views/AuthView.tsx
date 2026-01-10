
import React, { useState } from 'react';
import { CloudService } from '../services/cloudService';
import { auth } from '../services/firebase';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { SPECIALTIES } from '../constants';

interface AuthViewProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialMode?: 'signin' | 'signup';
  defaultName?: string;
}

type AuthMode = 'signin' | 'signup' | 'reset';

const AuthView = ({ onSuccess, onCancel, initialMode = 'signin', defaultName }: AuthViewProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Handle Persistence
      if (mode === 'signin' || mode === 'signup') {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      }

      if (mode === 'signup') {
        if (!name.trim()) {
           throw new Error("Please enter your full name.");
        }
        await CloudService.signUpWithEmail(email, password, name, specialty);
        onSuccess();
      } else if (mode === 'signin') {
        await CloudService.signInWithEmail(email, password);
        onSuccess();
      } else if (mode === 'reset') {
        await CloudService.resetPassword(email);
        setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domain (${domain}) is not authorized. Please check Firebase Console settings.`);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || 'Authentication failed');
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await CloudService.signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domain (${domain}) is not authorized.`);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white dark:bg-slate-950 flex flex-col p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="max-w-md mx-auto w-full pt-8 pb-12">
        <button onClick={onCancel} className="mb-6 p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/20">
            {mode === 'reset' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M12 15v2"/></svg>
            ) : mode === 'signup' ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 7v5l3 3"/></svg>
            )}
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {mode === 'reset' ? 'Enter email to receive recovery link' : mode === 'signup' ? 'Join SurgiLog to manage your cases' : 'Securely access your surgical data'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-[18px] border border-red-100 dark:border-red-900/50 shadow-sm break-words animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-[18px] border border-green-100 dark:border-green-900/50 shadow-sm animate-in slide-in-from-top-2">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* New User Fields */}
          {mode === 'signup' && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
              <div>
                <label className="sr-only">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                  placeholder="Full Name (e.g. Dr. Smith)"
                />
              </div>
              <div className="relative">
                 <select 
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                 >
                   {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
              </div>
            </div>
          )}

          <div>
            <label className="sr-only">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
              placeholder="Email Address"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <label className="sr-only">Password</label>
              <input 
                type={showPassword ? "text" : "password"}
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[14px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                placeholder="Password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          )}

          {mode !== 'reset' && (
             <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Remember me</span>
                </label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => setMode('reset')} className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Forgot Password?
                  </button>
                )}
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-slate-900 dark:bg-blue-600 text-white rounded-[14px] font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {mode === 'signin' ? 'SIGN IN' : mode === 'signup' ? 'COMPLETE ACCOUNT' : 'SEND RESET LINK'}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-950 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Or continue with</span></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white rounded-[14px] font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
          </>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {mode === 'signin' ? "Don't have an account? " : mode === 'signup' ? "Already have an account? " : "Remembered your password? "}
            <button 
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {mode === 'signin' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
