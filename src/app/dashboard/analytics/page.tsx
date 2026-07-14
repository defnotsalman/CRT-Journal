"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

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

export default function AnalyticsPage() {
  const { session } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const { data } = await supabase.from("trades")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: true });
      if (data) setTrades(data);
      setLoading(false);
    }
    load();
  }, [session]);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 });
    }
  }, [loading]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Booting Batcomputer Analytics...</div>;

  // Process data for Equity Curve
  let cumulativeR = 0;
  const equityData = trades.filter(t => t.outcome !== 'open').map(t => {
    cumulativeR += Number(t.rr_achieved) || 0;
    return cumulativeR;
  });
  
  const labels = trades.filter(t => t.outcome !== 'open').map((_, i) => `T${i + 1}`);

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Cumulative RR',
        data: equityData,
        borderColor: 'rgb(234, 179, 8)', // Bat Yellow
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(234, 179, 8)',
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } }
    }
  };

  // Process data for Win/Loss Ratio
  const wins = trades.filter(t => t.outcome === 'win').length;
  const losses = trades.filter(t => t.outcome === 'loss').length;
  const breakEvens = trades.filter(t => t.outcome === 'break_even').length;

  const doughnutData = {
    labels: ['Wins', 'Losses', 'Break Even'],
    datasets: [
      {
        data: [wins, losses, breakEvens],
        backgroundColor: [
          'rgba(234, 179, 8, 0.8)', // Yellow for Win
          'rgba(220, 38, 38, 0.8)', // Red for Loss
          'rgba(156, 163, 175, 0.8)', // Gray for BE
        ],
        borderColor: 'rgba(0,0,0,0)',
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="fade-up">
        <div className="text-xs font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
           Batcomputer Analytics
        </div>
        <h1 className="text-4xl font-black tracking-tight">Performance Matrix</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 fade-up border-border bg-card">
          <CardHeader>
            <CardTitle>Equity Curve (RR)</CardTitle>
          </CardHeader>
          <CardContent>
            {trades.length > 0 ? (
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
            <CardTitle>Win Rate Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {trades.length > 0 ? (
               <div className="w-full max-w-[250px]">
                 <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
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
