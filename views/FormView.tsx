
import React, { useState, useEffect, useMemo } from 'react';
import { ProcedureLog } from '../types';
import { PATIENT_AGES, ROLES, GENDERS, SURGICAL_PROCEDURES } from '../constants';
import { suggestProcedures } from '../services/geminiService';
import Scanner from '../components/Scanner';

interface FormViewProps {
  initialLog: ProcedureLog | null;
  logs: ProcedureLog[];
  onSave: (logData: Omit<ProcedureLog, 'id' | 'createdAt' | 'syncStatus'>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  haptics: boolean;
  sound: boolean;
}

const InputGroup = ({ children, title }: { children?: React.ReactNode, title: string }) => (
  <div className="mb-8">
    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-5 mb-3 drop-shadow-sm">{title}</h3>
    <div className="liquid-glass rounded-[28px] overflow-hidden divide-y divide-white/20 dark:divide-white/5">
      {children}
    </div>
  </div>
);

const FormView = ({ initialLog, logs, onSave, onDelete, onCancel, haptics, sound }: FormViewProps) => {
  const [scannedId, setScannedId] = useState(initialLog?.patientId || '');
  const [procedureQuery, setProcedureQuery] = useState(initialLog?.procedureName || '');
  const [selectedRole, setSelectedRole] = useState(initialLog?.role || ROLES[0]);
  const [selectedAge, setSelectedAge] = useState(initialLog?.patientAge || PATIENT_AGES[30]);
  const [selectedGender, setSelectedGender] = useState(initialLog?.patientGender || GENDERS[0]);
  const [selectedDate, setSelectedDate] = useState(initialLog?.date || new Date().toISOString().split('T')[0]);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Frequent Procedures Logic (Personal Memory) ---
  const frequentProcedures = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      counts[log.procedureName] = (counts[log.procedureName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 15);
  }, [logs]);

  // --- Instant Local Matches (Personal + Standard List) ---
  const localMatches = useMemo(() => {
    const query = procedureQuery.toLowerCase().trim();
    
    // If query is empty, just show top frequent history
    if (!query) return frequentProcedures.slice(0, 5);

    const matches = new Set<string>();

    // 1. Personal History (Highest Priority)
    frequentProcedures.forEach(p => {
      if (p.toLowerCase().includes(query)) matches.add(p);
    });

    // 2. Standard Common Procedures (Fallback - Instant Autocomplete)
    SURGICAL_PROCEDURES.forEach(p => {
      if (p.toLowerCase().includes(query)) matches.add(p);
    });

    return Array.from(matches).slice(0, 8);
  }, [procedureQuery, frequentProcedures]);

