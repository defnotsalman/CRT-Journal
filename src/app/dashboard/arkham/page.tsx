"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { RankBadge } from "@/components/RankBadge";

export default function ArkhamAsylumPage() {
  const { session } = useAuth();
  const [inmates, setInmates] = useState<any[]>([]);
  const [networkUsers, setNetworkUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    
    async function loadData() {
      // 1. Network Users Map
      const { data: friends } = await supabase
        .from("friendships")
        .select(`
          requester:profiles!friendships_requester_id_fkey ( id, display_name, rank ),
          receiver:profiles!friendships_receiver_id_fkey ( id, display_name, rank )
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
      
      // Add self to map
      const { data: myProf } = await supabase.from("profiles").select("id, display_name, rank").eq("id", session!.user.id).single();
      if (myProf) netMap[myProf.id] = myProf;
      
      setNetworkUsers(netMap);

      // 2. Fetch worst trades
      const { data: trs } = await supabase.from("trades").select("*").in("outcome", ["loss"]).order("rr_achieved", { ascending: true }).limit(50);
      
      if (trs) {
        // Filter out strangers
        const terribleTrades = trs.filter(t => netMap[t.user_id] && (t.rr_achieved <= -1 || t.outcome === 'loss'));
        setInmates(terribleTrades);
      }
      setLoading(false);
    }
    loadData();
  }, [session]);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo(".fade-up", { opacity: 0, scale: 0.9, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "back.out(1.7)" });
    }
  }, [loading]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-mono tracking-widest">Accessing Arkham Records...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="fade-up text-center space-y-4 py-12 border-b border-red-500/20 bg-red-500/5 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 mix-blend-overlay"></div>
        <div className="text-xs font-mono text-red-500 uppercase tracking-[0.3em] font-bold">Maximum Security</div>
        <h1 className="text-6xl font-black tracking-tighter text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">ARKHAM ASYLUM</h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          The wall of shame. These are the worst trades executed by you and your network. Over-leveraged, rule-breaking, undisciplined disasters.
        </p>
      </div>

      {inmates.length === 0 ? (
        <div className="text-center text-muted-foreground py-20 fade-up">
          <p className="text-xl">Arkham is currently empty.</p>
          <p className="text-sm mt-2">Your network is trading with extreme discipline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inmates.map((trade, i) => {
            const user = networkUsers[trade.user_id];
            return (
              <Card key={trade.id} className="fade-up border-red-500/30 bg-black overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-mono text-xs text-red-400 mb-1">INMATE #{i + 1}</div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {user?.display_name || "Unknown"}
                      </div>
                      {user?.rank && <RankBadge rankTitle={user.rank} className="mt-1" />}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-2xl text-red-500">{Number(trade.rr_achieved || 0).toFixed(2)}R</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{trade.pair}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm border-t border-red-500/20 pt-4 mt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Direction:</span>
                      <span className="font-bold text-red-400 uppercase">{trade.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry:</span>
                      <span className="font-mono">{trade.entry || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Committed:</span>
                      <span className="text-xs">{format(new Date(trade.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="mt-4 pt-4 border-t border-red-500/20">
                      <div className="text-[10px] uppercase text-red-500/70 mb-1 font-bold">Confession / Notes</div>
                      <p className="text-xs text-muted-foreground italic line-clamp-3">"{trade.notes}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
