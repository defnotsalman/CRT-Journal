"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X } from "lucide-react";
import gsap from "gsap";

export function ImageDropzone({ file, onFileChange }: { file: File | null, onFileChange: (f: File | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            onFileChange(blob);
            if (dropzoneRef.current) {
              gsap.fromTo(dropzoneRef.current, { scale: 1.05 }, { scale: 1, duration: 0.3, ease: "back.out" });
            }
          }
        }
      }
    };
    
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [onFileChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        onFileChange(droppedFile);
        if (dropzoneRef.current) {
          gsap.fromTo(dropzoneRef.current, { scale: 1.05 }, { scale: 1, duration: 0.3, ease: "back.out" });
        }
      }
    }
  };

  return (
    <div 
      ref={dropzoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${isDragging ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-border bg-card/50 hover:bg-card hover:border-primary/50'}`}
    >
      <input 
        type="file" 
        accept="image/*" 
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
          }
        }} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        title="Click, Drop, or Paste an image"
      />
      
      {file ? (
        <div className="flex flex-col items-center gap-3 z-10 pointer-events-none">
          <div className="w-16 h-16 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] relative">
            <ImageIcon className="w-8 h-8" />
            <div 
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 cursor-pointer pointer-events-auto hover:scale-110 transition-transform" 
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                onFileChange(null); 
              }}
            >
              <X className="w-3 h-3" />
            </div>
          </div>
          <div className="text-sm font-bold text-foreground text-center truncate max-w-[200px]">
            {file.name}
          </div>
          <div className="text-xs text-muted-foreground">
            Ready for upload
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 z-10 pointer-events-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-300 ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-foreground">
            Drag & Drop or Click to browse
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            Or press <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">Ctrl</kbd> + <kbd className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">V</kbd> to paste
          </div>
        </div>
      )}
    </div>
  );
}
