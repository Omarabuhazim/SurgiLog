
import { useRef, useState, useCallback, useEffect } from 'react';
import { scanPatientId } from '../services/geminiService';

interface ScannerProps {
  onScan: (id: string) => void;
  onClose: () => void;
  haptics: boolean;
  sound: boolean;
}

// Check for Native Barcode Detection API
const HAS_NATIVE_SCANNER = 'BarcodeDetector' in window;

const Scanner = ({ onScan, onClose, haptics, sound }: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(HAS_NATIVE_SCANNER ? "Scanning for Barcodes..." : "Camera Active");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const isMountedRef = useRef(true);
  const nativeDetectorRef = useRef<any>(null);

  useEffect(() => {
    if (HAS_NATIVE_SCANNER) {
      try {
        // Expanded format support for more hospital wristband types
        // @ts-ignore
        nativeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            'code_128', 'code_39', 'code_93', 
            'codabar', 'ean_13', 'ean_8', 
            'upc_a', 'upc_e', 'data_matrix', 'itf', 'qr_code'
          ] 
        });
      } catch (e) {
        console.warn("BarcodeDetector initialization failed.");
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
          width: { ideal: 1920 }, // High res for barcode clarity
          height: { ideal: 1080 },
          // @ts-ignore
          advanced: [{ focusMode: 'continuous' }, { whiteBalanceMode: 'continuous' }]
        } 
      });
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = stream;
        // setStatusMessage set in initial state or updated here
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

    // PATH 1: LOCAL NATIVE SCANNING (Automatic & Manual)
    // Runs constantly in background if supported, or once if manual click
    if (nativeDetectorRef.current) {
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
        // Native scan failed, continue to AI if manual
      }
    }

    // Stop here if it's an automatic loop tick. 
    // We DO NOT use AI for automatic scanning to save cost/performance.
    if (!manual) return;

    // PATH 2: GEMINI AI FALLBACK (Manual Trigger Only)
    // Used for OCR (Text) or if native barcode detector fails/missing
    setIsCapturing(true);
    setStatusMessage("AI Analyzing...");
    
    const canvas = canvasRef.current;
    if (!canvas) return;
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
          triggerFeedback();
          setStatusMessage("ID Verified!");
          stopCamera();
          setTimeout(() => onScan(id), 600);
        } else {
          setStatusMessage("No ID found. Try closer.");
          setIsCapturing(false);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setIsCapturing(false);
          if (err?.message?.includes('429')) {
             setStatusMessage("Quota Limit. Try again later.");
          } else {
             setStatusMessage("Scan failed. Try again.");
          }
        }
      }
    } else {
      setIsCapturing(false);
    }
  }, [isCapturing, onScan, stopCamera, triggerFeedback]);

  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    // Only run the automatic loop if we have a native detector.
    // If we don't have native support, we wait for user to click "Capture".
    if (!nativeDetectorRef.current || isCapturing || !isMountedRef.current) return;
    
    const timer = setInterval(() => captureAndScan(false), 200);
    return () => clearInterval(timer);
  }, [isCapturing, captureAndScan]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
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
          <div className={`w-full max-w-sm aspect-square relative transition-all duration-500 ${isCapturing ? 'scale-90' : 'scale-100'}`}>
            <div className={`absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 rounded-tl-2xl transition-colors duration-500 ${isCapturing ? 'border-yellow-400' : 'border-blue-500'}`}></div>
            <div className={`absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 rounded-tr-2xl transition-colors duration-500 ${isCapturing ? 'border-yellow-400' : 'border-blue-500'}`}></div>
            <div className={`absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 rounded-bl-2xl transition-colors duration-500 ${isCapturing ? 'border-yellow-400' : 'border-blue-500'}`}></div>
            <div className={`absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 rounded-br-2xl transition-colors duration-500 ${isCapturing ? 'border-yellow-400' : 'border-blue-500'}`}></div>
            
            <div className={`absolute left-4 right-4 h-1 transition-all duration-500 ${isCapturing ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]'} top-1/2 -translate-y-1/2 animate-[pulse_1.5s_infinite]`}></div>
          </div>
        </div>

        <div className="absolute bottom-12 left-0 right-0 px-10 text-center">
          <div className="mb-8">
            <p className="text-white font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase tracking-tight">{error || statusMessage}</p>
            {!HAS_NATIVE_SCANNER && !isCapturing && !error && (
               <p className="text-slate-300 text-xs font-medium mt-2">
                 Automatic scanning unavailable on this device.<br/>Tap button to scan.
               </p>
            )}
          </div>
          
          <button 
            onClick={() => captureAndScan(true)} 
            disabled={isCapturing} 
            className="w-full h-16 bg-white text-black rounded-[2rem] font-black text-lg active:scale-95 transition-all shadow-2xl disabled:bg-white/40 disabled:text-black/40 flex items-center justify-center gap-3"
          >
            {isCapturing ? (
              <>
                <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin"></div>
                ANALYZING...
              </>
            ) : (
              'CAPTURE TEXT / FALLBACK'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
