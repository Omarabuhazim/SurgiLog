
import React from 'react';

type ViewType = 'dashboard' | 'form' | 'settings' | 'export';

interface BottomNavProps {
  currentView: ViewType;
  onChange: (view: ViewType) => void;
}

const BottomNav = ({ currentView, onChange }: BottomNavProps) => {
  const navItems: { id: ViewType; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
           <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'form',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M12 5v14M5 12h14" />
        </svg>
      )
    },
    {
      id: 'export',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
           <polyline points="16 6 12 2 8 6" />
           <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )
    },
    {
      id: 'settings',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* 
         VisionOS / iOS Style Floating Dock 
         - Compact height
         - Heavy blur
         - Subtle borders/shadows
      */}
      <div className="pointer-events-auto bg-white/75 dark:bg-black/75 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-black/50 rounded-full p-1.5 flex items-center gap-1 w-auto min-w-[240px] relative ring-1 ring-white/10 overflow-hidden">
        
        {/* Top Gloss Reflection Line */}
        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer group focus:outline-none"
            >
              {/* Liquid Active Background */}
              <div 
                className={`absolute inset-0 m-auto rounded-full bg-blue-500 dark:bg-blue-600 transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
                  ${isActive ? 'w-12 h-12 opacity-100 shadow-[0_4px_12px_rgba(59,130,246,0.4)]' : 'w-2 h-2 opacity-0 scale-50'}
                `}
              ></div>

              {/* Icon */}
              <div 
                className={`relative z-10 transition-all duration-300 ease-out transform
                  ${isActive 
                    ? 'text-white scale-110' 
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-active:scale-90'
                  }
                `}
              >
                {/* Dynamically adjust stroke for active state */}
                {React.cloneElement(item.icon as React.ReactElement, { 
                  strokeWidth: isActive ? 2.5 : 2,
                  fill: isActive ? "currentColor" : "none",
                  fillOpacity: isActive ? 0.2 : 0
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
