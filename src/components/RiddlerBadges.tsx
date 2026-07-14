"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export const BADGE_DEFINITIONS = [
  {
    id: "the_disciplined_bat",
    name: "The Disciplined Bat",
    description: "Take exactly 3 high-quality trades this week (RR > 2). No overtrading.",
    check: (trades: any[]) => {
      const thisWeek = trades.filter(t => new Date(t.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
      const highQuality = thisWeek.filter(t => t.rr_achieved > 2);
      return highQuality.length >= 3 && thisWeek.length <= 4; // allow 1 mistake
    }
  },
  {
    id: "the_dark_knight",
    name: "The Dark Knight",
    description: "Achieve a win rate of over 70% with at least 5 closed trades total.",
    check: (trades: any[]) => {
      const closed = trades.filter(t => t.outcome !== 'open');
      if (closed.length < 5) return false;
      const wins = closed.filter(t => t.outcome === 'win').length;
      return (wins / closed.length) > 0.7;
    }
  },
  {
    id: "the_gotham_sniper",
    name: "The Gotham Sniper",
    description: "Catch a massive move (RR Achieved > 5.0) in a single trade.",
    check: (trades: any[]) => {
      return trades.some(t => t.rr_achieved > 5);
    }
  }
];

export function RiddlerBadges({ trades, profile }: { trades: any[], profile: any }) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!profile || trades.length === 0) {
      setChecking(false);
      return;
    }

    const currentBadges = profile.badges || [];
    const currentUnlockedIds = currentBadges.map((b: any) => b.id);
    
    let newlyUnlocked = false;
    const newBadges = [...currentBadges];

    BADGE_DEFINITIONS.forEach(def => {
      if (!currentUnlockedIds.includes(def.id)) {
        // Check if they meet conditions
        if (def.check(trades)) {
          newlyUnlocked = true;
          newBadges.push({ id: def.id, name: def.name });
          toast.success(`🏆 ACHIEVEMENT UNLOCKED: ${def.name}!`);
        }
      }
    });

    if (newlyUnlocked) {
      supabase.from("profiles").update({ badges: newBadges }).eq("id", profile.id).then(() => {
        setUnlockedIds(newBadges.map(b => b.id));
        setChecking(false);
      });
    } else {
      setUnlockedIds(currentUnlockedIds);
      setChecking(false);
    }
  }, [trades, profile]);

  if (checking) return null;

  return (
    <Card className="fade-in-stagger border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Riddler Badges 
          <span className="text-xs font-normal text-muted-foreground ml-2">(Unlock by trading accurately)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BADGE_DEFINITIONS.map(badge => {
            const isUnlocked = unlockedIds.includes(badge.id);
            return (
              <div 
                key={badge.id} 
                className={`p-4 border rounded-xl flex flex-col transition-all ${
                  isUnlocked 
                  ? 'border-primary/50 bg-primary/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                  : 'border-border/50 bg-muted/20 opacity-60 grayscale'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>
                    {badge.name}
                  </h4>
                  {isUnlocked ? <Unlock className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground flex-grow">{badge.description}</p>
                {isUnlocked && <div className="mt-3 text-[10px] uppercase tracking-widest text-primary font-bold">Unlocked</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
