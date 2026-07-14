"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function LeaderboardPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [networkUsers, setNetworkUsers] = useState<any[]>([]);
  const [myTrades, setMyTrades] = useState<any[]>([]);

  useEffect(() => {
    if (!session) return;

    async function loadData() {
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", session!.user.id).single();
      const users: Record<string, any> = { [myProfile.id]: { profile: myProfile, trades: [] } };

      const { data: friends } = await supabase
        .from("friendships")
        .select(`
          requester:profiles!friendships_requester_id_fkey ( id, display_name ),
          receiver:profiles!friendships_receiver_id_fkey ( id, display_name )
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${session!.user.id},receiver_id.eq.${session!.user.id}`);
      
      if (friends) {
        friends.forEach((f: any) => {
          const friend = f.requester.id === session!.user.id ? f.receiver : f.requester;
          users[friend.id] = { profile: friend, trades: [] };
        });
      }

      const { data: trades } = await supabase.from("trades").select("*").order("created_at", { ascending: false });
      
      if (trades) {
        trades.forEach(t => {
          if (users[t.user_id]) users[t.user_id].trades.push(t);
          if (t.user_id === session!.user.id) setMyTrades(prev => [...prev, t]);
        });
      }

      const stats = Object.values(users).map((u: any) => {
        const closed = u.trades.filter((t:any) => t.outcome === "win" || t.outcome === "loss");
        const wins = closed.filter((t:any) => t.outcome === "win").length;
        const wr = closed.length > 0 ? wins / closed.length : 0;
        
        const rrs = closed.filter((t:any) => t.rr_achieved != null);
        const avgRr = rrs.length > 0 ? rrs.reduce((acc:number, t:any) => acc + Number(t.rr_achieved), 0) / rrs.length : 0;
        
        return { profile: u.profile, winRate: wr, avgRR: avgRr, count: closed.length };
      }).filter(u => u.count >= 3);

      setNetworkUsers(stats);
      setLoading(false);
    }
    loadData();
  }, [session]);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
    }
  }, [loading]);

  if (loading) return <div className="p-12 text-center text-primary animate-pulse">Loading analytics...</div>;

  const wrSorted = [...networkUsers].sort((a,b) => b.winRate - a.winRate);
  const rrSorted = [...networkUsers].sort((a,b) => b.avgRR - a.avgRR);

  const myClosed = myTrades.filter(t => t.outcome === "win" || t.outcome === "loss");
  const myWins = myClosed.filter(t => t.outcome === "win").length;
  const myLosses = myClosed.length - myWins;

  const pairStats = myClosed.reduce((acc, t) => {
    const p = (t.pair || "Unknown").toUpperCase();
    if (!acc[p]) acc[p] = { wins: 0, total: 0 };
    acc[p].total++;
    if (t.outcome === "win") acc[p].wins++;
    return acc;
  }, {} as Record<string, any>);
  
  const pairLabels = Object.keys(pairStats).sort((a,b) => pairStats[b].total - pairStats[a].total).slice(0,5);
  const pairData = pairLabels.map(p => (pairStats[p].wins / pairStats[p].total) * 100);

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-12">
      <div className="fade-up">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Network</div>
        <h1 className="text-4xl font-black tracking-tight">Leaderboard & Analytics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 fade-up">
        <div className="border border-border bg-card rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Top Win Rates</h2>
          {wrSorted.length === 0 ? <p className="text-muted-foreground">Minimum 3 trades required.</p> : (
            <div className="space-y-4">
              {wrSorted.map((u, i) => (
                <div key={u.profile.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex gap-4 items-center">
                    <span className="font-mono text-muted-foreground">#{i+1}</span>
                    <span className="font-bold">{u.profile.display_name}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-muted-foreground">{u.count} trades</span>
                    <span className="font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">{Math.round(u.winRate * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-border bg-card rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4">Highest Avg RR</h2>
          {rrSorted.length === 0 ? <p className="text-muted-foreground">Minimum 3 trades required.</p> : (
            <div className="space-y-4">
              {rrSorted.map((u, i) => (
                <div key={u.profile.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex gap-4 items-center">
                    <span className="font-mono text-muted-foreground">#{i+1}</span>
                    <span className="font-bold">{u.profile.display_name}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <span className="text-xs text-muted-foreground">{u.count} trades</span>
                    <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded">{u.avgRR.toFixed(2)}R</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fade-up border border-border bg-card rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-8">My Personal Analytics</h2>
        {myClosed.length === 0 ? <p className="text-muted-foreground">Log more trades to see analytics.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-mono text-sm uppercase text-muted-foreground mb-4 text-center">Win / Loss Ratio</h3>
              <div className="max-w-[250px] mx-auto">
                <Doughnut data={{
                  labels: ['Wins', 'Losses'],
                  datasets: [{ data: [myWins, myLosses], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0 }]
                }} options={{ plugins: { legend: { labels: { color: 'white' } } } }} />
              </div>
            </div>
            <div>
              <h3 className="font-mono text-sm uppercase text-muted-foreground mb-4 text-center">Win Rate by Pair (%)</h3>
              <Bar data={{
                labels: pairLabels,
                datasets: [{ label: 'Win Rate %', data: pairData, backgroundColor: '#8b5cf6', borderRadius: 4 }]
              }} options={{ plugins: { legend: { display: false } }, scales: { y: { max: 100 } } }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
