
import React, { useState, useEffect } from 'react';
import { ProcedureLog, UserSettings } from './types';
import { SPECIALTIES } from './constants';
import { CloudService } from './services/cloudService';
import { SubscriptionService } from './services/subscriptionService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Unsubscribe } from 'firebase/firestore';
import Layout from './components/Layout';

// Sub Views
import DashboardView from './views/DashboardView';
import FormView from './views/FormView';
import SettingsView from './views/SettingsView';
import ExportView from './views/ExportView';
import AuthView from './views/AuthView';
import PaywallView from './views/PaywallView';

// UI Components
import BottomNav from './components/BottomNav';
import { ToastContainer, ToastMessage, ToastType } from './components/ui/Toast';

// Helper: Compress Image
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_SIZE = 256; 
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
        else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
        canvas.width = width;
        canvas.height = height;
        if (ctx) { 
          ctx.drawImage(img, 0, 0, width, height); 
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        } 
        else { reject(new Error("Canvas context failed")); }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const App = () => {
  // Navigation State
  const [view, setView] = useState<'onboarding' | 'auth' | 'dashboard' | 'form' | 'settings' | 'export' | 'profile_setup'>('onboarding');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Data State
  const [logs, setLogs] = useState<ProcedureLog[]>([]);
  const [editingLog, setEditingLog] = useState<ProcedureLog | null>(null);
  
  // App State
  const [isInitializing, setIsInitializing] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    specialty: SPECIALTIES[0],
    hapticsEnabled: true,
    soundEnabled: true,
    theme: 'system',
    logoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Surgeon',
    cloudSyncEnabled: true,
    isPro: false
  });

  // --- Theme Logic ---
  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        root.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
      } else {
        root.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
      }
    };
    applyTheme();
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // --- Toast Logic ---
  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Auth & Real-time Data Listener ---
  useEffect(() => {
    let unsubscribeLogs: Unsubscribe | null = null;
    let unsubscribeSettings: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setIsInitializing(false);
      
      if (user) {
        setCurrentUser(user);
        setIsAuthModalOpen(false);

        unsubscribeSettings = CloudService.subscribeSettings(user.uid, (data) => {
          if (data) {
            setSettings(prev => ({ ...prev, ...data }));
            if ((view === 'onboarding' || view === 'profile_setup')) {
               setView(data.name ? 'dashboard' : 'profile_setup');
            }
          } else {
            if (user.displayName) setSettings(prev => ({ ...prev, name: user.displayName! }));
            setView('profile_setup');
          }
        });

        unsubscribeLogs = CloudService.subscribeLogs(user.uid, (data) => {
          setLogs(data);
        });

      } else {
        setCurrentUser(null);
        setLogs([]);
        unsubscribeLogs?.();
        unsubscribeSettings?.();
        setView('onboarding');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeLogs?.();
      unsubscribeSettings?.();
    };
  }, []); 

  // --- Handlers ---

  const handleLogout = async () => {
    try {
      await CloudService.logout();
      addToast('info', 'Signed out successfully');
    } catch (e) {
      addToast('error', 'Logout failed');
    }
  };

  const handleSaveLog = async (logData: Omit<ProcedureLog, 'id' | 'createdAt' | 'syncStatus'>) => {
    const newLog: ProcedureLog = editingLog 
      ? { ...editingLog, ...logData, syncStatus: 'synced' }
      : {
          ...logData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
          syncStatus: 'synced'
        };

    if (!currentUser) return;
    try {
      await CloudService.saveLog(currentUser.uid, newLog);
      addToast('success', editingLog ? 'Case updated' : 'Case logged');
      setEditingLog(null);
      setView('dashboard');
    } catch (error) {
      console.error(error);
      addToast('error', 'Failed to save to cloud');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!currentUser) return;
    try {
      await CloudService.deleteLog(currentUser.uid, id);
      setEditingLog(null);
      setView('dashboard');
      addToast('info', 'Case deleted');
    } catch (error) {
      addToast('error', 'Failed to delete');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      try {
        addToast('info', 'Uploading image...');
        const compressedBase64 = await resizeImage(file);
        const newSettings = { ...settings, logoUrl: compressedBase64 };
        await CloudService.saveSettings(currentUser.uid, newSettings);
        addToast('success', 'Profile photo updated');
      } catch (err) {
        addToast('error', 'Failed to upload image.');
      }
    }
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings); 
    if (currentUser) {
       await CloudService.saveSettings(currentUser.uid, newSettings);
    }
  };

  const handleCompleteProfile = async () => {
     if (!settings.name.trim()) {
       addToast('error', 'Please enter your name');
       return;
     }
     if (currentUser) {
       await CloudService.saveSettings(currentUser.uid, { ...settings });
       setView('dashboard');
     }
  };

  const handleProPurchaseSuccess = () => {
    setShowPaywall(false);
    addToast('success', 'Welcome to Pro! You now have unlimited logs.');
    setSettings(prev => ({ ...prev, isPro: true }));
    if(currentUser) CloudService.saveSettings(currentUser.uid, { ...settings, isPro: true });
  };

  const checkEntitlement = (action: 'log' | 'export') => {
    const isPro = settings.isPro || false;
    if (action === 'log') {
       if (editingLog) return true; 
       if (SubscriptionService.canAddLog(logs.length, isPro)) return true;
       setShowPaywall(true);
       return false;
    }
    return true;
  };

  const handleNavChange = (newView: any) => {
    if (newView === 'form') {
      setEditingLog(null); // Clear editing state so form is empty
      if (checkEntitlement('log')) setView(newView);
    } else {
      setView(newView);
    }
  };
  
  const handleBackToDashboard = () => {
    setEditingLog(null);
    setView('dashboard');
  };

  // --- Views ---

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Connecting...</p>
      </div>
    );
  }

  // View: Onboarding
  if (view === 'onboarding') {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-blue-50 dark:bg-slate-900 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl mb-2">
             <span className="text-4xl">⚕️</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">SurgiLog</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Professional Surgical Logbook</p>
          </div>

          <div className="space-y-4 pt-4 w-full">
            <button 
              onClick={() => { setAuthMode('signin'); setIsAuthModalOpen(true); }}
              className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all"
            >
              LOG IN
            </button>
            <button 
              onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
              className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl font-black hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              CREATE NEW ACCOUNT
            </button>
          </div>
        </div>
        
        {isAuthModalOpen && (
          <AuthView 
            onSuccess={() => setIsAuthModalOpen(false)} 
            onCancel={() => setIsAuthModalOpen(false)} 
            initialMode={authMode}
            defaultName={settings.name} 
          />
        )}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // View: Profile Setup
  if (view === 'profile_setup') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in slide-in-from-right duration-300">
         <div className="max-w-md mx-auto w-full pt-10">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Complete Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Setup your professional identity.</p>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="flex justify-center mb-4">
                 <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                      <img src={settings.logoUrl} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                    <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={settings.name} 
                  onChange={e => setSettings({...settings, name: e.target.value})} 
                  placeholder="Dr. John Doe" 
                  className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none mt-1" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specialty</label>
                <div className="relative mt-1">
                   <select 
                    value={settings.specialty} 
                    onChange={e => setSettings({...settings, specialty: e.target.value})} 
                    className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none appearance-none"
                   >
                     {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>

              <button 
                onClick={handleCompleteProfile} 
                className="w-full h-14 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all mt-4"
              >
                SAVE PROFILE
              </button>
              
              <button 
                 onClick={handleLogout}
                 className="w-full py-3 text-slate-400 font-bold hover:text-red-500 transition-colors"
               >
                 Cancel / Sign Out
               </button>
            </div>
         </div>
         <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

  // Header Actions
  const DashboardHeaderAction = (
    <button 
      onClick={() => setView('settings')} 
      className={`p-1.5 transition-all rounded-full border shadow-sm active:scale-95 ${settings.isPro ? 'bg-slate-100 dark:bg-slate-800 border-yellow-400/50' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
    >
      <div className={`w-8 h-8 rounded-full overflow-hidden border ${settings.isPro ? 'border-yellow-400' : 'border-slate-300 dark:border-slate-600'} shadow-inner relative`}>
        <img src={settings.logoUrl} className="w-full h-full object-cover" alt="Profile" />
        {settings.isPro && (
           <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
        )}
      </div>
    </button>
  );

  return (
    <>
      <Layout 
        title={view === 'dashboard' ? 'Logbook' : view === 'form' ? (editingLog ? 'Edit Case' : 'New Case') : view === 'settings' ? 'Settings' : 'Export'} 
        onBack={view !== 'dashboard' ? handleBackToDashboard : undefined} 
        actions={view === 'dashboard' ? DashboardHeaderAction : undefined}
      >
        {view === 'dashboard' && <DashboardView logs={logs} settings={settings} onEditLog={(log) => { setEditingLog(log); setView('form'); }} onDeleteLog={handleDeleteLog} onNavigate={setView} />}
        {view === 'form' && <FormView initialLog={editingLog} logs={logs} onSave={handleSaveLog} onDelete={editingLog ? handleDeleteLog : undefined} onCancel={() => { setEditingLog(null); setView('dashboard'); }} haptics={settings.hapticsEnabled} sound={settings.soundEnabled} />}
        {view === 'settings' && <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} onLogoUpload={handleLogoUpload} onLogout={handleLogout} />}
        {view === 'export' && <ExportView logs={logs} settings={settings} />}
      </Layout>

      {isAuthModalOpen && (
        <AuthView 
          onSuccess={() => setIsAuthModalOpen(false)} 
          onCancel={() => setIsAuthModalOpen(false)} 
          initialMode={authMode}
          defaultName={settings.name} 
        />
      )}
      
      {showPaywall && (
        <PaywallView 
          userId={currentUser?.uid || 'demo'} 
          onClose={() => setShowPaywall(false)} 
          onSuccess={handleProPurchaseSuccess} 
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <BottomNav currentView={view as any} onChange={handleNavChange} />
    </>
  );
};

export default App;
