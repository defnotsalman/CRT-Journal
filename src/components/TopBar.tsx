"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { supabase } from "@/lib/supabase";
import { LogOut, Plus, Users, Trophy, Home, BarChart2, BookOpen, User, MessageSquare } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function TopBar() {
  const { session } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md mb-8">
      <Link href="/dashboard" className="flex flex-col no-underline group hover:scale-105 transition-transform duration-300">
        <div className="text-2xl font-bold font-sans tracking-tight text-primary group-hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_rgba(246,224,94,0.3)]">GOTHAM JOURNALS</div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-sans font-semibold">Wayne Enterprises Tech</div>
      </Link>
      
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={`bubble-nav-item ${pathname === '/dashboard' ? 'bubble-nav-active' : ''}`}>
          <Home className="w-4 h-4 mr-2" />
          Home
        </Link>
        <Link href="/dashboard/network" className={`bubble-nav-item ${pathname === '/dashboard/network' ? 'bubble-nav-active' : ''}`}>
          <Users className="w-4 h-4 mr-2" />
          Network
        </Link>
        <Link href="/dashboard/leaderboard" className={`bubble-nav-item ${pathname === '/dashboard/leaderboard' ? 'bubble-nav-active' : ''}`}>
          <Trophy className="w-4 h-4 mr-2" />
          Leaderboard
        </Link>
        <Link href="/dashboard/analytics" className={`bubble-nav-item ${pathname === '/dashboard/analytics' ? 'bubble-nav-active' : ''}`}>
          <BarChart2 className="w-4 h-4 mr-2" />
          Analytics
        </Link>
        <Link href="/dashboard/playbooks" className={`bubble-nav-item ${pathname === '/dashboard/playbooks' ? 'bubble-nav-active' : ''}`}>
          <BookOpen className="w-4 h-4 mr-2" />
          Playbooks
        </Link>
        <Link href="/dashboard/whisper" className={`bubble-nav-item ${pathname === '/dashboard/whisper' ? 'bubble-nav-active' : ''}`}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Whisper
        </Link>
        <Link href="/dashboard/trades/new" className={`bubble-nav-item ${pathname === '/dashboard/trades/new' ? 'bubble-nav-active' : ''}`}>
          <Plus className="w-4 h-4 mr-2" />
          New Trade
        </Link>
        <Link href="/dashboard/profile" className={`bubble-nav-item ${pathname === '/dashboard/profile' ? 'bubble-nav-active' : ''}`}>
          <User className="w-4 h-4" />
        </Link>
        <button onClick={handleSignOut} className="bubble-nav-item !bg-destructive/10 hover:!bg-destructive/20 hover:!border-destructive/50 text-destructive hover:!text-destructive">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
