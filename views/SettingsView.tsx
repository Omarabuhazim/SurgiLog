
import React, { useRef, useState } from 'react';
import { UserSettings, Theme } from '../types';
import { SPECIALTIES } from '../constants';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
}

const ListItem = ({ label, children, icon, last = false }: { label: string, children?: React.ReactNode, icon?: React.ReactNode, last?: boolean }) => (
  <div className={`p-5 flex items-center justify-between ${!last ? 'border-b border-white/20 dark:border-white/5' : ''}`}>
    <div className="flex items-center gap-4">
       {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
       <span className="text-base font-bold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
    <div className="flex items-center">{children}</div>
  </div>
);

const SettingsView = ({ 
  settings, 
  onUpdateSettings, 
  onLogoUpload,
  onLogout
}: SettingsViewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for manual procedure entry & modal visibility
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [newProcedure, setNewProcedure] = useState('');
  
  const APP_VERSION = "1.1.4";
  const BUILD_DATE = new Date().toLocaleDateString();

  const handleAddProcedure = () => {
    const trimmed = newProcedure.trim();
    if (!trimmed) return;

    // Get current list
    const currentList = settings.customProcedures || [];

    // Check for duplicates (case-insensitive)
    if (currentList.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
        setNewProcedure('');
        return;
    }

    // Add and Sort
    const updatedList = [...currentList, trimmed].sort();
    onUpdateSettings({ ...settings, customProcedures: updatedList });
    setNewProcedure('');
  };

  const handleRemoveProcedure = (procedureToRemove: string) => {
    const currentList = settings.customProcedures || [];
    const updatedList = currentList.filter(p => p !== procedureToRemove);
    onUpdateSettings({ ...settings, customProcedures: updatedList });
  };

  const handleClearAllProcedures = () => {
    if (window.confirm("Are you sure you want to delete all custom procedures?")) {
      onUpdateSettings({ ...settings, customProcedures: [] });
    }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-300">
      
      {/* 1. Profile Section */}
      <div className="flex flex-col items-center py-8">
        <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={() => fileInputRef.current?.click()}>
            <div className="w-28 h-28 rounded-[2rem] bg-white/20 dark:bg-white/5 overflow-hidden border-4 border-white/40 dark:border-white/10 shadow-2xl backdrop-blur-md">
              <img src={settings.logoUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-4 border-white dark:border-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onLogoUpload} />
        </div>
        <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">{settings.name || 'Set Name'}</h2>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest">{settings.specialty}</p>
          {settings.isPro && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">PRO</span>
          )}
        </div>
      </div>

      {/* 2. Personal Information */}
      <div>
        <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 mb-3 drop-shadow-sm">Personal Information</h5>
        <div className="liquid-glass rounded-[28px] overflow-hidden">
           <ListItem label="Name">
              <input 
                type="text" 
                value={settings.name}
                onChange={e => onUpdateSettings({...settings, name: e.target.value})}
                className="text-right bg-transparent outline-none text-slate-600 dark:text-slate-400 font-bold placeholder:text-slate-300 w-48 focus:text-blue-600"
                placeholder="Required"
              />
           </ListItem>
           <ListItem label="Specialty" last>
               <select 
                value={settings.specialty}
                onChange={e => onUpdateSettings({...settings, specialty: e.target.value})}
                className="bg-transparent outline-none text-slate-600 dark:text-slate-400 font-bold appearance-none text-right dir-rtl w-56"
                style={{ direction: 'rtl' }}
              >
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </ListItem>
        </div>
      </div>

      {/* 3. Procedure Database Entry */}
      <div>
        <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 mb-3 drop-shadow-sm">Procedure Database</h5>
        <div 
          className="liquid-glass rounded-[28px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setIsManagerOpen(true)}
        >
          <ListItem 
            label="My Procedures" 
            last
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            }
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${settings.customProcedures?.length ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>
                {settings.customProcedures?.length || 0} items
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300 dark:text-slate-600"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </ListItem>
        </div>
      </div>

      {/* 4. Appearance */}
      <div>
         <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 mb-3 drop-shadow-sm">Appearance</h5>
         <div className="liquid-glass rounded-[28px] p-2 flex">
             {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
               <button
                 key={theme}
                 onClick={() => onUpdateSettings({...settings, theme})}
                 className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all capitalize ${
                   settings.theme === theme 
                     ? 'bg-white/80 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm scale-100' 
                     : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 scale-95'
                 }`}
               >
                 {theme}
               </button>
             ))}
         </div>
      </div>

      {/* 5. Preferences */}
      <div>
        <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 mb-3 drop-shadow-sm">App Settings</h5>
        <div className="liquid-glass rounded-[28px] overflow-hidden">
            <ListItem 
              label="Haptic Feedback" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H2v6h4l5 4V5l-5 4Z"/></svg>}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.hapticsEnabled} onChange={e => onUpdateSettings({...settings, hapticsEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-12 h-7 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
              </label>
            </ListItem>
            <ListItem 
              label="Sound Effects" 
              last
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.soundEnabled} onChange={e => onUpdateSettings({...settings, soundEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-12 h-7 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
              </label>
            </ListItem>
        </div>
      </div>

      {/* 6. Account */}
      <button 
        onClick={onLogout}
        className="w-full liquid-glass rounded-[28px] py-5 text-center font-bold text-red-500 hover:bg-red-500/10 transition-colors active:scale-[0.98]"
      >
        Sign Out
      </button>

      <div className="text-center pt-6 space-y-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Version {APP_VERSION}</p>
        <p className="text-[8px] text-slate-300 dark:text-slate-600 font-medium uppercase tracking-widest">Built on {BUILD_DATE}</p>
      </div>

      {/* Procedure Manager Modal */}
      {isManagerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => {
            if (e.target === e.currentTarget) setIsManagerOpen(false);
        }}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl border border-white/10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Procedures</h3>
                    <p className="text-slate-500 font-bold text-sm">Manage your custom list</p>
                 </div>
                 <button onClick={() => setIsManagerOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>

              {/* Input */}
              <div className="flex gap-2 mb-6 flex-shrink-0">
                 <input 
                   autoFocus
                   type="text" 
                   value={newProcedure}
                   onChange={(e) => setNewProcedure(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleAddProcedure()}
                   placeholder="Type procedure name..."
                   className="flex-1 h-14 px-5 bg-slate-50 dark:bg-black/40 rounded-2xl border-none outline-none font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 transition-all"
                 />
                 <button 
                   onClick={handleAddProcedure}
                   disabled={!newProcedure.trim()}
                   className="h-14 w-14 flex items-center justify-center bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 -mr-1">
                 {(!settings.customProcedures || settings.customProcedures.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                       <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">📝</div>
                       <p className="font-bold text-slate-900 dark:text-white">No custom procedures</p>
                       <p className="text-xs text-slate-500 mt-1">Add items here to see them in suggestions.</p>
                    </div>
                 ) : (
                   <div className="space-y-2 pb-2">
                      <div className="flex justify-between items-center px-1 mb-2">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your List</span>
                         <button onClick={handleClearAllProcedures} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Clear All</button>
                      </div>
                      {settings.customProcedures.map((proc, idx) => (
                        <div key={`${proc}-${idx}`} className="group flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-blue-500/20 hover:bg-white dark:hover:bg-white/10 transition-all">
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight break-words pr-4">{proc}</span>
                           <button 
                             onClick={() => handleRemoveProcedure(proc)}
                             className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all"
                           >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                           </button>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
