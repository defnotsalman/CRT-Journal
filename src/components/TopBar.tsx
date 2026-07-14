"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { supabase } from "@/lib/supabase";
import { LogOut, Plus, Users, Trophy } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function TopBar() {
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      <Link href="/dashboard" className="flex flex-col no-underline">
        <div className="text-xl font-bold font-sans tracking-tight text-primary">CRT Journal</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Trade log & checklist</div>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/dashboard/network">
          <Button variant="ghost" size="sm">
            <Users className="w-4 h-4 mr-2" />
            Friends
          </Button>
        </Link>
        <Link href="/dashboard/leaderboard">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </Button>
        </Link>
        <Link href="/dashboard/trades/new">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Trade
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
