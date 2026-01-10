import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const bgColors = {
    success: 'bg-slate-900 text-white border-l-4 border-green-500',
    error: 'bg-red-50 text-red-900 border-l-4 border-red-500',
    info: 'bg-blue-50 text-blue-900 border-l-4 border-blue-500'
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${bgColors[toast.type]} p-4 mb-3 transition-all animate-[slideIn_0.3s_ease-out]`}>
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            type="button"
            className="inline-flex rounded-md bg-transparent text-current hover:text-opacity-75 focus:outline-none"
            onClick={() => onDismiss(toast.id)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer = ({ toasts, onDismiss }: { toasts: ToastMessage[], onDismiss: (id: string) => void }) => {
  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-start px-4 py-6 sm:p-6 mt-12">
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
};