
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
    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative border border-slate-200 dark:border-slate-800">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full z-10 text-white hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Hero Image / Header */}
        <div className="h-56 bg-gradient-to-br from-blue-600 to-indigo-900 relative flex items-center justify-center overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
           
           <div className="text-center z-10 p-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center mx-auto mb-4 text-4xl shadow-xl border border-white/30 rotate-3">
                💎
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">SurgiLog Pro</h2>
           </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-8">
          <h3 className="text-center text-slate-900 dark:text-white font-bold text-xl mb-8">Unlock Full Access</h3>
          
          <div className="space-y-5 mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-700 dark:text-slate-200 font-bold text-sm">Unlimited Cases (Free limit: 3)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-700 dark:text-slate-200 font-bold text-sm">Advanced PDF Exports</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-1.5 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>
              <span className="text-slate-700 dark:text-slate-200 font-bold text-sm">Cloud Sync & Backup</span>
            </div>
          </div>

          <div className="space-y-4">
            <button 
                onClick={handlePurchase}
                disabled={loading}
                className="w-full h-16 bg-blue-600 text-white rounded-full font-black text-lg shadow-xl shadow-blue-600/40 active:scale-95 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
            >
                {loading ? 'Processing...' : 'Subscribe - $4.99/mo'}
            </button>
            <p className="text-[10px] text-center text-slate-400 font-medium">Recurring billing • Cancel anytime</p>
            
            <button onClick={handleRestore} className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                Restore Purchases
            </button>
          </div>
          
          <div className="mt-8 flex justify-center gap-4 text-[9px] text-slate-300 font-bold uppercase tracking-wider">
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
