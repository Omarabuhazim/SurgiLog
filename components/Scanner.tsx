
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
  
  // UI State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing Camera...");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  // Logic Refs
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<any>(null);
  const scanIntervalRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  // Keep onScanRef up to date
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const stopScanner = useCallback(() => {
    // 1. Clear Native Interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // 2. Reset ZXing
    if (zxingReaderRef.current) {
        try { zxingReaderRef.current.reset(); } catch(e) { console.warn(e); }
        zxingReaderRef.current = null;
    }

    // 3. Stop Video Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, []);

  const triggerFeedback = useCallback(() => {
    if (haptics && 'vibrate' in navigator) {
      navigator.vibrate([70, 40, 70]);
    }
    if (sound) {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          if (audioCtx.state === 'suspended') audioCtx.resume();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1450, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.15);
          setTimeout(() => audioCtx.close(), 300);
        }
      } catch (e) {}
    }
  }, [haptics, sound]);

  const handleBarcodeFound = useCallback((rawValue: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    
    triggerFeedback();
    setStatusMessage("Code Detected!");
    stopScanner();
    onScanRef.current(rawValue);
  }, [stopScanner, triggerFeedback]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const capabilities = (track.getCapabilities?.() || {}) as any;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {}
  };

  // --- MANUAL AI FALLBACK ---
  const handleManualCapture = async () => {
    if (isAiAnalyzing || !videoRef.current || !canvasRef.current) return;
    
    setIsAiAnalyzing(true);
    setStatusMessage("AI Analyzing...");
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      
      try {
        const id = await scanPatientId(base64);
        if (id && isMountedRef.current) {
           handleBarcodeFound(id);
        } else {
           setStatusMessage("No ID text found.");
           setIsAiAnalyzing(false);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setIsAiAnalyzing(false);
          setStatusMessage("AI Scan Failed.");
        }
      }
    } else {
        setIsAiAnalyzing(false);
    }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    isMountedRef.current = true;
    hasScannedRef.current = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
             // @ts-ignore
            advanced: [{ focusMode: 'continuous' }, { whiteBalanceMode: 'continuous' }]
          } 
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Check Torch Support
          const track = stream.getVideoTracks()[0];
          const caps = (track.getCapabilities?.() || {}) as any;
          if (caps.torch) setHasTorch(true);
        }

        // --- HYBRID SCANNING STRATEGY ---
        
        // 1. Try Native BarcodeDetector (Fastest, supported on Android/Chrome)
        if ('BarcodeDetector' in window) {
           try {
             // @ts-ignore
             const formats = await window.BarcodeDetector.getSupportedFormats();
             // @ts-ignore
             const detector = new window.BarcodeDetector({ formats });
             
             setStatusMessage("Scanning...");
             
             scanIntervalRef.current = setInterval(async () => {
               if (!videoRef.current || hasScannedRef.current) return;
               try {
                 const barcodes = await detector.detect(videoRef.current);
                 if (barcodes.length > 0) {
                   handleBarcodeFound(barcodes[0].rawValue);
                 }
               } catch (e) { }
             }, 200);
             
             // If we successfully set up native, we don't need ZXing
             return;
           } catch (e) {
             console.warn("Native scanner failed, trying fallback...", e);
           }
        }

        // 2. Fallback: ZXing (Robust, works on iOS/Safari)
        if ((window as any).ZXing) {
            setStatusMessage("Scanning...");
            
            const hints = new (window as any).ZXing.DecodeHintType();
            const codeReader = new (window as any).ZXing.BrowserMultiFormatReader(hints);
            zxingReaderRef.current = codeReader;

            // Attach to the existing video element to scan frames
            codeReader.decodeFromVideoElement(videoRef.current, (result: any, err: any) => {
                if (result && !hasScannedRef.current) {
                    handleBarcodeFound(result.text);
                }
            });
        } else {
            setStatusMessage("Manual Capture Only");
            setError("Auto-scan unavailable.");
        }

      } catch (err) {
        if (isMountedRef.current) setError("Camera access denied.");
      }
    };

    startCamera();

    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [handleBarcodeFound, stopScanner]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Close Button */}
        <div className="absolute top-6 left-6 z-10">
          <button onClick={() => { stopScanner(); onClose(); }} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Torch Button */}
        {hasTorch && (
          <div className="absolute top-6 right-6 z-10">
             <button onClick={toggleTorch} className={`p-3 rounded-full backdrop-blur-md border transition-all active:scale-90 ${torchOn ? 'bg-yellow-400 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-black/40 border-white/20 text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </button>
          </div>
        )}

        {/* Scan Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-10">
          <div className={`w-full max-w-sm aspect-square relative transition-all duration-500 ${isAiAnalyzing ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}>
            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
            
            <div className="absolute left-4 right-4 h-0.5 bg-red-500/80 top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            <p className="absolute -bottom-8 left-0 right-0 text-center text-white/80 text-xs font-bold uppercase tracking-widest animate-pulse">
               Align Code Here
            </p>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-12 left-0 right-0 px-10 text-center">
          <div className="mb-8">
            <p className="text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase tracking-tight">{error || statusMessage}</p>
          </div>
          
          <button 
            onClick={handleManualCapture} 
            disabled={isAiAnalyzing} 
            className="w-full h-16 bg-white text-black rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-2xl disabled:bg-white/40 disabled:text-black/40 flex items-center justify-center gap-3"
          >
            {isAiAnalyzing ? (
              <>
                <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin"></div>
                ANALYZING...
              </>
            ) : (
              'MANUAL CAPTURE / OCR'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
