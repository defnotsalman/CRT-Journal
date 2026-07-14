"use client";

import { Card, CardContent } from "@/components/ui/card";

export function DashboardStats({ trades, profile }: { trades: any[], profile: any }) {
  const closedTrades = trades.filter(t => t.outcome === "win" || t.outcome === "loss");
  const wins = closedTrades.filter(t => t.outcome === "win").length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) + "%" : "—";
  
  const rrTrades = closedTrades.filter(t => t.rr_achieved != null);
  let avgRR = "—";
  if (rrTrades.length > 0) {
    const totalRR = rrTrades.reduce((sum, t) => sum + Number(t.rr_achieved), 0);
    avgRR = (totalRR / rrTrades.length).toFixed(2) + "R";
  }

  // Calculate Streak
  let streak = 0;
  const now = new Date();
  const sortedTrades = [...trades].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // Basic streak logic ported from old code: consecutive days with a trade adhering to rules.
  // For simplicity here, we'll just show the user's active trades count if we can't fully rebuild the checklist logic,
  // or we can iterate to build a simple active streak. Let's do simple continuous wins for now,
  // or wait, the original logic checked 'did_follow_rules' in checklist.
  for (const t of sortedTrades) {
    const isRuleFollowed = t.checklist && t.checklist["did_follow_rules"];
    if (isRuleFollowed) {
      streak++;
    } else {
      break;
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm font-mono text-muted-foreground uppercase mb-1">Total trades</div>
          <div className="text-2xl font-bold">{trades.length > 0 ? trades.length : "—"}</div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm font-mono text-muted-foreground uppercase mb-1">Win rate</div>
          <div className="text-2xl font-bold text-primary">{winRate}</div>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm font-mono text-muted-foreground uppercase mb-1">Avg RR</div>
          <div className="text-2xl font-bold">{avgRR}</div>
        </CardContent>
      </Card>
      <Card className="bg-orange-500/10 border-orange-500/30 shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm font-mono text-orange-400 uppercase mb-1">Current Streak 🔥</div>
          <div className="text-2xl font-bold text-orange-400">{streak > 0 ? streak : "—"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
