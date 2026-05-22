import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import Webcam from 'react-webcam';
import { X, Camera, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, isOpen }) => {
  const webcamRef = useRef<Webcam>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const codeReader = new BrowserMultiFormatReader();
    let isScanning = true;

    const checkTorch = async () => {
      if (!webcamRef.current) return;
      const videoElement = webcamRef.current.video;
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }
    };

    const scan = async () => {
      if (!webcamRef.current || !isScanning) return;

      const videoElement = webcamRef.current.video;
      if (videoElement && videoElement.readyState === 4) {
        if (!hasTorch) await checkTorch();
        
        try {
          const result = await codeReader.decodeFromVideoElement(videoElement);
          if (result && isScanning) {
            onScan(result.getText());
            isScanning = false;
            setTimeout(() => {
              isScanning = true;
            }, 2000);
          }
        } catch (err) {
          // Ignore scanning errors
        }
      }

      if (isScanning) {
        requestAnimationFrame(scan);
      }
    };

    const timeoutId = setTimeout(scan, 1000);

    return () => {
      isScanning = false;
      clearTimeout(timeoutId);
      codeReader.reset();
    };
  }, [isOpen, onScan, hasTorch]);

  const toggleTorch = async () => {
    if (!webcamRef.current) return;
    const videoElement = webcamRef.current.video;
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn } as any]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.error("Erro ao alternar lanterna:", err);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-black border-none rounded-[2rem]">
        <DialogHeader className="p-6 bg-white/10 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
          <DialogTitle className="text-white flex items-center gap-2 uppercase font-black tracking-tight">
            <Camera className="w-5 h-5" /> Escanear Produto
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            className="w-full h-full object-cover"
            onUserMediaError={() => setError("Não foi possível acessar a câmera")}
          />
          
          {/* Scanner Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary/50 rounded-3xl relative">
              <div className="absolute inset-0 border-2 border-primary rounded-3xl animate-pulse" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan-line" />
            </div>
          </div>

          {hasTorch && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute bottom-6 right-6 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full w-12 h-12 text-white border border-white/30"
              onClick={toggleTorch}
            >
              {torchOn ? <ZapOff className="w-6 h-6 fill-yellow-400 text-yellow-400" /> : <Zap className="w-6 h-6" />}
            </Button>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8 text-center text-white">
              <p className="font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white">
          <Button 
            variant="outline" 
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest border-2" 
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
