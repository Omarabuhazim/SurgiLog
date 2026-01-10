
import React, { useState, useRef } from 'react';
import { ProcedureLog, UserSettings } from '../types';

interface DashboardViewProps {
  logs: ProcedureLog[];
  settings: UserSettings;
  onEditLog: (log: ProcedureLog) => void;
  onDeleteLog: (id: string) => void;
  onNavigate: (view: any) => void;
}

interface SwipeableLogEntryProps {
  log: ProcedureLog;
  onEdit: (log: ProcedureLog) => void;
  onDelete: (id: string) => void;
}

const SwipeableLogEntry: React.FC<SwipeableLogEntryProps> = ({ 
  log, 
  onEdit, 
  onDelete 
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const threshold = 70;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = translateX;
    setIsSwiping(false);
    if (confirmDelete) setConfirmDelete(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    const newTranslate = currentX.current + diff;
    if (newTranslate < 120 && newTranslate > -120) {
      setTranslateX(newTranslate);
      if (Math.abs(diff) > 10) setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    if (translateX > threshold) {
      setTranslateX(90); // Reveal Delete
    } else if (translateX < -threshold) {
      setTranslateX(-90); // Reveal Edit
    } else {
      setTranslateX(0); // Snap back
    }
    setTimeout(() => setIsSwiping(false), 50);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(log.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] mb-3 select-none group shadow-sm">
      {/* Background Actions Layer */}
      <div className="absolute inset-0 flex items-center justify-between z-0 rounded-[20px] overflow-hidden">
        {/* Delete Side (Left) */}
        <button 
          onClick={handleDeleteClick}
          className={`flex items-center justify-center h-full w-[90px] transition-all duration-300 ${confirmDelete ? 'bg-red-600' : 'bg-red-500'} text-white`}
        >
          <div className="flex flex-col items-center gap-1">
            {confirmDelete ? (
              <>
                <div className="animate-pulse flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  <span className="text-[8px] font-bold uppercase mt-1">Confirm</span>
                </div>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                <span className="text-[9px] font-bold uppercase">Delete</span>
              </>
            )}
          </div>
        </button>

        {/* Edit Side (Right) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(log); }}
          className="flex items-center justify-center h-full w-[90px] bg-blue-500 text-white ml-auto"
        >
          <div className="flex flex-col items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span className="text-[9px] font-bold uppercase">Edit</span>
          </div>
        </button>
      </div>

      {/* Foreground Content Card */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isSwiping && translateX === 0 && onEdit(log)}
        className="relative bg-white dark:bg-slate-800 dark:border-slate-700 p-5 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700/80 transition-transform duration-300 ease-out cursor-pointer z-10"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${log.role === 'Main Surgeon' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              {log.role === 'Main Surgeon' ? 'Surgeon' : log.role === 'Observer' ? 'Observer' : 'Assist'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{log.date}</span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">
            {log.procedureName}
          </h4>
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
            <span className="font-mono text-slate-500 dark:text-slate-500">{log.patientId}</span> • {log.patientAge}, {log.patientGender}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-300 dark:text-slate-500 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ logs, settings, onEditLog, onDeleteLog, onNavigate }: DashboardViewProps) => {
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-[2.5rem] p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10 flex flex-col gap-6">
           <div className="flex items-center gap-4">
              <div className="p-0.5 bg-white/10 rounded-2xl backdrop-blur-sm shrink-0">
                <img src={settings.logoUrl} className="w-14 h-14 rounded-[14px] object-cover" alt="Profile" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight leading-tight truncate">{settings.name || 'Surgeon'}</h2>
                <p className="text-blue-200 font-bold text-xs opacity-80 uppercase tracking-wider truncate">{settings.specialty}</p>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Total Logs</p>
                <p className="text-3xl font-bold text-white leading-none mt-2">{logs.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Main Surgeon</p>
                <p className="text-3xl font-bold text-white leading-none mt-2">
                  {logs.filter(l => l.role === 'Main Surgeon').length}
                </p>
              </div>
           </div>
        </div>
      </div>

      <div className="px-1">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Cases</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {logs.length > 0 ? 'Last 30 Days' : 'No Data'}
            </span>
          </div>
        </div>

        <div className="space-y-0">
          {logs.length === 0 ? (
            <div className="py-16 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 mt-3">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📝</div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">No cases recorded</h4>
              <p className="text-slate-400 text-sm font-medium mt-1">Tap the "Log Case" button below<br/>to start your logbook.</p>
            </div>
          ) : (
            logs.slice(0, 20).map(log => (
              <SwipeableLogEntry 
                key={log.id} 
                log={log} 
                onEdit={onEditLog} 
                onDelete={onDeleteLog} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
