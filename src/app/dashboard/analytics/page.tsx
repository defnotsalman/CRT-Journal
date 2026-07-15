"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { format } from "date-fns";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const colors = [
  'rgb(234, 179, 8)', // Bat Yellow (Me)
  'rgb(6, 182, 212)', // Cyan
  'rgb(168, 85, 247)', // Purple
  'rgb(34, 197, 94)', // Green
  'rgb(239, 68, 68)', // Red
];

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    
    async function load() {
      // Fetch network users
      const { data: friends } = await supabase
        .from("friendships")
        .select(`
          requester:profiles!friendships_requester_id_fkey ( id, display_name ),
          receiver:profiles!friendships_receiver_id_fkey ( id, display_name )
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${session!.user.id},receiver_id.eq.${session!.user.id}`);
      
      const netMap: Record<string, any> = {};
      if (friends) {
        friends.forEach((f: any) => {
          const friend = f.requester.id === session!.user.id ? f.receiver : f.requester;
          netMap[friend.id] = friend;
        });
      }
      
      const { data: myProf } = await supabase.from("profiles").select("id, display_name").eq("id", session!.user.id).single();
      if (myProf) netMap[myProf.id] = myProf;
      
      setNetworkUsers(netMap);

      const userIds = Object.keys(netMap);

      const { data: trs } = await supabase.from("trades")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: true });
        
      if (trs) setTrades(trs);
      setLoading(false);
    }
    load();
  }, [session]);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
    }
  }, [loading]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-mono tracking-widest">Booting Batcomputer Analytics...</div>;

  const myTrades = trades.filter(t => t.user_id === session?.user.id);
  const closedTrades = trades.filter(t => t.outcome !== 'open');
  
  // Create unified timeline
  const labels = closedTrades.map(t => format(new Date(t.created_at), "MMM d"));
  
  const datasets = Object.keys(networkUsers).map((userId, index) => {
    let cumulativeR = 0;
    const isMe = userId === session?.user.id;
    const color = isMe ? colors[0] : colors[(index % (colors.length - 1)) + 1];
    
    // For each point in time (each closed trade), what is THIS user's cumulative RR?
    const data = closedTrades.map(globalTrade => {
      if (globalTrade.user_id === userId) {
        cumulativeR += Number(globalTrade.rr_achieved) || 0;
      }
      return cumulativeR;
    });

    return {
      label: networkUsers[userId].display_name || 'Unknown',
      data,
      borderColor: color,
      backgroundColor: isMe ? color.replace(')', ', 0.1)') : 'transparent',
      borderWidth: isMe ? 3 : 2,
      borderDash: isMe ? [] : [5, 5],
      tension: 0.4,
      fill: isMe,
      pointRadius: isMe ? 3 : 0,
      pointHoverRadius: 6,
    };
  });

  const lineChartData = { labels, datasets };

  const lineChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#e5e7eb', usePointStyle: true } },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
      x: { grid: { display: false }, ticks: { color: '#9ca3af', maxTicksLimit: 10 } }
    }
  };

  // Process data for Win/Loss Ratio (Only ME)
  const myClosedTrades = myTrades.filter(t => t.outcome !== 'open');
  const wins = myClosedTrades.filter(t => t.outcome === 'win').length;
  const losses = myClosedTrades.filter(t => t.outcome === 'loss').length;
  const breakEvens = myClosedTrades.filter(t => t.outcome === 'break_even').length;

  const doughnutData = {
    labels: ['Wins', 'Losses', 'Break Even'],
    datasets: [{
      data: [wins, losses, breakEvens],
      backgroundColor: ['rgba(234, 179, 8, 0.8)', 'rgba(220, 38, 38, 0.8)', 'rgba(156, 163, 175, 0.8)'],
      borderColor: 'rgba(0,0,0,0)',
      borderWidth: 0,
    }],
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
           Batcomputer Analytics
        </div>
        <h1 className="text-4xl font-black tracking-tight drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">Performance Matrix</h1>
        <p className="text-muted-foreground mt-2">Network-wide Equity Race.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 fade-up border-border bg-card shadow-2xl shadow-primary/5">
          <CardHeader>
            <CardTitle>Wayne Enterprises Network Equity (RR)</CardTitle>
          </CardHeader>
          <CardContent>
            {closedTrades.length > 0 ? (
              <Line data={lineChartData} options={lineChartOptions} />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                No closed trades yet to display.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="fade-up border-border bg-card">
          <CardHeader>
            <CardTitle>My Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {myClosedTrades.length > 0 ? (
               <div className="w-full max-w-[250px]">
                 <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#e5e7eb' } } } }} />
               </div>
            ) : (
              <div className="h-64 w-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
