"use client";

import Link from "next/link";
import { format } from "date-fns";

export function TradeList({ trades, currentUserId, networkUsers }: { trades: any[], currentUserId?: string, networkUsers?: Record<string, any> }) {
  if (trades.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg mt-4">
        No trades logged yet. <Link href="/dashboard/trades/new" className="text-primary hover:underline">Log your first one →</Link>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {trades.slice(0, 5).map(trade => (
        <Link key={trade.id} href={`/dashboard/trades/${trade.id}`} className="no-underline block">
          <div className="flex items-center justify-between p-4 bg-card hover:bg-card/80 border border-border rounded-lg transition-colors group">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-muted-foreground w-20">
                {format(new Date(trade.created_at), "MMM d")}
              </span>
              <span className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                {trade.pair || "Unknown"}
                {currentUserId && trade.user_id !== currentUserId && networkUsers?.[trade.user_id] && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-normal">
                    {networkUsers[trade.user_id].display_name}
                  </span>
                )}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                trade.direction === 'long' ? 'bg-green-500/10 text-green-500' : 
                trade.direction === 'short' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
              }`}>
                {trade.direction?.toUpperCase() || "N/A"}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {trade.rr_achieved && (
                <span className="font-mono text-sm text-muted-foreground">
                  {Number(trade.rr_achieved).toFixed(2)}R
                </span>
              )}
              <span className={`font-bold uppercase tracking-wider text-sm ${
                trade.outcome === 'win' ? 'text-green-500' :
                trade.outcome === 'loss' ? 'text-red-500' :
                trade.outcome === 'breakeven' ? 'text-yellow-500' : 'text-blue-500'
              }`}>
                {trade.outcome}
              </span>
            </div>
          </div>
        </Link>
      ))}
      {trades.length > 5 && (
        <div className="text-center mt-4">
          <Link href="/dashboard/trades" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            View all {trades.length} trades →
          </Link>
        </div>
      )}
    </div>
  );
}