  useEffect(() => {
    // Only query AI if we don't have enough local matches or user paused typing
    if (procedureQuery.length < 3) {
      setAiSuggestions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      // Don't call AI if we already have a perfect match in local
      if (localMatches.some(m => m.toLowerCase() === procedureQuery.toLowerCase())) {
          return; 
      }
      
      const suggestions = await suggestProcedures(procedureQuery);
      const filteredAi = suggestions.filter(s => !localMatches.includes(s));
      setAiSuggestions(filteredAi);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [procedureQuery, localMatches]);

  const handleSubmit = () => {
    const trimmedId = scannedId.trim();
    const trimmedProcedure = procedureQuery.trim();
    
    if (!trimmedId || !trimmedProcedure) return;

    onSave({
      patientId: trimmedId,
      procedureName: trimmedProcedure,
      date: selectedDate,
      patientAge: selectedAge,
      patientGender: selectedGender as any,
      role: selectedRole as any,
    });
  };

  const handleDelete = () => {
    if (!initialLog || !onDelete) return;
    if (confirmDelete) {
      onDelete(initialLog.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setProcedureQuery(suggestion);
    setShowSuggestions(false);
    if (haptics && 'vibrate' in navigator) navigator.vibrate(10);
  };

  const isFormValid = procedureQuery.trim().length > 0 && scannedId.trim().length > 0;

  return (
    <div className="space-y-8 pb-24 animate-in slide-in-from-bottom-6 duration-300">
      
      <InputGroup title="Patient Information">
        <div className="p-2 relative">
          <input 
            type="text" 
            value={scannedId}
            onChange={e => setScannedId(e.target.value)}
            className={`w-full h-14 pl-4 pr-28 bg-transparent outline-none font-mono font-bold text-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors rounded-2xl focus:bg-white/20 dark:focus:bg-white/5`}
            placeholder="MRN / ID"
          />
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-3 top-3 bottom-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/20 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-blue-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>
            SCAN
          </button>
        </div>

        <div className="flex divide-x divide-white/20 dark:divide-white/5">
          <div className="w-1/2 relative p-2">
             <select value={selectedAge} onChange={e => setSelectedAge(e.target.value)} className="w-full h-14 pl-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-lg rounded-2xl focus:bg-white/20 dark:focus:bg-white/5">
                {PATIENT_AGES.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
             <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-black uppercase tracking-widest">Age</span>
          </div>
          <div className="w-1/2 relative p-2">
             <select value={selectedGender} onChange={e => setSelectedGender(e.target.value as any)} className="w-full h-14 pl-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-lg rounded-2xl focus:bg-white/20 dark:focus:bg-white/5">
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
             <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-black uppercase tracking-widest">Sex</span>
          </div>
        </div>
      </InputGroup>

      <InputGroup title="Surgical Details">
        <div className="p-2 relative z-50">
            <input 
              type="text" 
              value={procedureQuery}
              onChange={e => { setProcedureQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full h-14 px-4 bg-transparent outline-none font-bold text-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-2xl focus:bg-white/20 dark:focus:bg-white/5"
              placeholder="Procedure Name"
              autoComplete="off"
            />
            {showSuggestions && (localMatches.length > 0 || aiSuggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 liquid-glass rounded-[24px] mt-4 z-[100] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Local Matches (History + Standard) */}
                {localMatches.length > 0 && (
                  <div className="bg-white/30 dark:bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-white/10">
                    Quick Suggestions
                  </div>
                )}
                {localMatches.map((s, i) => (
                  <button 
                    key={`local-${i}`} 
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                    className="w-full text-left px-5 py-4 hover:bg-white/30 dark:hover:bg-white/10 border-b last:border-0 border-white/10 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{s}</span>
                    <svg className="text-slate-300 group-hover:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                ))}

                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && (
                  <div className="bg-white/30 dark:bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-blue-500 border-y border-white/10 flex items-center gap-2">
                    <span className="animate-pulse">✨</span> AI Suggested
                  </div>
                )}
                {aiSuggestions.map((s, i) => (
                  <button 
                    key={`ai-${i}`} 
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                    className="w-full text-left px-5 py-4 hover:bg-white/30 dark:hover:bg-white/10 border-b last:border-0 border-white/10 transition-colors"
                  >
                    <span className="font-medium text-slate-600 dark:text-slate-300 text-sm">{s}</span>
                  </button>
                ))}
              </div>
            )}
        </div>

        <div className="p-2 relative">
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)} className="w-full h-14 pl-4 pr-10 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-lg rounded-2xl focus:bg-white/20 dark:focus:bg-white/5">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </div>
        </div>

        <div className="p-2">
             <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full h-14 px-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white text-lg rounded-2xl focus:bg-white/20 dark:focus:bg-white/5"
              />
        </div>
      </InputGroup>

      <div className="px-1 space-y-4 pt-2">
        <button 
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full h-16 bg-blue-600 text-white rounded-full font-black text-lg shadow-xl shadow-blue-600/30 active:scale-[0.98] hover:bg-blue-500 transition-all disabled:opacity-30 disabled:grayscale disabled:shadow-none"
        >
          {initialLog ? 'Update Case' : 'Log Case'}
        </button>
        
        {initialLog && onDelete && (
          <button 
            onClick={handleDelete}
            className={`w-full h-16 rounded-full font-bold text-sm transition-all duration-300 ${confirmDelete ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
          >
            {confirmDelete ? 'Tap again to confirm' : 'Delete Case'}
          </button>
        )}
        
        <button onClick={onCancel} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          Cancel
        </button>
      </div>

      {isScannerOpen && (
        <Scanner 
          onScan={(id) => { setScannedId(id); setIsScannerOpen(false); }} 
          onClose={() => setIsScannerOpen(false)} 
          haptics={haptics} 
          sound={sound} 
        />
      )}
    </div>
  );
};

export default FormView;
