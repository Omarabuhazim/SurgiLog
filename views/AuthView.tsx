
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
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Immediate domain detection during render
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const getFriendlyErrorMessage = (code: string, originalMessage: string) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return "Incorrect email or password. Please check your credentials.";
      case 'auth/email-already-in-use':
        return "This email is already in use. Please Sign In instead.";
      case 'auth/weak-password':
        return "Password is too weak. Please use at least 6 characters.";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/network-request-failed':
        return "Network error. Please check your internet connection.";
      case 'auth/too-many-requests':
        return "Access temporarily blocked due to many failed attempts. Please try again later.";
      case 'auth/popup-closed-by-user':
        return "Sign in cancelled.";
      default:
        // Clean up raw Firebase error messages
        return originalMessage.replace('Firebase: ', '').replace('Error (auth/', '').replace(').', '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin' || mode === 'signup') {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      }

      if (mode === 'signup') {
        if (!name.trim()) throw new Error("Please enter your full name.");
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
      console.error("Auth Error Full:", err);
      const friendlyMsg = getFriendlyErrorMessage(err.code, err.message || 'Authentication failed');
      setError({ code: err.code, message: friendlyMsg });
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (provider === 'google') await CloudService.signInWithGoogle();
      else await CloudService.signInWithApple();
      onSuccess();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        const friendlyMsg = getFriendlyErrorMessage(err.code, err.message || `${provider} authentication failed`);
        setError({ code: err.code, message: friendlyMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="max-w-md mx-auto w-full pt-8 pb-12">
        <button onClick={onCancel} className="mb-6 p-3 -ml-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-lg">
            {mode === 'reset' ? 'Enter email to receive recovery link' : mode === 'signup' ? 'Join SurgiLog today' : 'Access your logbook'}
          </p>
        </div>

        {error && (
          <div className="mb-8 animate-in slide-in-from-top-2">
            <div className="p-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-[24px] border border-red-100 dark:border-red-900/50 shadow-sm break-words">
              {error.code === 'auth/unauthorized-domain' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <span className="text-2xl">🛑</span>
                    <p className="text-sm font-black uppercase">Authentication Blocked</p>
                  </div>
                  
                  <p className="font-medium opacity-90 text-xs leading-relaxed">
                    Firebase blocked this domain. You must add it to Authorized Domains in the Firebase Console.
                  </p>

                  <div className="bg-white/80 dark:bg-black/40 p-4 rounded-2xl border border-red-200 dark:border-red-800/50">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 block">
                        Domain to Whitelist:
                    </label>
                    <div className="flex items-center gap-2">
                       <input 
                         readOnly
                         value={currentHostname || "unknown-host"}
                         className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-blue-600 dark:text-blue-400 font-bold select-all focus:ring-2 focus:ring-blue-500 outline-none"
                         onClick={(e) => e.currentTarget.select()}
                       />
                       <button 
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(currentHostname);
                           alert(`Copied: ${currentHostname}\n\n1. Go to Firebase Console\n2. Authentication > Settings > Authorized Domains\n3. Paste this domain.`);
                         }}
                         className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 font-bold text-xs uppercase tracking-wider shrink-0"
                       >
                         Copy
                       </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="leading-relaxed">{error.message}</p>
              )}
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-bold rounded-[24px] border border-green-100 dark:border-green-900/50 shadow-sm animate-in slide-in-from-top-2">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
              <div>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-16 px-6 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                  placeholder="Full Name"
                />
              </div>
              <div className="relative">
                 <select 
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full h-16 px-6 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                 >
                   {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
              </div>
            </div>
          )}

          <div>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-16 px-6 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
              placeholder="Email Address"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-16 pl-6 pr-20 bg-slate-100 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                placeholder="Password"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          )}

          <div className="pt-4">
            <button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 bg-blue-600 text-white rounded-full font-black text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
                {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
                )}
            </button>
          </div>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-950 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Or continue with</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleSocialSignIn('google')} className="h-16 bg-slate-50 dark:bg-slate-900 border-none text-slate-700 dark:text-white rounded-2xl font-bold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3">
                 <span className="text-xl">G</span> Google
              </button>
              <button onClick={() => handleSocialSignIn('apple')} className="h-16 bg-black text-white dark:bg-white dark:text-black border-none rounded-2xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3">
                 <span className="text-xl"></span> Apple
              </button>
            </div>
          </>
        )}

        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
           <p className="text-center text-sm font-semibold text-slate-500 hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
             {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
           </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
