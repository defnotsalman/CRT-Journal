"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { TradeList } from "@/components/TradeList";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function AllTradesPage() {
  const { session } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const { data } = await supabase.from("trades").select("*").eq("user_id", session!.user.id).order("created_at", { ascending: false });
      if (data) setTrades(data);
      setLoading(false);
    }
    load();
  }, [session]);

  useGSAP(() => {
    if (!loading) gsap.fromTo(".fade-up", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
  }, [loading]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading trades...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8 fade-up">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">History</div>
      <h1 className="text-4xl font-black tracking-tight mb-8">All Trades</h1>
      
      <TradeList trades={trades} />
    </div>
  );
}
