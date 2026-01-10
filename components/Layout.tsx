
import { ReactNode } from 'react';

interface LayoutProps {
  children?: ReactNode;
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
}

const Layout = ({ children, title, onBack, actions }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] dark:bg-black pb-20 transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
