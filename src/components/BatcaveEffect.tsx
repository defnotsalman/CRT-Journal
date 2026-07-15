"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";

export function BatcaveEffect() {
  const [active, setActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleToggle = (e: any) => {
      setActive(e.detail.active);
    };

    window.addEventListener("batcave-toggle", handleToggle);
    
    // Check local storage for initial state
    const saved = localStorage.getItem("batcave-mode");
    if (saved === "true") {
      setActive(true);
    }

    return () => window.removeEventListener("batcave-toggle", handleToggle);
  }, []);

  useEffect(() => {
    if (active) {
      document.documentElement.classList.add("batcave-active");
      if (audioRef.current) {
        audioRef.current.volume = 0.2;
        audioRef.current.play().catch(e => console.log("Audio play prevented", e));
      }
      
      // Init digital rain
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
        const charArray = chars.split("");
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops: number[] = [];
        
        for (let x = 0; x < columns; x++) {
          drops[x] = 1;
        }
        
        const draw = () => {
          if (!active) return;
          ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = "rgba(255, 215, 0, 0.3)"; // Bat yellow matrix
          ctx.font = fontSize + "px monospace";
          
          for (let i = 0; i < drops.length; i++) {
            const text = charArray[Math.floor(Math.random() * charArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
            drops[i]++;
          }
        };
        
        const interval = setInterval(draw, 33);
        
        const handleResize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", handleResize);
        
        return () => {
          clearInterval(interval);
          window.removeEventListener("resize", handleResize);
        };
      }
    } else {
      document.documentElement.classList.remove("batcave-active");
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [active]);

  if (!active) return null;

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-black/80 transition-opacity duration-1000" />
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-[-1] opacity-30 mix-blend-screen"
      />
      {/* 
        Placeholder Audio: You can add an src like "/rain.mp3" to your public folder 
        and uncomment the src attribute below to get ambient sounds!
      */}
      <audio 
        ref={audioRef} 
        loop 
        // src="/rain.mp3" 
      />
      
      {/* Global CSS injected for Batcave Mode */}
      <style jsx global>{`
        .batcave-active body {
          background-color: #050505 !important;
          color: #e5e7eb !important;
        }
        .batcave-active .bg-card {
          background-color: rgba(10, 10, 10, 0.8) !important;
          border-color: rgba(234, 179, 8, 0.2) !important;
        }
        .batcave-active .border-border {
          border-color: rgba(234, 179, 8, 0.1) !important;
        }
      `}</style>
    </>
  );
}
