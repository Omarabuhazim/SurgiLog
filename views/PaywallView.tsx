
import React, { useState } from 'react';
import { SubscriptionService } from '../services/subscriptionService';

interface PaywallViewProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const PaywallView = ({ onClose, onSuccess, userId }: PaywallViewProps) => {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // Simulate purchase delay
      await new Promise(r => setTimeout(r, 1500));
      const result = await SubscriptionService.purchasePro(userId);
      if (result) {
        onSuccess();
      }
    } catch (e) {
      alert("Purchase failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          alert("No previous purchases found.");
      }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full z-10 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Hero Image / Header */}
        <div className="h-48 bg-gradient-to-br from-blue-600 to-indigo-900 relative flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
           <div className="text-center z-10 p-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg border border-white/30">
                💎
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">SurgiLog Pro</h2>
           </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-6">
          <h3 className="text-center text-slate-900 dark:text-white font-bold text-lg mb-6">Unlock Full Access</h3>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">Unlimited Cases (Free limit: 3)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">Advanced PDF Exports</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">Cloud Sync & Backup</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
                onClick={handlePurchase}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {loading ? 'Processing...' : 'Subscribe - $4.99/mo'}
            </button>
            <p className="text-[10px] text-center text-slate-400">Recurring billing • Cancel anytime</p>
            
            <button onClick={handleRestore} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200">
                Restore Purchases
            </button>
          </div>
          
          <div className="mt-6 flex justify-center gap-4 text-[9px] text-slate-300 font-medium">
             <a href="#" className="hover:text-slate-500">Privacy Policy</a>
             <span>•</span>
             <a href="#" className="hover:text-slate-500">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallView;
