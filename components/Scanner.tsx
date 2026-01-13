
import { useRef, useState, useCallback, useEffect } from 'react';
import { scanPatientId } from '../services/geminiService';

interface ScannerProps {
  onScan: (id: string) => void;
  onClose: () => void;
  haptics: boolean;
  sound: boolean;
}

const Scanner = ({ onScan, onClose, haptics, sound }: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReaderRef = useRef<any>(null);
  
  // UI State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing Camera...");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const triggerFeedback = useCallback(() => {
    if (haptics && 'vibrate' in navigator) navigator.vibrate(60);
    if (sound) {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.1);
          setTimeout(() => audioCtx.close(), 200);
        }
      } catch (e) {}
    }
  }, [haptics, sound]);

  const handleBarcodeFound = useCallback((rawValue: string) => {
    if (hasScannedRef.current || !isMountedRef.current) return;
    const cleanValue = rawValue.trim();
    if (cleanValue.length < 2) return;

    hasScannedRef.current = true;
    triggerFeedback();
    setStatusMessage("Code Captured!");
    
    // Cleanup and exit
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    // Brief delay to show success state
    setTimeout(() => {
      onScanRef.current(cleanValue);
    }, 400);
  }, [triggerFeedback]);

  const toggleTorch = async () => {
    if (!codeReaderRef.current) return;
    try {
      const stream = (videoRef.current?.srcObject as MediaStream);
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities?.() || {}) as any;
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
        setTorchOn(!torchOn);
      }
    } catch (err) {
      console.warn("Torch failed", err);
    }
  };

  const handleManualCapture = async () => {
    if (isAiAnalyzing || !videoRef.current || !canvasRef.current) return;
    
    setIsAiAnalyzing(true);
    setStatusMessage("AI Reading Label...");
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      try {
        const id = await scanPatientId(base64);
        if (id && isMountedRef.current) {
           handleBarcodeFound(id);
        } else {
           setStatusMessage("No ID found. Try again.");
           setIsAiAnalyzing(false);
        }
      } catch (err: any) {
        setIsAiAnalyzing(false);
        setStatusMessage("Cloud Scan Failed.");
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    hasScannedRef.current = false;

    const startScanning = async () => {
      if (!(window as any).ZXing) {
        setError("Scanner engine not found.");
        return;
      }

      try {
        const reader = new (window as any).ZXing.BrowserMultiFormatReader();
        codeReaderRef.current = reader;

        // Optimized constraints for 1D/2D barcodes on mobile
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        };

        // decodeFromConstraints handles stream creation, attachment, and the decode loop automatically
        await reader.decodeFromConstraints(constraints, videoRef.current, (result: any, err: any) => {
          if (result && !hasScannedRef.current) {
            handleBarcodeFound(result.text);
          }
          if (err && !(err instanceof (window as any).ZXing.NotFoundException)) {
            // Unexpected errors handled here if needed
          }
        });

        if (isMountedRef.current) {
          setIsCameraReady(true);
          setStatusMessage("Scanning...");
          
          // Check for torch after stream started
          const stream = videoRef.current?.srcObject as MediaStream;
          if (stream) {
            const track = stream.getVideoTracks()[0];
            const caps = (track.getCapabilities?.() || {}) as any;
            if (caps.torch) setHasTorch(true);
          }
        }
      } catch (err: any) {
        console.error("Scanner error:", err);
        if (isMountedRef.current) {
          setError(err.name === 'NotAllowedError' ? "Camera access denied." : "Could not start camera.");
        }
      }
    };

    startScanning();

    return () => {
      isMountedRef.current = false;
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [handleBarcodeFound]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-stretch">
      {/* Video Container */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className="w-full h-full object-cover" 
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Framing Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
          <div className="w-full max-w-sm aspect-square relative transition-transform duration-700 ease-out">
            {/* Corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-[6px] border-l-[6px] border-blue-500 rounded-tl-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-[6px] border-r-[6px] border-blue-500 rounded-tr-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[6px] border-l-[6px] border-blue-500 rounded-bl-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[6px] border-r-[6px] border-blue-500 rounded-br-3xl shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            
            {/* Laser Line */}
            {isCameraReady && !isAiAnalyzing && !hasScannedRef.current && (
              <div className="absolute left-1 right-1 h-[3px] bg-red-500/90 shadow-[0_0_15px_rgba(239,68,68,1)] animate-[scanning_2s_infinite_ease-in-out]"></div>
            )}
            
            {/* Guide Text */}
            <p className="absolute -bottom-14 left-0 right-0 text-center text-white/90 font-black text-xs uppercase tracking-[0.2em] drop-shadow-lg">
              {isAiAnalyzing ? 'Analyzing Image...' : 'Center Code in Box'}
            </p>
          </div>
        </div>

        {/* Header Buttons */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center pointer-events-none">
          <button 
            onClick={onClose} 
            className="p-4 bg-black/40 backdrop-blur-xl rounded-full text-white border border-white/20 active:scale-90 transition-all pointer-events-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {hasTorch && (
             <button 
                onClick={toggleTorch} 
                className={`p-4 rounded-full backdrop-blur-xl border transition-all active:scale-90 pointer-events-auto ${torchOn ? 'bg-yellow-400 border-yellow-500 text-black shadow-lg shadow-yellow-500/30' : 'bg-black/40 border-white/20 text-white'}`}
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 2 5 7H9l5 7"/></svg>
             </button>
          )}
        </div>

        {/* Bottom Status & Manual Trigger */}
        <div className="absolute bottom-12 left-8 right-8 flex flex-col gap-6">
          <div className="text-center">
            <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md border ${error ? 'bg-red-500/20 border-red-500/40 text-red-200' : 'bg-white/10 border-white/20 text-white/80'}`}>
              {error || statusMessage}
            </span>
          </div>

          <button 
            onClick={handleManualCapture} 
            disabled={isAiAnalyzing || !isCameraReady}
            className="h-16 bg-white text-slate-900 rounded-[2rem] font-black text-lg shadow-2xl active:scale-[0.97] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-3"
          >
            {isAiAnalyzing ? (
              <div className="w-6 h-6 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                AI CLOUD SCAN
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanning {
          0% { top: 10%; opacity: 0; }
          15% { opacity: 1; }
          50% { top: 90%; }
          85% { opacity: 1; }
          100% { top: 10%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
