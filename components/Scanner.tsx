
import { useRef, useState, useCallback, useEffect } from 'react';
import { scanPatientId } from '../services/geminiService';

interface ScannerProps {
  onScan: (id: string) => void;
  onClose: () => void;
  haptics: boolean;
  sound: boolean;
}

// Check for Native Barcode Detection API (supported on Chrome for Android)
const HAS_NATIVE_SCANNER = 'BarcodeDetector' in window;

const Scanner = ({ onScan, onClose, haptics, sound }: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing Camera...");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isAutoScanDisabled, setIsAutoScanDisabled] = useState(false);
  const [scanInterval, setScanInterval] = useState(HAS_NATIVE_SCANNER ? 150 : 3500); 
  const isMountedRef = useRef(true);
  const nativeDetectorRef = useRef<any>(null);

  // Initialize Native Detector if available
  useEffect(() => {
    if (HAS_NATIVE_SCANNER) {
      try {
        // @ts-ignore - BarcodeDetector is a newer Web API
        nativeDetectorRef.current = new window.BarcodeDetector({
          formats: ['code_128', 'code_39'] 
        });
      } catch (e) {
        console.warn("BarcodeDetector initialization failed, falling back to Gemini.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
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
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
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

  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      }
    } catch (err) {}
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-ignore
          advanced: [{ focusMode: 'continuous' }]
        } 
      });
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = stream;
        setStatusMessage(HAS_NATIVE_SCANNER ? "Align Barcode" : "Align ID or Barcode");
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) setHasTorch(true);
      }
    } catch (err) {
      if (isMountedRef.current) setError("Camera access denied.");
    }
  };

  const captureAndScan = useCallback(async (manual: boolean = false) => {
    if (!videoRef.current || isCapturing || !isMountedRef.current) return;

    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // PATH 1: LOCAL NATIVE SCANNING (Zero API usage)
    if (nativeDetectorRef.current && !manual) {
      try {
        const barcodes = await nativeDetectorRef.current.detect(video);
        if (barcodes.length > 0 && isMountedRef.current) {
          const id = barcodes[0].rawValue;
          triggerFeedback();
          setStatusMessage("Barcode Detected!");
          stopCamera();
          onScan(id);
          return;
        }
      } catch (e) {
        console.error("Native scan error", e);
      }
    }

    // PATH 2: GEMINI AI FALLBACK
    if (manual || (!nativeDetectorRef.current && !isCapturing && !isAutoScanDisabled)) {
      setIsCapturing(true);
      setStatusMessage("AI Analyzing...");
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d', { alpha: false });
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        
        try {
          const id = await scanPatientId(base64);
          if (id && isMountedRef.current) {
            triggerFeedback();
            setStatusMessage("ID Verified!");
            stopCamera();
            setTimeout(() => onScan(id), 600);
          } else {
            setStatusMessage("No match found. Try again.");
            setIsCapturing(false);
          }
        } catch (err: any) {
          if (isMountedRef.current) {
            setIsCapturing(false);
            if (err?.message?.includes('429')) {
              setStatusMessage("Quota Reached. Auto-scan disabled.");
              setIsAutoScanDisabled(true); // Stop auto-polling Gemini
            } else {
              setStatusMessage("Scanning paused. Use manual button.");
            }
          }
        }
      } else {
        setIsCapturing(false);
      }
    }
  }, [isCapturing, onScan, stopCamera, triggerFeedback, isAutoScanDisabled]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (isCapturing || !isMountedRef.current || isAutoScanDisabled) return;
    const timer = setTimeout(() => captureAndScan(false), scanInterval);
    return () => clearTimeout(timer);
  }, [isCapturing, captureAndScan, scanInterval, isAutoScanDisabled]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute top-6 left-6 z-10">
          <button onClick={() => { stopCamera(); onClose(); }} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {hasTorch && (
          <div className="absolute top-6 right-6 z-10">
             <button onClick={toggleTorch} className={`p-3 rounded-full backdrop-blur-md border transition-all active:scale-90 ${torchOn ? 'bg-yellow-400 border-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-black/40 border-white/20 text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            </button>
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-10">
          <div className={`w-full max-w-sm ${HAS_NATIVE_SCANNER ? 'aspect-[3/1]' : 'aspect-square'} relative transition-all duration-500`}>
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
            <div className="absolute left-2 right-2 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] top-1/2 -translate-y-1/2 animate-[pulse_2s_infinite]"></div>
          </div>
        </div>

        <div className="absolute bottom-12 left-0 right-0 px-10 text-center">
          <div className="mb-8">
            <p className="text-white font-bold text-lg drop-shadow-lg">{error || statusMessage}</p>
            {isAutoScanDisabled && !error && (
              <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mt-2 bg-blue-900/40 py-1 px-3 rounded-full inline-block">
                Manual Mode Active
              </p>
            )}
          </div>
          
          <button 
            onClick={() => captureAndScan(true)} 
            disabled={isCapturing} 
            className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-2xl disabled:bg-white/50"
          >
            {isCapturing ? 'ANALYZING...' : 'CAPTURE PATIENT ID'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
