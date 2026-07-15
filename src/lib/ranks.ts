export function calculateRank(trades: any[]) {
  if (!trades || trades.length === 0) return { title: "Street Thug", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground" };
  
  const wins = trades.filter(t => t.outcome === 'win').length;
  const closed = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss').length;
  const winRate = closed > 0 ? (wins / closed) * 100 : 0;
  
  const totalRR = trades.reduce((acc, t) => acc + (Number(t.rr_achieved) || 0), 0);

  if (winRate >= 60 && totalRR >= 50) return { title: "Dark Knight", color: "text-purple-500", bg: "bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.5)]" };
  if (winRate >= 50 && totalRR >= 20) return { title: "Detective", color: "text-blue-500", bg: "bg-blue-500/10 text-blue-500 border border-blue-500/20" };
  if (winRate >= 40 && totalRR >= 5) return { title: "Vigilante", color: "text-green-500", bg: "bg-green-500/10 text-green-500 border border-green-500/20" };
  
  return { title: "Street Thug", color: "text-muted-foreground", bg: "bg-muted text-muted-foreground border border-border" };
}
