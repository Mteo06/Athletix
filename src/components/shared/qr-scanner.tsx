"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrScanner({
  onScan,
  active,
}: {
  onScan: (raw: string) => void;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch {
        setCameraError("Fotocamera non disponibile. Usa l'inserimento manuale qui sotto.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            const now = Date.now();
            const last = lastScanRef.current;
            if (!last || last.value !== code.data || now - last.time > 3000) {
              lastScanRef.current = { value: code.data, time: now };
              onScan(code.data);
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-black">
      {cameraError ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-400">
          <CameraOff className="h-8 w-8" />
          {cameraError}
        </div>
      ) : (
        <>
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/70" />
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-emerald-300">
            <Camera className="h-3 w-3" /> Inquadra il QR
          </div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export function ManualCodeFallback({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
        setValue("");
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Inserisci codice manualmente…"
        className="h-10 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      />
      <Button type="submit" variant="secondary">
        Verifica
      </Button>
    </form>
  );
}
