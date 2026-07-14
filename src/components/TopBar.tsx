"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { supabase } from "@/lib/supabase";
import { LogOut, Plus, Users, Trophy, Home } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function TopBar() {
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <Link href="/dashboard" className="flex items-center gap-2 group no-underline">
        <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black font-bold font-heading text-xs">v1</div>
        <div className="text-sm font-mono tracking-widest text-white/80 group-hover:text-white transition-colors">Production ready code</div>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="font-mono text-xs rounded-full border border-transparent hover:border-white/20">
            <Home className="w-3 h-3 mr-2" />
            Home
          </Button>
        </Link>
        <Link href="/dashboard/network">
          <Button variant="ghost" size="sm" className="font-mono text-xs rounded-full border border-transparent hover:border-white/20">
            <Users className="w-3 h-3 mr-2" />
            Network
          </Button>
        </Link>
        <Link href="/dashboard/leaderboard">
          <Button variant="ghost" size="sm" className="font-mono text-xs rounded-full border border-transparent hover:border-white/20 text-white hover:text-white">
            <Trophy className="w-3 h-3 mr-2" />
            Rank
          </Button>
        </Link>
        <Link href="/dashboard/trades/new">
          <Button size="sm" className="font-mono text-xs rounded-full bg-white text-black hover:bg-white/90">
            <Plus className="w-3 h-3 mr-2" />
            Init Trade
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full">
          <LogOut className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
