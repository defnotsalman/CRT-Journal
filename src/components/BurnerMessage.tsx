"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export function BurnerMessage({ msg, isMe }: { msg: any, isMe: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [burned, setBurned] = useState(false);

  useEffect(() => {
    if (revealed && !burned && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (revealed && timeLeft === 0 && !burned) {
      setBurned(true);
      // Delete from DB if I'm the receiver (prevent double deletion conflicts, though it's fine)
      if (!isMe) {
        supabase.from("private_messages").delete().eq("id", msg.id).then();
      }
    }
  }, [revealed, timeLeft, burned, isMe, msg.id]);

  if (burned) {
    return (
      <div className={`p-3 rounded-md transition-all bg-red-950/20 border border-red-500/20 text-red-500/50 italic text-xs`}>
        [Message incinerated]
      </div>
    );
  }

  if (!isMe && !revealed) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-500 animate-pulse"
        onClick={() => setRevealed(true)}
      >
        <Flame className="w-4 h-4 mr-2" />
        Reveal Burner
      </Button>
    );
  }

  return (
    <div className={`relative p-3 rounded-md transition-all ${isMe ? 'bg-red-500 text-white border border-red-400' : 'bg-zinc-900 border border-red-500/50 text-red-200'}`}>
      {msg.content}
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(220,38,38,1)] text-white border-2 border-black">
        {timeLeft}
      </div>
      {/* CSS fire animation overlay */}
      <div className="absolute inset-0 pointer-events-none rounded-md overflow-hidden opacity-30 mix-blend-screen">
        <div className="absolute bottom-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-[pulse_0.5s_infinite]" />
      </div>
    </div>
  );
}
