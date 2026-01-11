
import { ReactNode } from 'react';

interface LayoutProps {
  children?: ReactNode;
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
}

const Layout = ({ children, title, onBack, actions }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen bg-transparent pb-32 transition-colors duration-300">
      <header className="sticky top-4 z-40 mx-4 mt-2 rounded-[2rem] liquid-glass flex items-center justify-between px-6 py-4 transition-all">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-900 dark:text-white active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none drop-shadow-sm">{title}</h1>
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
