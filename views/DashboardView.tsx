
import React, { useState, useMemo } from 'react';
import { ProcedureLog, UserSettings } from '../types';

interface DashboardViewProps {
  logs: ProcedureLog[];
  settings: UserSettings;
  onEditLog: (log: ProcedureLog) => void;
  onDeleteLog: (id: string) => void;
  onNavigate: (view: any) => void;
}

interface LogEntryProps {
  log: ProcedureLog;
  onEdit: (log: ProcedureLog) => void;
  onDelete: (id: string) => void;
}

const LogEntry: React.FC<LogEntryProps> = ({ 
  log, 
  onEdit, 
  onDelete 
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <div className="mb-2 group relative">
       {/* Card: Solid background, no transparency, compacted */}
      <div 
        onClick={() => onEdit(log)}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-3 px-4 rounded-[18px] flex items-center justify-between shadow-sm active:scale-[0.99] transition-all cursor-pointer"
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${log.role === 'Main Surgeon' ? 'bg-blue-100/50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
              {log.role === 'Main Surgeon' ? 'Surgeon' : log.role === 'Observer' ? 'Observer' : 'Assist'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{log.date}</span>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">
            {log.procedureName}
          </h4>
          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
            <span className="font-mono text-slate-500 dark:text-slate-500 tracking-tight">{log.patientId}</span> • {log.patientAge}, {log.patientGender}
          </p>
        </div>

        {/* Buttons on the right - Compacted (w-8 h-8) */}
        <div className="flex items-center gap-1 pl-3 border-l border-slate-100 dark:border-slate-800 ml-1">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(log); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                title="Edit"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button
                onClick={handleDeleteClick}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                    confirmDelete
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
                title="Delete"
            >
                {confirmDelete ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-9"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ logs, settings, onEditLog, onDeleteLog, onNavigate }: DashboardViewProps) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // -- Search & Filter State --
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [filterConfig, setFilterConfig] = useState<{
    type: 'all' | 'single' | 'range';
    singleDate: string;
    startDate: string;
    endDate: string;
  }>({
    type: 'all',
    singleDate: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: ''
  });

  // Temp state for editing filter in modal
  const [tempFilter, setTempFilter] = useState(filterConfig);

  const openFilterModal = () => {
    setTempFilter(filterConfig);
    setIsFilterModalOpen(true);
  };

  const applyFilter = () => {
    setFilterConfig(tempFilter);
    setIsFilterModalOpen(false);
  };

  // -- Filtering & Sorting --
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(log => 
        log.procedureName.toLowerCase().includes(q) || 
        log.patientId.toLowerCase().includes(q)
      );
    }

    // 2. Date Filter
    if (filterConfig.type === 'single' && filterConfig.singleDate) {
      result = result.filter(log => log.date === filterConfig.singleDate);
    } else if (filterConfig.type === 'range' && filterConfig.startDate && filterConfig.endDate) {
      result = result.filter(log => log.date >= filterConfig.startDate && log.date <= filterConfig.endDate);
    }

    // 3. Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // Secondary sort by createdAt if dates are equal
      if (dateA !== dateB) {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
    });

    return result;
  }, [logs, sortOrder, searchQuery, filterConfig]);

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const isFilterActive = filterConfig.type !== 'all';

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* Main Stats Card - Compact Version */}
      <div className="relative rounded-[2rem] p-5 text-white shadow-xl overflow-hidden border border-white/10">
        {/* Background Mesh */}
        <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-2xl z-0"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-[40px] z-0"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-[40px] z-0"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
           <div className="flex items-center gap-4">
              <div className="p-0.5 bg-white/10 rounded-[14px] backdrop-blur-md shrink-0 border border-white/20 shadow-lg">
                <img src={settings.logoUrl} className="w-12 h-12 rounded-[12px] object-cover" alt="Profile" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-tight leading-tight truncate drop-shadow-md">{settings.name || 'Surgeon'}</h2>
                <p className="text-blue-200 font-bold text-[10px] opacity-90 uppercase tracking-widest truncate mt-0.5 drop-shadow-sm">{settings.specialty}</p>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-xl rounded-[18px] p-4 border border-white/10 flex flex-col justify-center shadow-lg hover:bg-white/10 transition-colors">
                <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest opacity-80">Total Logs</p>
                <p className="text-3xl font-black text-white leading-none mt-1 drop-shadow-lg">{logs.length}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-[18px] p-4 border border-white/10 flex flex-col justify-center shadow-lg hover:bg-white/10 transition-colors">
                <p className="text-blue-200 text-[9px] font-bold uppercase tracking-widest opacity-80">Main Surgeon</p>
                <p className="text-3xl font-black text-white leading-none mt-1 drop-shadow-lg">
                  {logs.filter(l => l.role === 'Main Surgeon').length}
                </p>
              </div>
           </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-1 flex items-center gap-2">
        <div className="relative flex-1 group">
          <div className="absolute inset-0 bg-blue-500/5 rounded-[20px] blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] flex items-center h-12 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
            <svg className="ml-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID or Procedure..."
              className="w-full h-full bg-transparent border-none outline-none px-3 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        <button 
          onClick={openFilterModal}
          className={`h-12 w-12 shrink-0 rounded-[20px] flex items-center justify-center border shadow-sm transition-all active:scale-95 relative
            ${isFilterActive 
              ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/30' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white'
            }`}
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
           {isFilterActive && (
             <div className="absolute top-2.5 right-3 w-2 h-2 bg-yellow-400 rounded-full border border-blue-600"></div>
           )}
        </button>
      </div>

      <div className="px-1">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm">
             {searchQuery || isFilterActive ? 'Found Cases' : 'Recent Cases'}
          </h3>
        </div>

        <div className="space-y-1">
          {processedLogs.length === 0 ? (
            <div className="py-20 text-center liquid-glass rounded-[32px] mt-2">
              <div className="w-20 h-20 bg-blue-50/50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border border-blue-100/50 dark:border-blue-900/30">
                 {searchQuery || isFilterActive ? '🔍' : '📝'}
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {searchQuery || isFilterActive ? 'No matches found' : 'No cases recorded'}
              </h4>
              <p className="text-slate-400 text-base font-medium mt-2 leading-relaxed">
                {searchQuery || isFilterActive ? 'Try adjusting your search or filters' : <>Tap the "Log Case" button below<br/>to start your professional logbook.</>}
              </p>
            </div>
          ) : (
            processedLogs.slice(0, 50).map(log => (
              <LogEntry 
                key={log.id} 
                log={log} 
                onEdit={onEditLog} 
                onDelete={onDeleteLog} 
              />
            ))
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
           <div 
             className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-in slide-in-from-bottom-10 duration-300"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Filter Cases</h3>
                <button onClick={() => setIsFilterModalOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Filter Type Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                   {(['all', 'single', 'range'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setTempFilter(prev => ({ ...prev, type }))}
                        className={`py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all ${
                           tempFilter.type === type 
                             ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' 
                             : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {type === 'all' ? 'All Time' : type === 'single' ? 'Specific' : 'Range'}
                      </button>
                   ))}
                </div>

                {/* Filter Inputs */}
                <div className="min-h-[80px]">
                   {tempFilter.type === 'all' && (
                     <p className="text-center text-slate-400 font-medium py-6 text-sm">Showing all logged cases</p>
                   )}

                   {tempFilter.type === 'single' && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Date</label>
                       <input 
                         type="date"
                         value={tempFilter.singleDate}
                         onChange={(e) => setTempFilter(prev => ({ ...prev, singleDate: e.target.value }))}
                         className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                       />
                     </div>
                   )}

                   {tempFilter.type === 'range' && (
                     <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</label>
                           <input 
                             type="date"
                             value={tempFilter.startDate}
                             onChange={(e) => setTempFilter(prev => ({ ...prev, startDate: e.target.value }))}
                             className="w-full h-12 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</label>
                           <input 
                             type="date"
                             value={tempFilter.endDate}
                             onChange={(e) => setTempFilter(prev => ({ ...prev, endDate: e.target.value }))}
                             className="w-full h-12 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                           />
                        </div>
                     </div>
                   )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                   <button 
                     onClick={() => setTempFilter({ type: 'all', singleDate: '', startDate: '', endDate: '' })}
                     className="h-14 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   >
                     Reset
                   </button>
                   <button 
                     onClick={applyFilter}
                     className="flex-1 h-14 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                   >
                     Apply Filter
                   </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
