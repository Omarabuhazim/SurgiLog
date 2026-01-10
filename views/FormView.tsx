
import React, { useState, useEffect, useRef } from 'react';
import { ProcedureLog } from '../types';
import { PATIENT_AGES, ROLES, GENDERS } from '../constants';
import { suggestProcedures } from '../services/geminiService';
import Scanner from '../components/Scanner';

interface FormViewProps {
  initialLog: ProcedureLog | null;
  onSave: (logData: Omit<ProcedureLog, 'id' | 'createdAt' | 'syncStatus'>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  haptics: boolean;
  sound: boolean;
}

const FormView = ({ initialLog, onSave, onDelete, onCancel, haptics, sound }: FormViewProps) => {
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

  useEffect(() => {
    if (procedureQuery.length < 3) {
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const suggestions = await suggestProcedures(procedureQuery);
      setAiSuggestions(suggestions);
    }, 800);
    return () => clearTimeout(timer);
  }, [procedureQuery]);

  const handleSubmit = () => {
    if (!procedureQuery.trim()) return;
    const finalPatientId = scannedId.trim() || `PID-${Math.floor(Math.random() * 90000) + 10000}`;
    onSave({
      patientId: finalPatientId,
      procedureName: procedureQuery,
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

  // iOS-style Input Group Wrapper
  const InputGroup = ({ children, title }: { children: React.ReactNode, title: string }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-4 mb-2">{title}</h3>
      <div className="bg-white dark:bg-slate-900 rounded-[18px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Patient Data Group */}
      <InputGroup title="Patient Information">
        {/* MRN Field with Embedded Button */}
        <div className="p-1 relative">
          <input 
            type="text" 
            value={scannedId}
            onChange={e => setScannedId(e.target.value)}
            className="w-full h-12 pl-4 pr-24 bg-transparent outline-none font-mono font-bold text-lg text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            placeholder="MRN / ID"
          />
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>
            SCAN
          </button>
        </div>

        <div className="flex divide-x divide-slate-100 dark:divide-slate-800">
          <div className="w-1/2 relative p-1">
             <select value={selectedAge} onChange={e => setSelectedAge(e.target.value)} className="w-full h-12 pl-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-base">
                {PATIENT_AGES.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
             <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs font-bold">Age</span>
          </div>
          <div className="w-1/2 relative p-1">
             <select value={selectedGender} onChange={e => setSelectedGender(e.target.value as any)} className="w-full h-12 pl-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-base">
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
             </select>
             <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs font-bold">Sex</span>
          </div>
        </div>
      </InputGroup>

      {/* Procedure Data Group */}
      <InputGroup title="Surgical Details">
        <div className="p-1 relative z-20">
            <input 
              type="text" 
              value={procedureQuery}
              onChange={e => { setProcedureQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full h-12 px-4 bg-transparent outline-none font-bold text-lg text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Procedure Name"
            />
            {showSuggestions && aiSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl mt-2 shadow-2xl overflow-hidden z-[30] max-h-60 overflow-y-auto">
                {aiSuggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onMouseDown={() => { setProcedureQuery(s); setShowSuggestions(false); }}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-0 border-slate-50 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
        </div>

        <div className="p-1 relative">
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as any)} className="w-full h-12 pl-4 pr-10 bg-transparent outline-none font-bold text-slate-900 dark:text-white appearance-none text-base">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
            </div>
        </div>

        <div className="p-1">
             <input 
                type="date" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full h-12 px-4 bg-transparent outline-none font-bold text-slate-900 dark:text-white text-base"
              />
        </div>
      </InputGroup>

      <div className="px-1 space-y-4 pt-2">
        <button 
          onClick={handleSubmit}
          disabled={!procedureQuery.trim()}
          className="w-full h-14 bg-blue-600 text-white rounded-[18px] font-bold text-lg shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {initialLog ? 'Update Record' : 'Save Record'}
        </button>
        
        {initialLog && onDelete && (
          <button 
            onClick={handleDelete}
            className={`w-full h-14 rounded-[18px] font-bold text-sm transition-all duration-300 ${confirmDelete ? 'bg-red-600 text-white animate-pulse' : 'bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
          >
            {confirmDelete ? 'Tap again to confirm' : 'Delete Record'}
          </button>
        )}
        
        <button onClick={onCancel} className="w-full py-3 text-slate-400 font-semibold hover:text-slate-600 dark:hover:text-slate-200">
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
