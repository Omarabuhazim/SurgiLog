import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProcedureLog, UserSettings } from '../types';
import { ROLES, GENDERS, PATIENT_AGES } from '../constants';

interface ExportViewProps {
  logs: ProcedureLog[];
  settings: UserSettings;
}

const ExportView = ({ logs, settings }: ExportViewProps) => {
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    role: 'All',
    gender: 'All',
    age: 'All',
    procedure: '',
  });

  const filteredLogs = logs.filter(log => {
    const matchDate = (!filter.startDate || log.date >= filter.startDate) &&
                      (!filter.endDate || log.date <= filter.endDate);
    const matchRole = filter.role === 'All' || log.role === filter.role;
    const matchGender = filter.gender === 'All' || log.patientGender === filter.gender;
    const matchAge = filter.age === 'All' || log.patientAge === filter.age;
    const matchProcedure = !filter.procedure || 
                           log.procedureName.toLowerCase().includes(filter.procedure.toLowerCase());
    
    return matchDate && matchRole && matchGender && matchAge && matchProcedure;
  });

  const generatePDF = () => {
    if (filteredLogs.length === 0) return;

    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.text('Surgical Procedure Logbook', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Surgeon: ${settings.name} | Specialty: ${settings.specialty}`, 14, 28);
    doc.text(`Filtered Records: ${filteredLogs.length}`, 14, 33);

    const tableColumn = ["Date", "MRN", "Procedure", "Role", "Age", "Gender"];
    const tableRows = filteredLogs.map(log => [
      log.date,
      log.patientId,
      log.procedureName,
      log.role,
      log.patientAge,
      log.patientGender
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`SurgiLog_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="glass-card p-6 rounded-[2.5rem] shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-800">Export Report</h3>
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
        </div>

        <div className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">From Date</label>
              <input 
                type="date" 
                value={filter.startDate}
                onChange={e => setFilter({...filter, startDate: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">To Date</label>
              <input 
                type="date" 
                value={filter.endDate}
                onChange={e => setFilter({...filter, endDate: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm mt-1"
              />
            </div>
          </div>

          {/* Procedure Search */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Procedure</label>
            <input 
              type="text" 
              placeholder="Filter by name..."
              value={filter.procedure}
              onChange={e => setFilter({...filter, procedure: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm mt-1"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-4">
             <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Role</label>
              <div className="relative mt-1">
                <select 
                  value={filter.role}
                  onChange={e => setFilter({...filter, role: e.target.value})}
                  className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm appearance-none"
                >
                  <option value="All">All Roles</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                <div className="relative mt-1">
                  <select 
                    value={filter.gender}
                    onChange={e => setFilter({...filter, gender: e.target.value})}
                    className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm appearance-none"
                  >
                    <option value="All">All</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Age</label>
                <div className="relative mt-1">
                  <select 
                    value={filter.age}
                    onChange={e => setFilter({...filter, age: e.target.value})}
                    className="w-full h-12 px-4 bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-sm appearance-none"
                  >
                    <option value="All">All</option>
                    {PATIENT_AGES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400">Records found:</span>
                <span className="text-lg font-black text-blue-600">{filteredLogs.length}</span>
             </div>
             
             <button 
               onClick={generatePDF}
               disabled={filteredLogs.length === 0}
               className="w-full h-14 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               DOWNLOAD PDF
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportView;