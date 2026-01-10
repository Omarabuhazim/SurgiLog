
import React, { useRef } from 'react';
import { UserSettings, Theme } from '../types';
import { SPECIALTIES } from '../constants';
import { auth } from '../services/firebase';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
}

const SettingsView = ({ 
  settings, 
  onUpdateSettings, 
  onLogoUpload,
  onLogout
}: SettingsViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = auth.currentUser;

  // iOS-style List Item
  const ListItem = ({ label, children, icon, last = false }: { label: string, children: React.ReactNode, icon?: React.ReactNode, last?: boolean }) => (
    <div className={`p-4 flex items-center justify-between ${!last ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
      <div className="flex items-center gap-3">
         {icon && <div className="text-slate-500 dark:text-slate-400">{icon}</div>}
         <span className="text-base font-medium text-slate-900 dark:text-slate-100">{label}</span>
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-300">
      
      {/* 1. Profile Section */}
      <div className="flex flex-col items-center py-6">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
              <img src={settings.logoUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onLogoUpload} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{settings.name || 'Set Name'}</h2>
        <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">{settings.specialty}</p>
      </div>

      {/* 2. Personal Information */}
      <div>
        <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-4 mb-2">Personal Information</h5>
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
           <ListItem label="Name">
              <input 
                type="text" 
                value={settings.name}
                onChange={e => onUpdateSettings({...settings, name: e.target.value})}
                className="text-right bg-transparent outline-none text-slate-600 dark:text-slate-400 font-medium placeholder:text-slate-300 w-40"
                placeholder="Required"
              />
           </ListItem>
           <ListItem label="Specialty" last>
               <select 
                value={settings.specialty}
                onChange={e => onUpdateSettings({...settings, specialty: e.target.value})}
                className="bg-transparent outline-none text-slate-600 dark:text-slate-400 font-medium appearance-none text-right dir-rtl w-48"
                style={{ direction: 'rtl' }}
              >
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </ListItem>
        </div>
      </div>

      {/* 3. Appearance */}
      <div>
         <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-4 mb-2">Appearance</h5>
         <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-sm p-1.5 flex">
             {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
               <button
                 key={theme}
                 onClick={() => onUpdateSettings({...settings, theme})}
                 className={`flex-1 py-2 rounded-[14px] text-sm font-bold transition-all capitalize ${
                   settings.theme === theme 
                     ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                     : 'text-slate-400 dark:text-slate-600 hover:text-slate-600'
                 }`}
               >
                 {theme}
               </button>
             ))}
         </div>
      </div>

      {/* 4. Preferences */}
      <div>
        <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-4 mb-2">App Settings</h5>
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <ListItem 
              label="Haptic Feedback" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H2v6h4l5 4V5l-5 4Z"/></svg>}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.hapticsEnabled} onChange={e => onUpdateSettings({...settings, hapticsEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </ListItem>
            <ListItem 
              label="Sound Effects" 
              last
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.soundEnabled} onChange={e => onUpdateSettings({...settings, soundEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </ListItem>
        </div>
      </div>

      {/* 5. Account */}
      <button 
        onClick={onLogout}
        className="w-full bg-white dark:bg-slate-900 rounded-[18px] p-4 text-center font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        Sign Out
      </button>

      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Version 1.0.0</p>
      </div>
    </div>
  );
};

export default SettingsView;
